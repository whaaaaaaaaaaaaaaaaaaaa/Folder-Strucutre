import { Application } from "./deps.ts";
import { dbOps, closeDb } from "./db.ts";
import { load } from "./env.ts";

// Import routes
import foldersRouter from "./routes/folders.ts";
import filesRouter from "./routes/files.ts";

const app = new Application();

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Server error:", {
      message: err.message,
      stack: err.stack,
      status: err.status,
      path: ctx.request.url.pathname,
      method: ctx.request.method,
    });
    
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.status = err.status || 500;
    ctx.response.body = JSON.stringify({
      success: false,
      error: err.message || "Internal server error",
      path: ctx.request.url.pathname,
    });
  }
});

// CORS middleware
app.use(async (ctx, next) => {
  // Set CORS headers
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  ctx.response.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  ctx.response.headers.set(
    "Access-Control-Max-Age",
    "3600"
  );

  // Handle CORS preflight
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204; // No content
    return;
  }

  try {
    await next();
  } catch (error) {
    console.error("CORS middleware error:", error);
    throw error;
  }
});

// Log all requests
app.use(async (ctx, next) => {
  console.log(`${ctx.request.method} ${ctx.request.url.pathname}`);
  console.log("Request headers:", ctx.request.headers);
  await next();
  console.log(`Response status: ${ctx.response.status}`);
});

// Body parsing middleware
app.use(async (ctx, next) => {
  if (!ctx.request.hasBody) {
    await next();
    return;
  }

  const contentType = ctx.request.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    try {
      await next();
    } catch (err) {
      console.error("JSON parsing error:", err);
      ctx.response.status = 400;
      ctx.response.body = {
        success: false,
        error: "Invalid JSON payload"
      };
    }
  } else {
    await next();
  }
});

// Load environment variables
try {
  const env = await load();
  console.log("Environment variables loaded successfully");
  
  // Make env available to the application
  app.state.env = env;
} catch (error) {
  console.error("Failed to load environment variables:", error);
  Deno.exit(1);
}

// Initialize database
try {
  await dbOps.initializeDatabase();
  console.log("Database initialized successfully");
} catch (error) {
  console.error("Failed to initialize database:", error);
  Deno.exit(1);
}

// Routes
app.use(foldersRouter.routes());
app.use(foldersRouter.allowedMethods());

app.use(filesRouter.routes());
app.use(filesRouter.allowedMethods());

// Handle shutdown gracefully
async function shutdown() {
  console.log("Shutting down...");
  await closeDb();
  Deno.exit(0);
}

// Listen for shutdown signals (Windows only supports SIGINT)
Deno.addSignalListener("SIGINT", shutdown);

// Start server
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
