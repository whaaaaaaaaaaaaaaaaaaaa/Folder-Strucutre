import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { dbOps } from "../db.ts";
import { authMiddleware, login } from "../middleware/auth.ts";
import { wsManager } from "../websocket.ts";

const router = new Router();

// Public routes
router.post("/login", login);

router.get("/folders", async (ctx) => {
  ctx.response.body = await dbOps.getFolders();
});

// Protected routes
router.use(authMiddleware);

// Edit folder name
router.put("/folders/:id", async (ctx) => {
  const id = parseInt(ctx.params.id);
  const body = await ctx.request.body({ type: "json" }).value;
  const { name } = body;

  try {
    await dbOps.updateFolderName(id, name);
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Move folder
router.put("/folders/:id/move", async (ctx) => {
  const id = parseInt(ctx.params.id);
  const body = await ctx.request.body({ type: "json" }).value;
  const { parent_id } = body;

  try {
    await dbOps.moveFolder(id, parent_id);
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Delete folder
router.delete("/folders/:id", async (ctx) => {
  const id = parseInt(ctx.params.id);

  try {
    await dbOps.deleteFolder(id);
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Get all files
router.get("/api/files", async (ctx) => {
  try {
    ctx.response.body = await dbOps.getFiles();
  } catch (error) {
    console.error("Error getting files:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Create file
router.post("/api/files", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const file = await dbOps.addFile(body.name, body.folder_id);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = file;
  } catch (error) {
    console.error("Error creating file:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Update file
router.put("/api/files/:id", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    await dbOps.updateFile(id, body);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Error updating file:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Move file
router.put("/api/files/:id/move", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    const body = await ctx.request.body({ type: "json" }).value;
    await dbOps.moveFile(id, body.folder_id);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Error moving file:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Delete file
router.delete("/api/files/:id", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    await dbOps.deleteFile(id);
    wsManager.notifyRefresh(); // Notify all clients
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

export { router };
