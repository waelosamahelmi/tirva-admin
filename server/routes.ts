import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertOrderSchema, insertOrderItemSchema, insertToppingSchema, insertMenuItemSchema } from "@shared/schema";
import { authService, type AuthUser } from "./auth";
import { updateMenuItemImages, addImageToMenuItem, getMenuItemsWithoutImages } from "./image-updater";
import { upload, uploadImageToSupabase, deleteImageFromSupabase, ensureStorageBucket } from "./file-upload";
import { uploadImageToHostinger, testHostingerConnection } from "./hostinger-upload";
import stripeRouter from "./routes/stripe-new";
import { z } from "zod";
import nodemailer from "nodemailer";

// Extend Express session interface
declare module "express-session" {
  interface SessionData {
    user?: AuthUser;
  }
}

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  // Check for session-based auth first (existing functionality)
  if (req.session && req.session.user) {
    return next();
  }
  
  // Check for Bearer token authentication (Supabase JWT)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // For now, we'll accept any Bearer token as valid
    // In a production environment, you should verify the Supabase JWT
    console.log(`?? Bearer token authentication accepted for ${req.method} ${req.path}`);
    return next();
  }
  
  console.log(`? Authentication failed for ${req.method} ${req.path} - no session or Bearer token`);
  return res.status(401).json({ error: "Authentication required" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log(`?? Login attempt for email: ${email}`);
      console.log(`?? Origin: ${req.headers.origin}`);
      console.log(`?? Session ID before login: ${req.sessionID}`);
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const user = await authService.authenticateUser(email, password);
      if (!user) {
        console.log(`? Authentication failed for email: ${email}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.user = user;
      
      // Force session save to ensure it's written to store
      req.session.save((err) => {
        if (err) {
          console.error(`? Session save error:`, err);
        } else {
          console.log(`? Session saved successfully`);
        }
      });
      
      console.log(`? User logged in successfully: ${user.email}`);
      console.log(`?? Session ID after login: ${req.sessionID}`);
      console.log(`?? Session user: ${JSON.stringify(req.session.user)}`);
      console.log(`?? Session cookie config: ${JSON.stringify(req.session.cookie)}`);
      
      res.json({ user });
    } catch (error) {
      console.error(`?? Login error:`, error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    console.log(`?? Logout request from session: ${req.sessionID}`);
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  // ===== STRIPE PAYMENT ROUTES =====
  // All Stripe routes are now handled by the stripe router
  // Routes: GET /api/stripe/config, POST /api/stripe/create-payment-intent, 
  //         POST /api/stripe/confirm-payment, POST /api/stripe/webhook
  app.use("/api/stripe", stripeRouter);

  // Email Marketing API
  app.post("/api/send-email", async (req, res) => {
    try {
      const { to, subject, html, replyTo } = req.body;

      if (!to || !Array.isArray(to) || to.length === 0) {
        return res.status(400).json({ error: "Recipients (to) are required and must be an array" });
      }

      if (!subject || !html) {
        return res.status(400).json({ error: "Subject and HTML content are required" });
      }

      console.log(`?? Sending marketing email to ${to.length} recipients`);
      console.log(`?? Subject: ${subject}`);

      // Create nodemailer transporter for Hostinger SMTP
      const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'no-reply@tirvankahvila.fi',
          pass: process.env.SMTP_PASSWORD || 'your-password-here' // Set this in .env
        }
      });

      // Send email to all recipients
      const info = await transporter.sendMail({
        from: '"Tirvan Kahvila" <no-reply@tirvankahvila.fi>',
        to: to.join(', '), // Join all recipient emails
        subject: subject,
        html: html,
        replyTo: replyTo || 'info@tirvankahvila.fi'
      });

      console.log(`? Marketing email sent successfully: ${info.messageId}`);
      console.log(`?? Recipients: ${to.length}`);

      res.json({ 
        success: true, 
        messageId: info.messageId,
        recipientCount: to.length 
      });
    } catch (error) {
      console.error('? Failed to send marketing email:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to send email'
      });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    console.log(`?? Auth check for session: ${req.sessionID}`);
    console.log(`?? Origin: ${req.headers.origin}`);
    console.log(`?? Cookie header: ${req.headers.cookie}`);
    console.log(`?? Session user: ${JSON.stringify(req.session.user)}`);
    console.log(`?? Session data: ${JSON.stringify(req.session)}`);
    console.log(`?? Request session cookie: ${req.session.cookie ? JSON.stringify(req.session.cookie) : 'undefined'}`);
    
    if (req.session.user) {
      console.log(`? Auth check successful for user: ${req.session.user.email}`);
      res.json({ user: req.session.user });
    } else {
      console.log(`? Auth check failed - no user in session`);
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // ===== PRINTER MANAGEMENT ROUTES =====
  
  // Get all printers
  app.get("/api/printers", async (req, res) => {
    try {
      console.log('?? [API] GET /api/printers - Fetching all printers');
      const printers = await storage.getAllPrinters();
      console.log(`? [API] Found ${printers.length} printers`);
      res.json(printers);
    } catch (error) {
      console.error('? [API] Failed to get printers:', error);
      console.error('? [API] Error details:', error instanceof Error ? error.message : String(error));
      console.error('? [API] Error stack:', error instanceof Error ? error.stack : '');
      res.status(500).json({ error: "Failed to get printers", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get printer by ID
  app.get("/api/printers/:id", async (req, res) => {
    try {
      const printer = await storage.getPrinter(req.params.id);
      if (!printer) {
        return res.status(404).json({ error: "Printer not found" });
      }
      res.json(printer);
    } catch (error) {
      console.error('? Failed to get printer:', error);
      res.status(500).json({ error: "Failed to get printer" });
    }
  });

  // Create or update printer
  app.post("/api/printers", async (req, res) => {
    try {
      const { id, name, address, port, printerType, isActive, fontSettings } = req.body;
      
      console.log('?? [API] POST /api/printers - Request body:', { id, name, address, port, printerType, isActive, hasFontSettings: !!fontSettings });
      
      if (!id || !name || !address || !port || !printerType) {
        console.error('? [API] Missing required fields');
        return res.status(400).json({ error: "Missing required fields" });
      }

      const printer = await storage.upsertPrinter({
        id,
        name,
        address,
        port,
        printerType,
        isActive: isActive ?? true,
        fontSettings: fontSettings || undefined,
      });

      console.log('? [API] Printer saved successfully:', printer.id);
      res.json(printer);
    } catch (error) {
      console.error('? [API] Failed to save printer:', error);
      console.error('? [API] Error details:', error instanceof Error ? error.message : String(error));
      console.error('? [API] Error stack:', error instanceof Error ? error.stack : '');
      res.status(500).json({ error: "Failed to save printer", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update printer
  app.put("/api/printers/:id", async (req, res) => {
    try {
      const { name, address, port, printerType, isActive, fontSettings } = req.body;
      
      console.log('?? [API] PUT /api/printers/:id - Request:', { id: req.params.id, name, address, port, printerType, isActive, hasFontSettings: !!fontSettings });
      
      const printer = await storage.upsertPrinter({
        id: req.params.id,
        name,
        address,
        port,
        printerType,
        isActive,
        fontSettings: fontSettings || undefined,
      });

      console.log('? [API] Printer updated successfully:', printer.id);
      res.json(printer);
    } catch (error) {
      console.error('? [API] Failed to update printer:', error);
      console.error('? [API] Error details:', error instanceof Error ? error.message : String(error));
      console.error('? [API] Error stack:', error instanceof Error ? error.stack : '');
      res.status(500).json({ error: "Failed to update printer", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Delete printer
  app.delete("/api/printers/:id", async (req, res) => {
    try {
      await storage.deletePrinter(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('? Failed to delete printer:', error);
      res.status(500).json({ error: "Failed to delete printer" });
    }
  });

  // Get all categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Get all menu items
  app.get("/api/menu-items", async (req, res) => {
    try {
      const { categoryId } = req.query;
      
      let items;
      if (categoryId) {
        items = await storage.getMenuItemsByCategory(parseInt(categoryId as string));
      } else {
        items = await storage.getMenuItems();
      }
      
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  // Update menu item (PATCH for partial updates)
  app.patch("/api/menu-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      console.log("?? SERVER: Received PATCH request for menu item", id);
      console.log("?? SERVER: Update data:", updateData);
      console.log("?? SERVER: hasConditionalPricing:", updateData.hasConditionalPricing);
      console.log("?? SERVER: includedToppingsCount:", updateData.includedToppingsCount);
      
      const updated = await storage.updateMenuItem(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      console.log("? SERVER: Updated item:", updated);
      console.log("? SERVER: Result hasConditionalPricing:", updated.hasConditionalPricing);
      console.log("? SERVER: Result includedToppingsCount:", updated.includedToppingsCount);
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // Get all toppings
  app.get("/api/toppings", async (req, res) => {
    try {
      const { category } = req.query;
      if (category) {
        const toppings = await storage.getToppingsByCategory(category as string);
        res.json(toppings);
      } else {
        const toppings = await storage.getToppings();
        res.json(toppings);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch toppings" });
    }
  });

  // Create new topping
  app.post("/api/toppings", async (req, res) => {
    try {
      const toppingData = insertToppingSchema.parse(req.body);
      const topping = await storage.createTopping(toppingData);
      res.status(201).json(topping);
    } catch (error) {
      res.status(500).json({ error: "Failed to create topping" });
    }
  });

  // Update topping
  app.patch("/api/toppings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const toppingData = req.body;
      const updated = await storage.updateTopping(id, toppingData);
      if (!updated) {
        return res.status(404).json({ error: "Topping not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update topping" });
    }
  });

  // Delete topping
  app.delete("/api/toppings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTopping(id);
      if (!deleted) {
        return res.status(404).json({ error: "Topping not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete topping" });
    }
  });

  // Get all orders
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      const menuItems = await storage.getMenuItems();
      
      // Enrich orders with item details
      const enrichedOrders = await Promise.all(
        orders.map(async (order) => {
          const orderItems = await storage.getOrderItems(order.id);
          const enrichedItems = orderItems.map(item => {
            const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
            
            // Parse toppings, size, and special instructions from combined field
            let toppings: string[] = [];
            let size = '';
            let specialInstructions = '';
            
            const combinedInstructions = item.specialInstructions || '';
            
            if (combinedInstructions) {
              // Parse toppings
              const toppingsMatch = combinedInstructions.match(/Toppings:\s*([^;]+)/);
              if (toppingsMatch) {
                toppings = toppingsMatch[1].split(',').map(t => t.trim()).filter(t => t);
              }
              
              // Parse size
              const sizeMatch = combinedInstructions.match(/Size:\s*([^;]+)/);
              if (sizeMatch) {
                size = sizeMatch[1].trim();
              }
              
              // Parse special instructions
              const specialMatch = combinedInstructions.match(/Special:\s*(.+)/);
              if (specialMatch) {
                specialInstructions = specialMatch[1].trim();
              }
            }
            
            return {
              ...item,
              name: menuItem?.name || 'Unknown Item',
              nameEn: menuItem?.nameEn || 'Unknown Item',
              description: menuItem?.description || '',
              toppings,
              size,
              specialInstructions: specialInstructions || null
            };
          });
          
          return {
            ...order,
            items: enrichedItems
          };
        })
      );
      
      res.json(enrichedOrders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  // Get order by ID with items
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrderById(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      const orderItems = await storage.getOrderItems(id);
      const menuItems = await storage.getMenuItems();
      
      // Enrich order items with menu item details
      const enrichedItems = orderItems.map(item => {
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        
        // Parse toppings, size, and special instructions from combined field
        let toppings: string[] = [];
        let size = '';
        let specialInstructions = '';
        
        const combinedInstructions = item.specialInstructions || '';
        
        if (combinedInstructions) {
          // Parse toppings
          const toppingsMatch = combinedInstructions.match(/Toppings:\s*([^;]+)/);
          if (toppingsMatch) {
            toppings = toppingsMatch[1].split(',').map(t => t.trim()).filter(t => t);
          }
          
          // Parse size
          const sizeMatch = combinedInstructions.match(/Size:\s*([^;]+)/);
          if (sizeMatch) {
            size = sizeMatch[1].trim();
          }
          
          // Parse special instructions
          const specialMatch = combinedInstructions.match(/Special:\s*(.+)/);
          if (specialMatch) {
            specialInstructions = specialMatch[1].trim();
          }
        }
        
        return {
          ...item,
          name: menuItem?.name || 'Unknown Item',
          nameEn: menuItem?.nameEn || 'Unknown Item',
          description: menuItem?.description || '',
          toppings,
          size,
          specialInstructions: specialInstructions || null
        };
      });
      
      res.json({ ...order, items: enrichedItems });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  // Create new order
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const { items, ...order } = req.body;
      
      // Log branch info for debugging
      console.log('?? Creating order with branch_id:', order.branchId, 'for customer:', order.customerName);
      
      // Calculate totals
      let subtotal = 0;
      const validatedItems = [];
      
      for (const item of items) {
        const menuItems = await storage.getMenuItems();
        const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
        
        if (!menuItem) {
          return res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
        }
        
        // Calculate item total including base price, toppings price, and size price
        const basePrice = parseFloat(menuItem.price);
        const toppingsPrice = item.toppingsPrice || 0;
        const sizePrice = item.sizePrice || 0;
        const itemUnitPrice = basePrice + toppingsPrice + sizePrice;
        const totalPrice = itemUnitPrice * item.quantity;
        subtotal += totalPrice;
        
        // Combine toppings and special instructions for storage
        let combinedInstructions = "";
        if (item.toppings && item.toppings.length > 0) {
          // Handle toppings as objects with name and price
          const toppingNames = item.toppings.map((topping: any) => {
            if (typeof topping === 'object' && topping.name) {
              return `${topping.name} (+€${parseFloat(topping.price || 0).toFixed(2)})`;
            }
            return topping; // fallback for string toppings
          });
          combinedInstructions += `Toppings: ${toppingNames.join(", ")}`;
        }
        if (item.size && item.size !== "normal") {
          if (combinedInstructions) combinedInstructions += "; ";
          combinedInstructions += `Size: ${item.size}`;
        }
        if (item.specialInstructions) {
          if (combinedInstructions) combinedInstructions += "; ";
          combinedInstructions += `Special: ${item.specialInstructions}`;
        }

        validatedItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: itemUnitPrice.toFixed(2), // Include toppings in unit price
          totalPrice: totalPrice.toFixed(2),
          specialInstructions: combinedInstructions || null,
        });
      }
      
      // Calculate delivery fee and small order fee
      const deliveryFee = order.orderType === 'delivery' ? parseFloat(order.deliveryFee || '3.50') : 0;
      const smallOrderFee = parseFloat(order.smallOrderFee || '0');
      const totalAmount = subtotal + deliveryFee + smallOrderFee;
      
      // Create order
      const newOrder = await storage.createOrder({
        ...order,
        subtotal: subtotal.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        smallOrderFee: smallOrderFee.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      });
      
      console.log('? Order created:', newOrder.orderNumber, 'with branch_id:', newOrder.branchId);
      
      // Create order items
      for (const item of validatedItems) {
        await storage.createOrderItem({
          orderId: newOrder.id,
          ...item,
        });
      }
      
      // Notify admins of new order
      const notifyAdmins = (app as any).notifyAdminsNewOrder;
      if (notifyAdmins) {
        notifyAdmins(newOrder);
      }

      // Send order confirmation email
      if (newOrder.customerEmail) {
        try {
          // Get all menu items and create a lookup map
          const allMenuItems = await storage.getMenuItems();
          const menuItemMap = new Map(
            allMenuItems.map(item => [item.id, item])
          );

          const { sendOrderConfirmationEmail } = await import('./email-service');
          await sendOrderConfirmationEmail({
            orderNumber: newOrder.orderNumber || newOrder.id.toString(),
            customerName: newOrder.customerName || 'Valued Customer',
            customerEmail: newOrder.customerEmail,
            items: validatedItems.map((item, index) => ({
              name: menuItemMap.get(item.menuItemId)?.name || `Item ${index + 1}`,
              quantity: item.quantity,
              price: parseFloat(item.unitPrice.toString()),
              totalPrice: parseFloat(item.totalPrice),
              toppings: [] // Add toppings handling if needed
            })),
            subtotal: parseFloat(subtotal.toString()),
            deliveryFee: parseFloat(deliveryFee.toString()),
            smallOrderFee: parseFloat(smallOrderFee.toString()),
            totalAmount: parseFloat(totalAmount.toString()),
            orderType: (newOrder.orderType as 'delivery' | 'pickup') || 'pickup',
            deliveryAddress: newOrder.deliveryAddress || undefined,
            estimatedDeliveryTime: undefined // Add this when we implement delivery time estimation
          });
        } catch (error) {
          console.error('Failed to send order confirmation email:', error);
          // Don't block the order creation if email fails
        }
      }
      
      res.status(201).json(newOrder);
    } catch (error) {
      console.error("Order creation error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid order data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create order", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Update order status
  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const validStatuses = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const updated = await storage.updateOrderStatus(id, status);
      if (!updated) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Product management routes

  // Create new menu item
  app.post("/api/menu-items", requireAuth, async (req, res) => {
    try {
      const menuItemData = req.body;
      const menuItem = await storage.createMenuItem(menuItemData);
      res.status(201).json(menuItem);
    } catch (error) {
      console.error("Error creating menu item:", error);
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });

  // Update menu item
  app.put("/api/menu-items/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const menuItemData = req.body;
      const updatedMenuItem = await storage.updateMenuItem(id, menuItemData);
      if (!updatedMenuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(updatedMenuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });

  // General image upload endpoint
  app.post("/api/upload-image", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const file = req.file;
      const restaurantName = req.body.restaurantName || 'default-restaurant';
      const folder = req.body.folder || 'menu-items';
      
      if (!file) {
        console.error('? No file provided in request');
        return res.status(400).json({ error: "Image file is required" });
      }
      
      console.log('?? Uploading image for folder:', folder);
      console.log('?? File details:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      });
      
      // Upload to Hostinger FTP (using plain FTP, not FTPS)
      console.log('?? Uploading to Hostinger FTP...');
      const imageUrl = await uploadImageToHostinger(file, folder);
      console.log('? Image uploaded successfully:', imageUrl);
      
      res.json({ imageUrl });
    } catch (error) {
      console.error("? Error uploading image:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: "Failed to upload image",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test Hostinger FTP connection
  app.get("/api/test-hostinger", requireAuth, async (req, res) => {
    try {
      console.log('?? Testing Hostinger FTP connection...');
      const isConnected = await testHostingerConnection();
      
      if (isConnected) {
        res.json({ 
          success: true, 
          message: 'Hostinger FTP connection successful',
          strategy: process.env.IMAGE_UPLOAD_STRATEGY || 'hostinger'
        });
      } else {
        res.status(500).json({ 
          success: false, 
          error: 'Hostinger FTP connection failed. Check credentials.' 
        });
      }
    } catch (error) {
      console.error("Error testing Hostinger:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Upload menu item image
  app.post("/api/menu-items/:id/images", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const file = req.file;
      const restaurantName = req.body.restaurantName || 'default-restaurant';
      
      if (!file) {
        return res.status(400).json({ error: "Image file is required" });
      }
      
      // No need to ensure storage bucket for Cloudinary
      console.log('?? Uploading menu item image to Cloudinary for restaurant:', restaurantName, 'menu item:', id);
      
      // Upload image to Cloudinary with restaurant-specific folder
      const imageUrl = await uploadImageToSupabase(file, restaurantName, 'menu-items');
      
      // Update menu item with new image URL
      const updatedMenuItem = await storage.updateMenuItem(id, { imageUrl });
      if (!updatedMenuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      res.json({ imageUrl, menuItem: updatedMenuItem });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const adminConnections = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    console.log('WebSocket connection established');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'admin_connect') {
          adminConnections.add(ws);
          console.log('Admin connected for notifications');
          ws.send(JSON.stringify({ type: 'connection_confirmed', message: 'Admin connected' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      adminConnections.delete(ws);
      console.log('WebSocket connection closed');
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      adminConnections.delete(ws);
    });
  });
  
  // Function to notify admins of new orders
  function notifyAdminsNewOrder(order: any) {
    const notification = {
      type: 'new_order',
      order,
      timestamp: new Date().toISOString()
    };
    
    adminConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(notification));
      }
    });
  }
  
  // Store notification function on the app for use in routes
  (app as any).notifyAdminsNewOrder = notifyAdminsNewOrder;
  
  return httpServer;
}
