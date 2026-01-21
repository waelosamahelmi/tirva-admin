import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { db, pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { authService } from "./auth";
import { initializeComprehensiveToppings } from "./initialize-toppings";
import { cloudPRNTServer } from "./cloudprnt-server";

const app = express();

// Mobile/Capacitor-specific CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    console.log(`CORS origin check: ${origin}`);
    
    // Allow Capacitor and localhost origins
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'http://localhost:8100',
      'capacitor://localhost',
      'ionic://localhost',
      'http://localhost',
      'https://localhost',
      'https://tirvan-kahvila.fly.io',
      'https://tirvaadmin.fly.io',
      'https://tirvankahvila.fi',
      'http://tirvankahvila.fi'
    ];
    
    // Allow any localhost with different ports and IPs
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('172.')) {
      console.log(`? CORS allowed: localhost/local network origin ${origin}`);
      return callback(null, true);
    }
    
    // Allow Capacitor schemes
    if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
      console.log(`? CORS allowed: mobile app origin ${origin}`);
      return callback(null, true);
    }
    
    // Allow Netlify domains
    if (origin.includes('fly.io')) {
      console.log(`? CORS allowed: Netlify domain ${origin}`);
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`? CORS allowed: whitelisted origin ${origin}`);
      callback(null, true);
    } else {
      console.log(`? CORS allowed: development mode - allowing all origins ${origin}`);
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Session configuration for mobile
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'restaurant-mobile-secret-key-2025',
  resave: false,
  saveUninitialized: false,  cookie: {
    secure: process.env.NODE_ENV === 'production', // Secure in production
    httpOnly: false, // Allow client-side access for mobile apps
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // Default 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-origin in production
    domain: undefined // Let browser handle domain
  },
  name: 'restaurant.sid', // Custom session name
  proxy: true // Trust proxy headers for secure cookies
}));

// Mobile-specific middleware
app.use((req, res, next) => {
  // Add mobile-specific headers
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('X-Powered-By', 'Restaurant-Mobile-Backend');
  
  // Explicitly set CORS headers for API routes
  if (req.path.startsWith('/api')) {
    const origin = req.headers.origin;
    if (origin && (origin.includes('fly.io') || origin.includes('localhost'))) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  // Ensure proper cookie handling for cross-origin requests
  if (req.headers.origin && req.headers.origin.includes('localhost')) {
    // For localhost development, ensure cookies are handled properly
    const existingCookies = res.getHeader('Set-Cookie');
    if (existingCookies) {
      res.header('Set-Cookie', existingCookies as string | string[]);
    }
  }
  
  // Log mobile app requests
  if (req.headers['user-agent']?.includes('Mobile') || 
      req.headers.origin?.includes('capacitor') ||
      req.headers.origin?.includes('ionic')) {
    log(`Mobile request: ${req.method} ${req.path} from ${req.headers.origin || 'mobile-app'}`);
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Health check endpoint for mobile apps
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'restaurant-mobile-backend',
    version: '1.0.0'
  });
});

// Mobile-specific API endpoints
app.get('/api/mobile/status', (req, res) => {
  res.json({
    status: 'connected',
    server: 'mobile-backend',
    timestamp: new Date().toISOString(),
    features: {
      printing: true,
      orders: true,
      offline: true,
      bluetooth: true,
      network: true
    }
  });
});

(async () => {
  try {
    // Initialize admin user
    await authService.initializeAdminUser();
    log('Admin user initialized');
    
    // Initialize comprehensive toppings
    await initializeComprehensiveToppings();
    log('Toppings initialized');
    
    // Register CloudPRNT routes
    app.use(cloudPRNTServer.getRouter());
    log('CloudPRNT server initialized');
    
    const server = await registerRoutes(app);
    log('Routes registered');

    // Create HTTP server for WebSocket upgrade
    const httpServer = createServer(app);
    
    // Create WebSocket server
    const wss = new WebSocketServer({ 
      server: httpServer,
      path: '/ws'
    });
    
    // Store connected admin clients
    const adminClients = new Set<any>();
    
    wss.on('connection', (ws, req) => {
      log('WebSocket client connected');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'admin_connect') {
            adminClients.add(ws);
            log('Admin client connected to WebSocket');
            
            ws.send(JSON.stringify({
              type: 'connection_confirmed',
              message: 'Admin connected successfully'
            }));
          }        } catch (error) {
          log(`WebSocket message error: ${error}`);
        }
      });
      
      ws.on('close', () => {
        adminClients.delete(ws);
        log('WebSocket client disconnected');
      });
        ws.on('error', (error) => {
        log(`WebSocket error: ${error.message}`);
        adminClients.delete(ws);
      });
    });
    
    // Broadcast function for real-time updates
    const broadcast = (data: any) => {
      adminClients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(data));
        } else {
          adminClients.delete(client);
        }
      });
    };
    
    // Make broadcast available globally for order updates
    (global as any).broadcastToAdmins = broadcast;

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error ${status}: ${message}`);
      res.status(status).json({ 
        message,
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });

    // Serve static files in production or when requested
    if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
      serveStatic(app);
      log('Static files serving enabled');
    }    // Server configuration for mobile apps
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    const host = process.env.HOST || "0.0.0.0"; // Allow external connections
    
    httpServer.listen(port, host, () => {
      log(`?? Mobile backend serving on http://${host}:${port}`);
      log(`?? Capacitor apps can connect to this server`);
      log(`?? Health check: http://${host}:${port}/health`);
      log(`?? Mobile API: http://${host}:${port}/api/mobile/status`);
      log(`?? WebSocket server running on ws://${host}:${port}/ws`);
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`Port ${port} is in use, trying port ${port + 1}`);
        httpServer.listen(port + 1, host, () => {
          log(`?? Mobile backend serving on http://${host}:${port + 1}`);
          log(`?? WebSocket server running on ws://${host}:${port + 1}/ws`);
        });
      } else {
        log(`Server error: ${err.message}`);
        throw err;
      }
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      log('SIGTERM received, shLahting down gracefully');
      httpServer.close(() => {
        log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
})();
