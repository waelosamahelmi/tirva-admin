import { 
  Category, MenuItem, Order, OrderItem, Topping, ToppingGroup, ToppingGroupItem, MenuItemToppingGroup, CategoryToppingGroup, RestaurantSettings, Printer,
  InsertCategory, InsertMenuItem, InsertOrder, InsertOrderItem, InsertTopping, InsertToppingGroup, InsertToppingGroupItem, InsertMenuItemToppingGroup, InsertCategoryToppingGroup, InsertRestaurantSettings, InsertPrinter,
  categories, menuItems, orders, orderItems, toppings, toppingGroups, toppingGroupItems, menuItemToppingGroups, categoryToppingGroups, restaurantSettings, printers
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]>;
  getMenuItemById(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  
  // Orders
  getOrders(): Promise<Order[]>;
  getOrderById(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  
  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  
  // Toppings
  getToppings(): Promise<Topping[]>;
  createTopping(topping: InsertTopping): Promise<Topping>;
  updateTopping(id: number, topping: Partial<InsertTopping>): Promise<Topping | undefined>;
  deleteTopping(id: number): Promise<boolean>;
  getToppingsByCategory(category: string): Promise<Topping[]>;
  
  // Topping Groups
  getToppingGroups(): Promise<ToppingGroup[]>;
  createToppingGroup(group: InsertToppingGroup): Promise<ToppingGroup>;
  updateToppingGroup(id: number, group: Partial<InsertToppingGroup>): Promise<ToppingGroup | undefined>;
  deleteToppingGroup(id: number): Promise<boolean>;
  
  // Topping Group Items
  getToppingGroupItems(groupId: number): Promise<ToppingGroupItem[]>;
  addToppingToGroup(groupId: number, toppingId: number): Promise<ToppingGroupItem>;
  removeToppingFromGroup(groupId: number, toppingId: number): Promise<boolean>;
  
  // Menu Item Topping Groups
  getMenuItemToppingGroups(menuItemId: number): Promise<ToppingGroup[]>;
  assignToppingGroupToMenuItem(menuItemId: number, groupId: number): Promise<MenuItemToppingGroup>;
  removeToppingGroupFromMenuItem(menuItemId: number, groupId: number): Promise<boolean>;
  
  // Category Topping Groups
  getCategoryToppingGroups(categoryId: number): Promise<ToppingGroup[]>;
  assignToppingGroupToCategory(categoryId: number, groupId: number): Promise<CategoryToppingGroup>;
  removeToppingGroupFromCategory(categoryId: number, groupId: number): Promise<boolean>;
  
  // Restaurant Settings
  getRestaurantSettings(): Promise<RestaurantSettings | undefined>;
  updateRestaurantSettings(settings: Partial<InsertRestaurantSettings>): Promise<RestaurantSettings>;
  
  // Printers
  getAllPrinters(): Promise<Printer[]>;
  getPrinter(id: string): Promise<Printer | undefined>;
  upsertPrinter(printer: InsertPrinter): Promise<Printer>;
  deletePrinter(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, Category> = new Map();
  private menuItems: Map<number, MenuItem> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private currentCategoryId = 1;
  private currentMenuItemId = 1;
  private currentOrderId = 1;
  private currentOrderItemId = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Categories
    const categories = [
      { name: "Pizzat", nameEn: "Pizzas", displayOrder: 1, isActive: true },
      { name: "Kebabit", nameEn: "Kebabs", displayOrder: 2, isActive: true },
      { name: "Kana", nameEn: "Chicken", displayOrder: 3, isActive: true },
      { name: "Hampurilaiset", nameEn: "Burgers", displayOrder: 4, isActive: true },
      { name: "Salaatit", nameEn: "Salads", displayOrder: 5, isActive: true },
    ];

    categories.forEach(cat => {
      const category: Category = { id: this.currentCategoryId++, ...cat };
      this.categories.set(category.id, category);
    });

    // Menu Items
    const items = [
      {
        categoryId: 1,
        name: "Margherita",
        nameEn: "Margherita",
        description: "Tomaattikastike, mozzarella, tuore basilika",
        descriptionEn: "Tomato sauce, mozzarella, fresh basil",
        price: "12.90",
        imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isVegetarian: true,
        displayOrder: 1,
        isAvailable: true,
      },
      {
        categoryId: 1,
        name: "Pepperoni",
        nameEn: "Pepperoni",
        description: "Tomaattikastike, mozzarella, pepperoni",
        descriptionEn: "Tomato sauce, mozzarella, pepperoni",
        price: "14.90",
        imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        displayOrder: 2,
        isAvailable: true,
      },
      {
        categoryId: 1,
        name: "Hawaii",
        nameEn: "Hawaiian",
        description: "Tomaattikastike, mozzarella, kinkku, ananas",
        descriptionEn: "Tomato sauce, mozzarella, ham, pineapple",
        price: "15.90",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        displayOrder: 3,
        isAvailable: true,
      },
      {
        categoryId: 2,
        name: "Kanakebab",
        nameEn: "Chicken Kebab",
        description: "Grillattu kana, salaatti, tomaatti, kastike",
        descriptionEn: "Grilled chicken, salad, tomato, sauce",
        price: "13.50",
        imageUrl: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        displayOrder: 1,
        isAvailable: true,
      },
      {
        categoryId: 2,
        name: "Lammaskebab",
        nameEn: "Lamb Kebab",
        description: "Marinoidut lampaan liha, pitaleipä, vihannekset",
        descriptionEn: "Marinated lamb, pita bread, vegetables",
        price: "16.50",
        imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        displayOrder: 2,
        isAvailable: true,
      },
      {
        categoryId: 3,
        name: "Buffalo Siivet",
        nameEn: "Buffalo Wings",
        description: "Paistettuja kanansiipiä, buffalo-kastiketta",
        descriptionEn: "Fried chicken wings, buffalo sauce",
        price: "11.90",
        imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        displayOrder: 1,
        isAvailable: true,
      },
      {
        categoryId: 4,
        name: "Klassikko Burgeri",
        nameEn: "Classic Burger",
        description: "Naudanlihapihvi, salaatti, tomaatti, sipuli",
        descriptionEn: "Beef patty, lettuce, tomato, onion",
        price: "12.90",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        displayOrder: 1,
        isAvailable: true,
      },
      {
        categoryId: 5,
        name: "Caesar Salaatti",
        nameEn: "Caesar Salad",
        description: "Romainesalaatti, grillattu kana, krutonit",
        descriptionEn: "Romaine lettuce, grilled chicken, croutons",
        price: "10.90",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300",
        isVegetarian: true,
        displayOrder: 1,
        isAvailable: true,
      },
    ];

    items.forEach(item => {
      const menuItem: MenuItem = { 
        id: this.currentMenuItemId++, 
        ...item,
        isVegetarian: item.isVegetarian || false,
        isVegan: false,
        isGlutenFree: false,
      };
      this.menuItems.set(menuItem.id, menuItem);
    });
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(cat => cat.isActive)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const newCategory: Category = { id: this.currentCategoryId++, ...category };
    this.categories.set(newCategory.id, newCategory);
    return newCategory;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter(item => item.isAvailable)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  async getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter(item => item.categoryId === categoryId && item.isAvailable)
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const newItem: MenuItem = { id: this.currentMenuItemId++, ...item };
    this.menuItems.set(newItem.id, newItem);
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    
    const updated: MenuItem = { ...existing, ...item };
    this.menuItems.set(id, updated);
    return updated;
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const orderNumber = `ORD-${Date.now()}`;
    const newOrder: Order = { 
      id: this.currentOrderId++, 
      orderNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...order 
    };
    this.orders.set(newOrder.id, newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updated: Order = { 
      ...order, 
      status, 
      updatedAt: new Date().toISOString() 
    };
    this.orders.set(id, updated);
    return updated;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values())
      .filter(item => item.orderId === orderId);
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const newItem: OrderItem = { id: this.currentOrderItemId++, ...item };
    this.orderItems.set(newItem.id, newItem);
    return newItem;
  }

  // Printer Methods (Not implemented for MemStorage)
  async getAllPrinters(): Promise<Printer[]> {
    return [];
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    return undefined;
  }

  async upsertPrinter(printer: InsertPrinter): Promise<Printer> {
    throw new Error("Printer management not supported in MemStorage");
  }

  async deletePrinter(id: string): Promise<boolean> {
    return false;
  }

  // Stub methods for other required interface methods
  async getToppings(): Promise<Topping[]> {
    return [];
  }

  async createTopping(topping: InsertTopping): Promise<Topping> {
    throw new Error("Not implemented");
  }

  async updateTopping(id: number, topping: Partial<InsertTopping>): Promise<Topping | undefined> {
    return undefined;
  }

  async deleteTopping(id: number): Promise<boolean> {
    return false;
  }

  async getToppingsByCategory(category: string): Promise<Topping[]> {
    return [];
  }

  async getToppingGroups(): Promise<ToppingGroup[]> {
    return [];
  }

  async createToppingGroup(group: InsertToppingGroup): Promise<ToppingGroup> {
    throw new Error("Not implemented");
  }

  async updateToppingGroup(id: number, group: Partial<InsertToppingGroup>): Promise<ToppingGroup | undefined> {
    return undefined;
  }

  async deleteToppingGroup(id: number): Promise<boolean> {
    return false;
  }

  async getToppingGroupItems(groupId: number): Promise<ToppingGroupItem[]> {
    return [];
  }

  async addToppingToGroup(groupId: number, toppingId: number): Promise<ToppingGroupItem> {
    throw new Error("Not implemented");
  }

  async removeToppingFromGroup(groupId: number, toppingId: number): Promise<boolean> {
    return false;
  }

  async getMenuItemToppingGroups(menuItemId: number): Promise<ToppingGroup[]> {
    return [];
  }

  async assignToppingGroupToMenuItem(menuItemId: number, groupId: number): Promise<MenuItemToppingGroup> {
    throw new Error("Not implemented");
  }

  async removeToppingGroupFromMenuItem(menuItemId: number, groupId: number): Promise<boolean> {
    return false;
  }

  async getCategoryToppingGroups(categoryId: number): Promise<ToppingGroup[]> {
    return [];
  }

  async assignToppingGroupToCategory(categoryId: number, groupId: number): Promise<CategoryToppingGroup> {
    throw new Error("Not implemented");
  }

  async removeToppingGroupFromCategory(categoryId: number, groupId: number): Promise<boolean> {
    return false;
  }

  async getRestaurantSettings(): Promise<RestaurantSettings | undefined> {
    return undefined;
  }

  async updateRestaurantSettings(settings: Partial<InsertRestaurantSettings>): Promise<RestaurantSettings> {
    throw new Error("Not implemented");
  }
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Check if data already exists
      const existingCategories = await db.select().from(categories);
      if (existingCategories.length > 0) return;

      // Initialize categories
      const categoriesData = [
        { name: "Pizzat", nameEn: "Pizzas", displayOrder: 1, isActive: true },
        { name: "Kebab", nameEn: "Kebab", displayOrder: 2, isActive: true },
        { name: "Kana", nameEn: "Chicken", displayOrder: 3, isActive: true },
        { name: "Hampurilaiset", nameEn: "Burgers", displayOrder: 4, isActive: true },
        { name: "Salaatit", nameEn: "Salads", displayOrder: 5, isActive: true }
      ];

      const insertedCategories = await db.insert(categories).values(categoriesData).returning();

      // Initialize menu items
      const menuItemsData = [
        // Pizzas
        { name: "Margherita", nameEn: "Margherita", price: "12.90", categoryId: insertedCategories[0].id, description: "Tomaattikastike, mozzarella", descriptionEn: "Tomato sauce, mozzarella", isVegetarian: true, isAvailable: true, displayOrder: 1 },
        { name: "Pepperoni", nameEn: "Pepperoni", price: "15.90", categoryId: insertedCategories[0].id, description: "Tomaattikastike, mozzarella, pepperoni", descriptionEn: "Tomato sauce, mozzarella, pepperoni", isAvailable: true, displayOrder: 2 },
        { name: "Quattro Stagioni", nameEn: "Four Seasons", price: "17.90", categoryId: insertedCategories[0].id, description: "Tomaattikastike, mozzarella, kinkku, sienet, oliivit", descriptionEn: "Tomato sauce, mozzarella, ham, mushrooms, olives", isAvailable: true, displayOrder: 3 },
        
        // Kebab
        { name: "Kebab-lautanen", nameEn: "Kebab Plate", price: "13.90", categoryId: insertedCategories[1].id, description: "Kebab-liha, ranskalaiset, salaatti, kastike", descriptionEn: "Kebab meat, french fries, salad, sauce", isAvailable: true, displayOrder: 1 },
        { name: "Kebab-rulla", nameEn: "Kebab Roll", price: "9.90", categoryId: insertedCategories[1].id, description: "Kebab-liha, salaatti, kastike tortillassa", descriptionEn: "Kebab meat, salad, sauce in tortilla", isAvailable: true, displayOrder: 2 },
        
        // Chicken
        { name: "Broileri-lautanen", nameEn: "Chicken Plate", price: "14.90", categoryId: insertedCategories[2].id, description: "Grillattu broileri, perunat, salaatti", descriptionEn: "Grilled chicken, potatoes, salad", isGlutenFree: true, isAvailable: true, displayOrder: 1 },
        { name: "Buffalo Wings", nameEn: "Buffalo Wings", price: "11.90", categoryId: insertedCategories[2].id, description: "Tulisia kanansiipiä, dippi", descriptionEn: "Spicy chicken wings, dip", isGlutenFree: true, isAvailable: true, displayOrder: 2 },
        
        // Burgers
        { name: "Tirva Burger", nameEn: "Tirva Burger", price: "13.90", categoryId: insertedCategories[3].id, description: "Naudanliha, juusto, salaatti, tomaatti", descriptionEn: "Beef patty, cheese, lettuce, tomato", isAvailable: true, displayOrder: 1 },
        { name: "Veggie Burger", nameEn: "Veggie Burger", price: "12.90", categoryId: insertedCategories[3].id, description: "Kasvispatty, juusto, salaatti", descriptionEn: "Veggie patty, cheese, lettuce", isVegetarian: true, isVegan: true, isAvailable: true, displayOrder: 2 },
        
        // Salads
        { name: "Caesar-salaatti", nameEn: "Caesar Salad", price: "11.90", categoryId: insertedCategories[4].id, description: "Salaatti, kana, krutonit, parmesaani", descriptionEn: "Lettuce, chicken, croutons, parmesan", isGlutenFree: true, isAvailable: true, displayOrder: 1 },
        { name: "Kreikkalainen salaatti", nameEn: "Greek Salad", price: "10.90", categoryId: insertedCategories[4].id, description: "Tomaatti, kurkku, feta, oliivit", descriptionEn: "Tomato, cucumber, feta, olives", isVegetarian: true, isGlutenFree: true, isAvailable: true, displayOrder: 2 }
      ];

      await db.insert(menuItems).values(menuItemsData);
    } catch (error) {
      console.error('Database initialization error:', error);
    }
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories).where(eq(categories.isActive, true));
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return newCategory;
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.isAvailable, true));
  }

  async getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
    return await db
      .select()
      .from(menuItems)
      .where(and(
        eq(menuItems.categoryId, categoryId),
        eq(menuItems.isAvailable, true)
      ));
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db
      .insert(menuItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updated] = await db
      .update(menuItems)
      .set(item)
      .where(eq(menuItems.id, id))
      .returning();
    return updated;
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getOrderById(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const orderNumber = `ORD-${Date.now()}`;
    const [newOrder] = await db
      .insert(orders)
      .values({
        ...order,
        orderNumber,
      })
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [updated] = await db
      .update(orders)
      .set({ 
        status, 
        updatedAt: new Date()
      })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db
      .insert(orderItems)
      .values(item)
      .returning();
    return newItem;
  }

  // Toppings implementation
  async getToppings(): Promise<Topping[]> {
    return await db.select().from(toppings).orderBy(toppings.displayOrder);
  }

  async createTopping(topping: InsertTopping): Promise<Topping> {
    const [newTopping] = await db.insert(toppings).values(topping).returning();
    return newTopping;
  }

  async updateTopping(id: number, topping: Partial<InsertTopping>): Promise<Topping | undefined> {
    const [updatedTopping] = await db
      .update(toppings)
      .set(topping)
      .where(eq(toppings.id, id))
      .returning();
    return updatedTopping || undefined;
  }

  async deleteTopping(id: number): Promise<boolean> {
    const result = await db.delete(toppings).where(eq(toppings.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getToppingsByCategory(category: string): Promise<Topping[]> {
    return await db.select().from(toppings).where(eq(toppings.category, category)).orderBy(toppings.displayOrder);
  }

  // Topping Groups (stub implementation)
  async getToppingGroups(): Promise<ToppingGroup[]> {
    return await db.select().from(toppingGroups).orderBy(toppingGroups.displayOrder);
  }

  async createToppingGroup(group: InsertToppingGroup): Promise<ToppingGroup> {
    const [newGroup] = await db.insert(toppingGroups).values(group).returning();
    return newGroup;
  }

  async updateToppingGroup(id: number, group: Partial<InsertToppingGroup>): Promise<ToppingGroup | undefined> {
    const [updatedGroup] = await db
      .update(toppingGroups)
      .set(group)
      .where(eq(toppingGroups.id, id))
      .returning();
    return updatedGroup || undefined;
  }

  async deleteToppingGroup(id: number): Promise<boolean> {
    const result = await db.delete(toppingGroups).where(eq(toppingGroups.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getToppingGroupItems(groupId: number): Promise<ToppingGroupItem[]> {
    return await db.select().from(toppingGroupItems).where(eq(toppingGroupItems.groupId, groupId));
  }

  async addToppingToGroup(groupId: number, toppingId: number): Promise<ToppingGroupItem> {
    const [newItem] = await db.insert(toppingGroupItems).values({ groupId, toppingId }).returning();
    return newItem;
  }

  async removeToppingFromGroup(groupId: number, toppingId: number): Promise<boolean> {
    const result = await db.delete(toppingGroupItems).where(
      and(eq(toppingGroupItems.groupId, groupId), eq(toppingGroupItems.toppingId, toppingId))
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getMenuItemToppingGroups(menuItemId: number): Promise<ToppingGroup[]> {
    return await db.select({ 
      id: toppingGroups.id,
      name: toppingGroups.name,
      nameEn: toppingGroups.nameEn,
      isRequired: toppingGroups.isRequired,
      maxSelections: toppingGroups.maxSelections,
      minSelections: toppingGroups.minSelections,
      displayOrder: toppingGroups.displayOrder
    })
    .from(toppingGroups)
    .innerJoin(menuItemToppingGroups, eq(menuItemToppingGroups.groupId, toppingGroups.id))
    .where(eq(menuItemToppingGroups.menuItemId, menuItemId))
    .orderBy(toppingGroups.displayOrder);
  }

  async assignToppingGroupToMenuItem(menuItemId: number, groupId: number): Promise<MenuItemToppingGroup> {
    const [newAssignment] = await db.insert(menuItemToppingGroups).values({ menuItemId, groupId }).returning();
    return newAssignment;
  }

  async removeToppingGroupFromMenuItem(menuItemId: number, groupId: number): Promise<boolean> {
    const result = await db.delete(menuItemToppingGroups).where(
      and(eq(menuItemToppingGroups.menuItemId, menuItemId), eq(menuItemToppingGroups.groupId, groupId))
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getCategoryToppingGroups(categoryId: number): Promise<ToppingGroup[]> {
    return await db.select({
      id: toppingGroups.id,
      name: toppingGroups.name,
      nameEn: toppingGroups.nameEn,
      isRequired: toppingGroups.isRequired,
      maxSelections: toppingGroups.maxSelections,
      minSelections: toppingGroups.minSelections,
      displayOrder: toppingGroups.displayOrder
    })
    .from(toppingGroups)
    .innerJoin(categoryToppingGroups, eq(categoryToppingGroups.groupId, toppingGroups.id))
    .where(eq(categoryToppingGroups.categoryId, categoryId))
    .orderBy(toppingGroups.displayOrder);
  }

  async assignToppingGroupToCategory(categoryId: number, groupId: number): Promise<CategoryToppingGroup> {
    const [newAssignment] = await db.insert(categoryToppingGroups).values({ categoryId, groupId }).returning();
    return newAssignment;
  }

  async removeToppingGroupFromCategory(categoryId: number, groupId: number): Promise<boolean> {
    const result = await db.delete(categoryToppingGroups).where(
      and(eq(categoryToppingGroups.categoryId, categoryId), eq(categoryToppingGroups.groupId, groupId))
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getRestaurantSettings(): Promise<RestaurantSettings | undefined> {
    const [settings] = await db.select().from(restaurantSettings).limit(1);
    return settings || undefined;
  }

  async updateRestaurantSettings(settings: Partial<InsertRestaurantSettings>): Promise<RestaurantSettings> {
    const existing = await this.getRestaurantSettings();
    if (existing) {
      const [updated] = await db
        .update(restaurantSettings)
        .set(settings)
        .where(eq(restaurantSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(restaurantSettings)
        .values(settings as InsertRestaurantSettings)
        .returning();
      return created;
    }
  }

  // Printer Methods
  async getAllPrinters(): Promise<Printer[]> {
    return await db.select().from(printers).where(eq(printers.isActive, true));
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    const [printer] = await db.select().from(printers).where(eq(printers.id, id)).limit(1);
    return printer || undefined;
  }

  async upsertPrinter(printer: InsertPrinter): Promise<Printer> {
    console.log('?? [DATABASE] Upserting printer:', {
      id: printer.id,
      name: printer.name,
      address: printer.address,
      port: printer.port,
      printerType: printer.printerType,
      hasFontSettings: !!printer.fontSettings
    });
    
    const existing = await this.getPrinter(printer.id);
    
    if (existing) {
      console.log('?? [DATABASE] Updating existing printer:', printer.id);
      const [updated] = await db
        .update(printers)
        .set({
          name: printer.name,
          address: printer.address,
          port: printer.port,
          printerType: printer.printerType,
          isActive: printer.isActive,
          fontSettings: printer.fontSettings,
          updatedAt: new Date(),
        })
        .where(eq(printers.id, printer.id))
        .returning();
      console.log('? [DATABASE] Printer updated successfully:', updated.id);
      return updated;
    } else {
      console.log('? [DATABASE] Creating new printer:', printer.id);
      const [created] = await db
        .insert(printers)
        .values(printer)
        .returning();
      console.log('? [DATABASE] Printer created successfully:', created.id);
      return created;
    }
  }

  async deletePrinter(id: string): Promise<boolean> {
    const result = await db.update(printers)
      .set({ isActive: false })
      .where(eq(printers.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();
