import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { dbOps } from "../db.ts";
import { authMiddleware, login } from "../middleware/auth.ts";

const router = new Router();

// Public routes
router.post("/login", login);

router.get("/folders", async (ctx) => {
  ctx.response.body = await dbOps.getFolders();
});

router.get("/files", async (ctx) => {
  ctx.response.body = await dbOps.getFiles();
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

// Edit file name
router.put("/files/:id", async (ctx) => {
  const id = parseInt(ctx.params.id);
  const body = await ctx.request.body({ type: "json" }).value;
  const { name } = body;

  try {
    await dbOps.updateFileName(id, name);
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Move file
router.put("/files/:id/move", async (ctx) => {
  const id = parseInt(ctx.params.id);
  const body = await ctx.request.body({ type: "json" }).value;
  const { folder_id } = body;

  try {
    await dbOps.moveFile(id, folder_id);
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Delete file
router.delete("/files/:id", async (ctx) => {
  const id = parseInt(ctx.params.id);

  try {
    await dbOps.deleteFile(id);
    ctx.response.body = { success: true };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

export default router;
