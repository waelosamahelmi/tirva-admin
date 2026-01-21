import { pgTable, text, varchar, serial, integer, boolean, decimal, numeric, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
});

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  postalCode: text("postal_code").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  openingHours: jsonb("opening_hours"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  description: text("description"),
  descriptionEn: text("description_en"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  displayOrder: integer("display_order").default(0),
  isAvailable: boolean("is_available").default(true),
  offerPrice: decimal("offer_price", { precision: 10, scale: 2 }),
  offerPercentage: integer("offer_percentage"),
  offerStartDate: timestamp("offer_start_date"),
  offerEndDate: timestamp("offer_end_date"),
  // Conditional pricing fields for customizable items (e.g., "Your Choice Pizza")
  hasConditionalPricing: boolean("has_conditional_pricing").default(false),
  includedToppingsCount: integer("included_toppings_count").default(0), // Number of free toppings included in base price
  branchId: integer("branch_id").references(() => branches.id), // NULL = available at all branches
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  deliveryAddress: text("delivery_address"),
  orderType: text("order_type").notNull(), // 'delivery', 'pickup'
  branchId: integer("branch_id").references(() => branches.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  smallOrderFee: decimal("small_order_fee", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").default("cash"), // 'cash', 'card', 'stripe'
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'paid', 'failed', 'refunded'
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paymentMethodDetails: jsonb("payment_method_details"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundReason: text("refund_reason"),
  refundedAt: timestamp("refunded_at"),
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  specialInstructions: text("special_instructions"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastLogin: timestamp("last_login"),
});

export const toppings = pgTable("toppings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  category: text("category").notNull().default("pizza"), // pizza, kebab, chicken, wings, burger, drink, salad, kids
  type: text("type").notNull().default("topping"), // topping, sauce, extra, size, base, spice, drink
  isRequired: boolean("is_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const toppingGroups = pgTable("topping_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  isRequired: boolean("is_required").default(false),
  maxSelections: integer("max_selections").default(1),
  minSelections: integer("min_selections").default(0),
  displayOrder: integer("display_order").default(0),
});

export const toppingGroupItems = pgTable("topping_group_items", {
  id: serial("id").primaryKey(),
  toppingGroupId: integer("topping_group_id").references(() => toppingGroups.id).notNull(),
  toppingId: integer("topping_id").references(() => toppings.id).notNull(),
  displayOrder: integer("display_order").default(0),
});

export const menuItemToppingGroups = pgTable("menu_item_topping_groups", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id).notNull(),
  toppingGroupId: integer("topping_group_id").references(() => toppingGroups.id).notNull(),
});

export const categoryToppingGroups = pgTable("category_topping_groups", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  toppingGroupId: integer("topping_group_id").references(() => toppingGroups.id).notNull(),
});

export const printers = pgTable("printers", {
  id: text("id").primaryKey(), // UUID from device
  name: text("name").notNull(),
  address: text("address").notNull(),
  port: integer("port").notNull(),
  printerType: text("printer_type").notNull(), // 'star' or 'escpos'
  isActive: boolean("is_active").default(true),
  fontSettings: jsonb("font_settings").default({
    restaurantName: { width: 3, height: 3 },
    header: { width: 2, height: 2 },
    orderNumber: { width: 3, height: 3 },
    menuItems: { width: 2, height: 2 },
    toppings: { width: 2, height: 2 },
    totals: { width: 2, height: 2 },
    finalTotal: { width: 4, height: 4 },
    characterSpacing: 0
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const restaurantSettings = pgTable("restaurant_settings", {
  id: serial("id").primaryKey(),
  isOpen: boolean("is_open").default(true),
  openingHours: text("opening_hours").notNull(),
  pickupHours: text("pickup_hours").notNull(),
  deliveryHours: text("delivery_hours").notNull(),
  lunchBuffetHours: text("lunch_buffet_hours").notNull(),
  specialMessage: text("special_message"),
  // Printer settings
  defaultPrinterId: text("default_printer_id"),
  printerAutoReconnect: boolean("printer_auto_reconnect").default(true),
  printerTabSticky: boolean("printer_tab_sticky").default(true),
  receiptFormat: text("receipt_format").default('text'),
  directPrintEnabled: boolean("direct_print_enabled").default(true),
  // Payment methods
  paymentMethods: jsonb("payment_methods").default([
    {"id": "cash", "nameFi": "Käteinen", "nameEn": "Cash", "enabled": true, "icon": "banknote"},
    {"id": "card", "nameFi": "Kortti", "nameEn": "Card", "enabled": true, "icon": "credit-card"}
  ]),
  // Stripe payment settings
  stripeEnabled: boolean("stripe_enabled").default(false),
  stripePublishableKey: text("stripe_publishable_key"),
  stripeSecretKey: text("stripe_secret_key"),
  stripeWebhookSecret: text("stripe_webhook_secret"),
  stripeTestMode: boolean("stripe_test_mode").default(true),
  stripeConnectAccountId: text("stripe_connect_account_id"),
  stripeAccountEmail: text("stripe_account_email"),
  stripeAccountCountry: text("stripe_account_country"),
  stripePaymentMethodsConfig: jsonb("stripe_payment_methods_config").default({}),
  // Online payment service fee
  onlinePaymentServiceFee: numeric("online_payment_service_fee", { precision: 10, scale: 2 }).default('0.00'),
  onlinePaymentServiceFeeType: text("online_payment_service_fee_type").default('fixed'), // 'fixed' or 'percentage'
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const restaurantConfig = pgTable("restaurant_config", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameEn: text("name_en").notNull(),
  tagline: text("tagline").notNull(),
  taglineEn: text("tagline_en").notNull(),
  description: text("description").notNull(),
  descriptionEn: text("description_en").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: jsonb("address").notNull().default('{}'),
  socialMedia: jsonb("social_media").default('{}'),
  hours: jsonb("hours").notNull().default('{}'),
  services: jsonb("services").notNull().default('{}'),
  deliveryConfig: jsonb("delivery_config").notNull().default('{}'),
  theme: jsonb("theme").notNull().default('{}'),
  pageLayoutVariants: jsonb("page_layout_variants").notNull().default('{"home":"variant1","menu":"variant1","about":"variant1","header":"variant1","footer":"variant1","cart":"variant1","checkout":"variant1"}'),
  logo: jsonb("logo").notNull().default('{}'),
  about: jsonb("about").notNull().default('{}'),
  hero: jsonb("hero").notNull().default('{}'),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertToppingSchema = createInsertSchema(toppings).omit({
  id: true,
});

export const insertToppingGroupSchema = createInsertSchema(toppingGroups).omit({
  id: true,
});

export const insertToppingGroupItemSchema = createInsertSchema(toppingGroupItems).omit({
  id: true,
});

export const insertMenuItemToppingGroupSchema = createInsertSchema(menuItemToppingGroups).omit({
  id: true,
});

export const insertCategoryToppingGroupSchema = createInsertSchema(categoryToppingGroups).omit({
  id: true,
});

export const insertPrinterSchema = createInsertSchema(printers).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertRestaurantSettingsSchema = createInsertSchema(restaurantSettings).omit({
  id: true,
  updatedAt: true,
});

export const insertRestaurantConfigSchema = createInsertSchema(restaurantConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Category = typeof categories.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type User = typeof users.$inferSelect;
export type Topping = typeof toppings.$inferSelect;
export type ToppingGroup = typeof toppingGroups.$inferSelect;
export type ToppingGroupItem = typeof toppingGroupItems.$inferSelect;
export type MenuItemToppingGroup = typeof menuItemToppingGroups.$inferSelect;
export type CategoryToppingGroup = typeof categoryToppingGroups.$inferSelect;
export type Printer = typeof printers.$inferSelect;
export type RestaurantSettings = typeof restaurantSettings.$inferSelect;
export type RestaurantConfig = typeof restaurantConfig.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTopping = z.infer<typeof insertToppingSchema>;
export type InsertToppingGroup = z.infer<typeof insertToppingGroupSchema>;
export type InsertToppingGroupItem = z.infer<typeof insertToppingGroupItemSchema>;
export type InsertMenuItemToppingGroup = z.infer<typeof insertMenuItemToppingGroupSchema>;
export type InsertCategoryToppingGroup = z.infer<typeof insertCategoryToppingGroupSchema>;
export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type InsertRestaurantSettings = z.infer<typeof insertRestaurantSettingsSchema>;
export type InsertRestaurantConfig = z.infer<typeof insertRestaurantConfigSchema>;
