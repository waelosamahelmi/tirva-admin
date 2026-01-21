import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, type User, type InsertUser } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await this.hashPassword(userData.password);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async authenticateUser(email: string, password: string): Promise<AuthUser | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user || !user.isActive) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, user.id));

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async getUserById(id: number): Promise<AuthUser | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, id));

    return user || null;
  }

  async initializeAdminUser(): Promise<void> {
    try {
      // Check if admin user already exists
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.email, "info@tirvankahvila.fi"));

      if (!existingAdmin) {
        await this.createUser({
          email: "info@tirvankahvila.fi",
          password: "antonio@2025",
          role: "admin",
          isActive: true,
        });
        console.log("Admin user created successfully");
      } else {
        console.log("Admin user already exists");
      }
    } catch (error: any) {
      // Handle duplicate key errors gracefully
      if (error.code === '23505') {
        console.log("Admin user already exists (caught duplicate key error)");
      } else {
        console.error("Error initializing admin user:", error);
        throw error;
      }
    }
  }
}

export const authService = new AuthService();