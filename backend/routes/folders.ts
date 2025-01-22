import { Router, RouterContext } from "../deps.ts";
import { dbOps } from "../db.ts";
import { authMiddleware } from "../middleware/auth.ts"; // Assuming authMiddleware is defined in this file

const router = new Router();

interface FolderRequest {
  path: string;
  parentId?: number;
}

// Get all folders
router.get("/folders", async (ctx: RouterContext<string>) => {
  try {
    const folders = dbOps.getFolders();
    ctx.response.status = 200;
    ctx.response.body = folders;
  } catch (error) {
    console.error("Get folders error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to get folders" };
  }
});

// Get folder by ID
router.get("/folder/:id", async (ctx: RouterContext<string>) => {
  try {
    const { id } = ctx.params;
    const folder = dbOps.getFolderById(parseInt(id));
    
    if (!folder) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Folder not found" };
      return;
    }

    ctx.response.status = 200;
    ctx.response.body = folder;
  } catch (error) {
    console.error("Get folder error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to get folder" };
  }
});

// Create folder
router.post("/folder", async (ctx: RouterContext<string>) => {
  try {
    const body = ctx.request.body({ type: "json" });
    const { path, parentId } = await body.value as FolderRequest;
    
    if (!path) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Path is required" };
      return;
    }

    const result = dbOps.addFolder(path, parentId || null);
    ctx.response.status = 201;
    ctx.response.body = { id: result?.[0] };
  } catch (error) {
    console.error("Create folder error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to create folder" };
  }
});

// Update folder
router.put("/folder/:id", async (ctx: RouterContext<string>) => {
  try {
    const { id } = ctx.params;
    const body = ctx.request.body({ type: "json" });
    const { path } = await body.value as FolderRequest;
    
    if (!path) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Path is required" };
      return;
    }

    dbOps.updateFolder(parseInt(id), path);
    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Update folder error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to update folder" };
  }
});

// Delete folder
router.delete("/folder/:id", async (ctx: RouterContext<string>) => {
  try {
    const { id } = ctx.params;
    // First delete all files in the folder
    const files = dbOps.getFiles(parseInt(id)) as Array<{ id: number }>;
    for (const file of files) {
      if (typeof file.id === 'number') {
        dbOps.deleteFile(file.id);
      }
    }
    
    // Then delete the folder
    dbOps.deleteFolder(parseInt(id));
    ctx.response.status = 200;
    ctx.response.body = { success: true };
  } catch (error) {
    console.error("Delete folder error:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to delete folder" };
  }
});

// Protected routes
router.use(authMiddleware);

router.post("/import-directory", async (ctx) => {
  console.log("=== Import Directory Request ===");
  console.log("Request URL:", ctx.request.url.toString());
  console.log("Request method:", ctx.request.method);
  
  try {
    // Parse request body
    const bodyResult = ctx.request.body({ type: "json" });
    const body = await bodyResult.value;
    console.log("Request body:", body);
    
    const { path } = body;
    if (!path) {
      const response = {
        success: false,
        error: "Path is required"
      };
      console.log("Sending response:", response);
      ctx.response.status = 400;
      ctx.response.body = response;
      return;
    }

    // Normalize path
    const normalizedPath = path.replace(/\\/g, '/');
    console.log("Normalized path:", normalizedPath);

    // Check directory exists and get stats
    let dirInfo;
    try {
      dirInfo = await Deno.stat(normalizedPath);
      if (!dirInfo.isDirectory) {
        throw new Error("Path must be a directory");
      }
    } catch (error) {
      const response = {
        success: false,
        error: `Directory does not exist or is not accessible: ${normalizedPath}`
      };
      console.log("Sending response:", response);
      ctx.response.status = 400;
      ctx.response.body = response;
      return;
    }

    // Initialize database
    await dbOps.initializeDatabase();

    // Add root folder
    const rootFolder = await dbOps.addFolder({ path: normalizedPath, parentId: null });
    if (!rootFolder) {
      const response = {
        success: false,
        error: "Failed to create root folder"
      };
      console.log("Sending response:", response);
      ctx.response.status = 500;
      ctx.response.body = response;
      return;
    }

    // Read directory contents using async iterator
    const entries = [];
    try {
      for await (const entry of Deno.readDir(normalizedPath)) {
        // Get additional info for each entry
        const entryPath = `${normalizedPath}/${entry.name}`;
        const entryInfo = await Deno.stat(entryPath);
        
        entries.push({
          name: entry.name,
          isDirectory: entry.isDirectory,
          size: entryInfo.size,
          modified: entryInfo.mtime,
          created: entryInfo.birthtime,
        });

        // If it's a directory, add it to the database
        if (entry.isDirectory) {
          await dbOps.addFolder({
            path: entryPath,
            parentId: rootFolder.id,
          });
        } else {
          // If it's a file, add it to the database
          await dbOps.addFile(
            entry.name,
            rootFolder.id,
            entry.name.split('.').pop() || ''
          );
        }
      }
    } catch (error) {
      console.error("Error reading directory contents:", error);
      const response = {
        success: false,
        error: `Failed to read directory contents: ${error.message}`
      };
      ctx.response.status = 500;
      ctx.response.body = response;
      return;
    }

    // Success response
    const response = {
      success: true,
      message: "Directory imported successfully",
      data: {
        rootFolder,
        path: normalizedPath,
        entries: entries,
        stats: {
          totalEntries: entries.length,
          directories: entries.filter(e => e.isDirectory).length,
          files: entries.filter(e => !e.isDirectory).length,
        }
      }
    };
    console.log("Sending success response");
    ctx.response.status = 200;
    ctx.response.body = response;
  } catch (error) {
    console.error("Import error:", error);
    const response = {
      success: false,
      error: error.message || "Internal server error"
    };
    console.log("Sending error response:", response);
    ctx.response.status = 500;
    ctx.response.body = response;
  }
});

export default router;
