import { db } from "./db";
import { menuItems } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";

// High-quality food images from Unsplash and other reliable sources
const menuItemImages: Record<string, string> = {
  // Pizzas
  "Margherita": "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=987&q=80",
  "Pepperoni": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1981&q=80",
  "Quattro Stagioni": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1925&q=80",
  "Four Seasons": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1925&q=80",

  // Kebab
  "Kebab-lautanen": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "Kebab Plate": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "Kebab-rulla": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=922&q=80",
  "Kebab Roll": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=922&q=80",

  // Chicken
  "Broileri-lautanen": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "Chicken Plate": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2069&q=80",
  "Buffalo Wings": "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1980&q=80",

  // Burgers
  "Tirva Burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1899&q=80",
  "Veggie Burger": "https://images.unsplash.com/photo-1525059696034-4967a729002e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2064&q=80",

  // Salads
  "Caesar-salaatti": "https://images.unsplash.com/photo-1551248429-40975aa4de74?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1990&q=80",
  "Caesar Salad": "https://images.unsplash.com/photo-1551248429-40975aa4de74?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1990&q=80",
  "Kreikkalainen salaatti": "https://images.unsplash.com/photo-1540420773420-3366772f4999?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1984&q=80",
  "Greek Salad": "https://images.unsplash.com/photo-1540420773420-3366772f4999?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1984&q=80"
};

// Additional high-quality food images for the expanded Tirvan Kahvila menu
const expandedMenuImages: Record<string, string> = {
  // More Pizzas
  "Marinara": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Hawaiian": "https://images.unsplash.com/photo-1555072956-7758afb20e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Vegetariana": "https://images.unsplash.com/photo-1574126154517-d1e0d89ef734?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Quattro Formaggi": "https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Diavola": "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Capricciosa": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Funghi": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Prosciutto": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",

  // Pasta dishes
  "Spaghetti Carbonara": "https://images.unsplash.com/photo-1551183053-bf91a1d81141?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Penne Arrabbiata": "https://images.unsplash.com/photo-1572441713132-51f0460d5bc0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Lasagne": "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",

  // Finnish specialties
  "Lohikeitto": "https://images.unsplash.com/photo-1547592166-23ac45744acd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Karjalanpaisti": "https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Poronkäristys": "https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",

  // Desserts
  "Tiramisu": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Panna Cotta": "https://images.unsplash.com/photo-1488477181946-6428a0291777?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Gelato": "https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",

  // Beverages
  "Cappuccino": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Espresso": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
  "Coca-Cola": "https://images.unsplash.com/photo-1561758033-d89a9ad46330?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
};

export async function updateMenuItemImages() {
  try {
    console.log("Starting menu item image update...");
    
    // Get all menu items from the database
    const allMenuItems = await db.select().from(menuItems);
    
    let updatedCount = 0;
    
    for (const item of allMenuItems) {
      // Check if item already has an image
      if (item.imageUrl) {
        console.log(`Skipping ${item.name} - already has image`);
        continue;
      }
      
      // Look for image URL by Finnish name first, then English name
      let imageUrl = menuItemImages[item.name] || menuItemImages[item.nameEn];
      
      // If not found in main mapping, check expanded mapping
      if (!imageUrl) {
        imageUrl = expandedMenuImages[item.name] || expandedMenuImages[item.nameEn];
      }
      
      if (imageUrl) {
        await db
          .update(menuItems)
          .set({ imageUrl })
          .where(eq(menuItems.id, item.id));
        
        console.log(`Updated image for: ${item.name} (${item.nameEn})`);
        updatedCount++;
      } else {
        console.log(`No image found for: ${item.name} (${item.nameEn})`);
      }
    }
    
    console.log(`Image update complete. Updated ${updatedCount} menu items.`);
    return { success: true, updatedCount };
    
  } catch (error) {
    console.error("Error updating menu item images:", error);
    return { success: false, error: String(error) };
  }
}

// Function to add images for specific menu items by ID
export async function addImageToMenuItem(itemId: number, imageUrl: string) {
  try {
    const [updated] = await db
      .update(menuItems)
      .set({ imageUrl })
      .where(eq(menuItems.id, itemId))
      .returning();
    
    return updated;
  } catch (error) {
    console.error("Error adding image to menu item:", error);
    throw error;
  }
}

// Function to get menu items without images
export async function getMenuItemsWithoutImages() {
  try {
    const itemsWithoutImages = await db
      .select()
      .from(menuItems)
      .where(isNull(menuItems.imageUrl));
    
    return itemsWithoutImages;
  } catch (error) {
    console.error("Error getting menu items without images:", error);
    throw error;
  }
}