import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { wsManager } from "./websocket.ts";

const app = new Application();
const router = new Router();

// CORS middleware
app.use(oakCors());

// WebSocket upgrade middleware
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname === "/ws") {
    if (!ctx.isUpgradable) {
      ctx.throw(501);
    }
    const ws = await ctx.upgrade();
    wsManager.addClient(ws);
  } else {
    await next();
  }
});

// API routes
import "./routes/folders.ts";
import "./routes/files.ts";
import "./routes/comments.ts";

// Static file serving
app.use(async (ctx) => {
  try {
    await ctx.send({
      root: `${Deno.cwd()}/frontend/dist`,
      index: "index.html",
    });
  } catch {
    await ctx.send({
      root: `${Deno.cwd()}/frontend`,
      index: "index.html",
    });
  }
});

// Start server
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
