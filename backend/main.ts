import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { ensureDir } from "https://deno.land/std@0.177.0/fs/mod.ts";
import { dirname, join } from "https://deno.land/std@0.177.0/path/mod.ts";
import { router as foldersRouter } from "./routes/folders.ts";
import { router as filesRouter } from "./routes/files.ts";
import { router as commentsRouter } from "./routes/comments.ts";
import { dbOps, closeDb } from "./db.ts";
import { load } from "./env.ts";
import { verify } from "https://deno.land/x/djwt@v2.8/mod.ts"; // Import verify from djwt with full URL

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
    ctx.response.body = {
      success: false,
      error: err.message || "Internal server error",
      path: ctx.request.url.pathname,
    };
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

// CORS middleware
app.use(oakCors({
  origin: ["http://localhost:3000", "http://192.168.50.8:3000"],
  credentials: true,
}));

// Load environment variables
try {
  const env = await load();
  console.log("Loaded environment variables:", {
    ADMIN_PASSWORD: env.ADMIN_PASSWORD ? "[HIDDEN]" : "undefined",
    JWT_SECRET: env.JWT_SECRET ? "[HIDDEN]" : "undefined"
  });
  
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

// Create a new router for API endpoints
const apiRouter = new Router();

const router = new Router()
  .get("/api/structures", async (ctx) => {
    try {
      const structures = await dbOps.getStructures();
      ctx.response.body = structures;
    } catch (error) {
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to load structures" };
    }
  })
  .patch("/structures/:id", async (ctx) => {
    try {
      const id = parseInt(ctx.params.id);
      if (isNaN(id)) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid structure ID" };
        return;
      }

      const body = await ctx.request.body();
      if (body.type !== "json") {
        ctx.response.status = 400;
        ctx.response.body = { error: "Content-Type must be application/json" };
        return;
      }

      const { name } = await body.value;
      if (!name || typeof name !== "string") {
        ctx.response.status = 400;
        ctx.response.body = { error: "Name is required and must be a string" };
        return;
      }

      await dbOps.updateStructureName(id, name);
      ctx.response.status = 200;
      ctx.response.body = { success: true };
    } catch (error) {
      console.error("Error updating structure:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to update structure" };
    }
  })
  // Import endpoint
  .post('/import', async (ctx) => {
    const { path } = await ctx.request.body().value;

    // Validate path
    if (!path || typeof path !== 'string') {
      ctx.response.status = 400;
      ctx.response.body = { error: 'Invalid path' };
      return;
    }

    try {
      // Check if path exists
      const stat = await Deno.stat(path);
      if (!stat.isDirectory) {
        ctx.response.status = 400;
        ctx.response.body = { error: 'Path is not a directory' };
        return;
      }

      // Create structure
      const structureId = await dbOps.createStructure(
        path.split(/[\\/]/).pop() || 'Imported Structure',
        `Imported from ${path}`,
        0
      );

      // Recursively import folders and files
      const importFolder = async (dirPath: string, parentId: number | null = null, level = 0) => {
        // Import current folder
        const folderId = await dbOps.createFolder(
          dirPath.split(/[\\/]/).pop() || 'Root',
          structureId,
          parentId
        );

        // Import files
        for await (const entry of Deno.readDir(dirPath)) {
          if (entry.isFile) {
            await dbOps.createFile(
              entry.name,
              folderId,
              structureId,
              '#000000'
            );
          } else if (entry.isDirectory) {
            await importFolder(
              join(dirPath, entry.name),
              folderId,
              level + 1
            );
          }
        }
      };

      await importFolder(path);

      ctx.response.status = 200;
      ctx.response.body = { success: true, structureId };
    } catch (error) {
      console.error('Import error:', error);
      ctx.response.status = 500;
      ctx.response.body = { error: 'Failed to import folder structure' };
    }
  });

apiRouter.use(router.routes());
apiRouter.use(router.allowedMethods());

// Use the routers
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

app.use(foldersRouter.routes());
app.use(foldersRouter.allowedMethods());

app.use(filesRouter.routes());
app.use(filesRouter.allowedMethods());

app.use(commentsRouter.routes());
app.use(commentsRouter.allowedMethods());

// Static file serving
app.use(async (ctx) => {
  try {
    await ctx.send({
      root: `${Deno.cwd()}/../frontend/dist`,
      index: "index.html",
    });
  } catch {
    await ctx.send({
      root: `${Deno.cwd()}/../frontend`,
      index: "index.html",
    });
  }
});

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
console.log(`Server running on http://0.0.0.0:${port}`);
await app.listen({ port, hostname: "0.0.0.0" });
