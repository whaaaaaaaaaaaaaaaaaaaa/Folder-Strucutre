import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { dbOps } from "../db.ts";
import { wsManager } from "../websocket.ts";

const router = new Router();

// Get all folders
router.get("/api/folders", async (ctx) => {
  try {
    ctx.response.body = await dbOps.getFolders();
  } catch (error) {
    console.error("Error getting folders:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Create folder
router.post("/api/folders", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const folder = await dbOps.addFolder(body.name, body.parent_id);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = folder;
  } catch (error) {
    console.error("Error creating folder:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Update folder
router.put("/api/folders/:id", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    await dbOps.updateFolder(id, body);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Error updating folder:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Move folder
router.put("/api/folders/:id/move", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    await dbOps.moveFolder(id, body.parent_id);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Error moving folder:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Delete folder
router.delete("/api/folders/:id", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    await dbOps.deleteFolder(id);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Error deleting folder:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

export { router };
