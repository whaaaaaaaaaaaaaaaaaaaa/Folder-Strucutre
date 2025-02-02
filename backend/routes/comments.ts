import { Router } from "https://deno.land/x/oak/mod.ts";
import { dbOps } from "../db.ts";
import { wsManager } from "../websocket.ts";

const router = new Router();

// Public routes
router.get("/api/comments", async (ctx) => {
  try {
    ctx.response.body = await dbOps.getAllComments();
  } catch (error) {
    console.error("Error getting all comments:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

router.get("/api/comments/:itemId", async (ctx) => {
  try {
    const itemId = parseInt(ctx.params.itemId);
    ctx.response.body = await dbOps.getComments(itemId);
  } catch (error) {
    console.error("Error getting comments:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Protected routes
// router.use(authMiddleware);

// Add comment
router.post("/api/comments", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    console.log("Received comment data:", body);

    // Validate required fields
    if (!body.text || !body.target_type || !body.target_id) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Missing required fields" };
      return;
    }

    // Validate target_type
    if (body.target_type !== 'file' && body.target_type !== 'folder') {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid target_type" };
      return;
    }

    const comment = await dbOps.addComment(
      body.target_id,
      body.target_type,
      body.text,
      body.color || "#FFD700",
      body.x || 0,
      body.y || 0
    );

    wsManager.notifyComment(body.target_id);
    ctx.response.body = comment;
  } catch (error) {
    console.error("Error adding comment:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Delete comment
router.delete("/api/comments/:id", async (ctx) => {
  try {
    const id = parseInt(ctx.params.id);
    const comment = await dbOps.getComment(id);
    await dbOps.deleteComment(id);
    if (comment) {
      wsManager.notifyComment(comment.item_id); // Notify clients about deleted comment
    }
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Error deleting comment:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

export { router };
