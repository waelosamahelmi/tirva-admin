import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import cors from "cors";
import connectPgSimple from "connect-pg-simple";
import { db, pool } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { authService } from "./auth";
import { initializeComprehensiveToppings } from "./initialize-toppings";

const app = express();

// CORS configuration for cross-origin requests
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
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
      // Add production domains if needed
      'https://tirva-admin.fly.dev',
      'https://helmies-food-web.fly.io',
      'https://tirvankahvila.fi',
      'http://tirvankahvila.fi',
      // Add any other production frontend domains
    ];
    
    // Allow any localhost with different ports
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow Capacitor schemes
    if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
      return callback(null, true);
    }
    
    // Check against allowed origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In production, be more restrictive
      log(`CORS: Blocked origin: ${origin}`);
      callback(null, process.env.NODE_ENV !== 'production');
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

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || 'tirvan-kahvila-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production
    httpOnly: false, // Allow client access for mobile/web apps
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'), // Default 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-origin in production
    domain: undefined // Let browser handle domain
  },
  proxy: true // Trust proxy headers for secure cookies
}));

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

(async () => {
  // Initialize admin user
  await authService.initializeAdminUser();
  
  // Initialize comprehensive toppings
  await initializeComprehensiveToppings();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // In development, we only serve API routes
  // The frontend runs on its own Vite dev server (port 5174)
  if (app.get("env") !== "development") {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`Port ${port} is in use, trying port ${port + 1}`);
      server.listen(port + 1, "0.0.0.0", () => {
        log(`serving on port ${port + 1}`);
      });
    } else {
      throw err;
    }
  });
})();
