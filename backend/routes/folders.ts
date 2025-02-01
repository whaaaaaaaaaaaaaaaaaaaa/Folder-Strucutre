import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { dbOps } from "../db.ts";
import { wsManager } from "../websocket.ts";

const router = new Router();

// Get folders by structure ID
router.get("/api/folders", async (ctx) => {
  try {
    const structureId = ctx.request.url.searchParams.get("structureId");
    if (!structureId) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Missing structureId parameter" };
      return;
    }

    const folders = await dbOps.getFolders(parseInt(structureId));
    ctx.response.body = folders;
  } catch (error) {
    console.error("Error getting folders:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to get folders" };
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

// Import folder structure
router.post("/api/folders/import", async (ctx) => {
  try {
    // Check authentication
    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Authentication required" };
      return;
    }

    const body = await ctx.request.body({ type: "json" }).value;
    const path = body.path.replace(/\\/g, "/"); // Normalize path separators
    
    console.log("Importing folder structure from path:", path);
    
    // Validate path exists
    try {
      const stat = await Deno.stat(path);
      if (!stat.isDirectory) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Path is not a directory" };
        return;
      }
    } catch (error) {
      console.error("Error validating path:", error);
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid directory path" };
      return;
    }

    // Get structure name from path
    const structureName = path.split("/").pop() || "Imported Structure";
    console.log("Structure name:", structureName);

    // Check if structure already exists
    let structureId: number;
    const existingStructure = await dbOps.findStructureByName(structureName);
    
    if (existingStructure) {
      console.log("Structure already exists, using existing ID:", existingStructure.id);
      structureId = existingStructure.id;
      
      // Clear existing folders and files for this structure
      await dbOps.clearStructure(structureId);
    } else {
      // Create a new structure for this import
      console.log('Creating new structure');
      try {
        structureId = await dbOps.createStructure({
          name: structureName,
          description: `Imported from ${path}`,
          position: 0
        });

        if (!structureId) {
          ctx.response.status = 500;
          ctx.response.body = { error: 'Failed to create structure' };
          return;
        }
      } catch (error) {
        console.error('Error creating structure:', error);
        ctx.response.status = 500;
        ctx.response.body = { error: `Failed to create structure: ${error.message}` };
        return;
      }
    }

    // Create root folder
    console.log("Creating root folder");
    const rootFolderId = await dbOps.createFolder(
      structureName,
      structureId,
      null,
      true // Allow overwrite
    );

    // Recursively import folders and files
    async function processDirectory(dirPath: string, parentId: number) {
      console.log("Processing directory:", dirPath);
      try {
        for await (const entry of Deno.readDir(dirPath)) {
          const entryPath = `${dirPath}/${entry.name}`;
          
          try {
            if (entry.isDirectory) {
              console.log("Creating folder:", entry.name);
              // Create folder
              const folderId = await dbOps.createFolder(
                entry.name,
                structureId,
                parentId,
                true // Allow overwrite
              );
              // Process subdirectory
              await processDirectory(entryPath, folderId);
            } else if (entry.isFile) {
              console.log("Creating file:", entry.name);
              // Create file
              await dbOps.createFile(
                entry.name,
                parentId,
                structureId,
                true // Allow overwrite
              );
            }
          } catch (error) {
            console.error(`Error processing ${entry.isDirectory ? 'folder' : 'file'} ${entry.name}:`, error);
            // Continue with next entry even if this one fails
            continue;
          }
        }
      } catch (error) {
        console.error("Error processing directory:", dirPath, error);
        throw error;
      }
    }

    // Start processing from root
    await processDirectory(path, rootFolderId);

    ctx.response.body = {
      success: true,
      structureId,
      message: "Folder structure imported successfully"
    };
  } catch (error) {
    console.error("Error importing folder structure:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message || "Failed to import folder structure"
    };
  }
});

// Get all structures
router.get("/structures", async (ctx) => {
  try {
    const structures = await dbOps.getAllStructures();
    ctx.response.body = structures;
  } catch (error) {
    console.error("Error getting structures:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message || "Failed to get structures"
    };
  }
});

// Delete a structure
router.delete("/api/structures/:id", async (ctx) => {
  try {
    // Check authentication
    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Authentication required" };
      return;
    }

    const structureId = parseInt(ctx.params.id);
    if (isNaN(structureId)) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid structure ID" };
      return;
    }

    await dbOps.deleteStructure(structureId);

    ctx.response.body = {
      success: true,
      message: "Structure deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting structure:", error);
    ctx.response.status = 500;
    ctx.response.body = {
      success: false,
      error: error.message || "Failed to delete structure"
    };
  }
});

export { router };
