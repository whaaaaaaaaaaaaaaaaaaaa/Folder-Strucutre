// Database connection
import { Database } from "jsr:@db/sqlite@0.12";
import { ensureDirSync } from "std/fs/ensure_dir.ts";
import { join } from "std/path/mod.ts";

let db: Database | null = null;

// Type definitions
interface RowObject {
  [key: string]: string | number | null;
}

interface FolderRecord extends RowObject {
  id: number;
  path: string;
  parent_id: number | null;
}

interface FileRecord extends RowObject {
  id: number;
  name: string;
  folder_id: number;
  type: string;
}

// Get database connection
function getDb(): Database {
  if (!db) {
    // Ensure db directory exists
    ensureDirSync("./db");
    const dbPath = join("db", "file_structure.db");
    
    db = new Database(dbPath);
    // Set pragmas for better performance and reliability
    db.prepare("PRAGMA journal_mode = WAL").run();
    db.prepare("PRAGMA synchronous = NORMAL").run();
    db.prepare("PRAGMA foreign_keys = ON").run();
  }
  return db;
}

// Close database connection
export function closeDb() {
  if (db) {
    try {
      db.close();
      db = null;
    } catch (error) {
      console.error("Error closing database:", error);
    }
  }
}

// Database operations with connection management
export const dbOps = {
  // Initialize database and create tables
  initializeDatabase: () => {
    try {
      // Get or create database connection
      const database = getDb();

      // Drop existing tables if they exist
      database.prepare("DROP TABLE IF EXISTS files").run();
      database.prepare("DROP TABLE IF EXISTS folders").run();

      console.log("Creating folders table");
      database.prepare(`
        CREATE TABLE folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          path TEXT NOT NULL,
          parent_id INTEGER,
          FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
        )
      `).run();

      console.log("Creating files table");
      database.prepare(`
        CREATE TABLE files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          folder_id INTEGER NOT NULL,
          type TEXT,
          FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
        )
      `).run();

      // Create indexes for better performance
      database.prepare("CREATE INDEX idx_folders_parent_id ON folders(parent_id)").run();
      database.prepare("CREATE INDEX idx_files_folder_id ON files(folder_id)").run();
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  },

  // Folder operations
  addFolder: async (params: { path: string; parentId: number | null }): Promise<FolderRecord> => {
    try {
      const database = getDb();
      const stmt = database.prepare(
        "INSERT INTO folders (path, parent_id) VALUES (?, ?) RETURNING *"
      );
      const result = stmt.all<{ id: number; path: string; parent_id: number | null }>([params.path, params.parentId]);
      return result[0] || null;
    } catch (error) {
      console.error("Error in addFolder:", error);
      throw error;
    }
  },

  getFolders: (): FolderRecord[] => {
    const database = getDb();
    return database.prepare("SELECT * FROM folders ORDER BY path").all<{
      id: number;
      path: string;
      parent_id: number | null;
    }>();
  },

  updateFolderName: (id: number, name: string) => {
    const database = getDb();
    const folder = database.prepare("SELECT * FROM folders WHERE id = ?").get([id]);
    if (!folder) throw new Error("Folder not found");

    const newPath = folder.path.replace(/[^/\\]*$/, name);
    return database.prepare(
      "UPDATE folders SET path = ? WHERE id = ?"
    ).run([newPath, id]);
  },

  moveFolder: (id: number, newParentId: number | null) => {
    const database = getDb();
    return database.prepare(
      "UPDATE folders SET parent_id = ? WHERE id = ?"
    ).run([newParentId, id]);
  },

  deleteFolder: (id: number) => {
    const database = getDb();
    return database.prepare("DELETE FROM folders WHERE id = ?").run([id]);
  },

  // File operations
  addFile: (name: string, folderId: number, type: string): FileRecord => {
    const database = getDb();
    const stmt = database.prepare(
      "INSERT INTO files (name, folder_id, type) VALUES (?, ?, ?) RETURNING *"
    );
    const result = stmt.all<{ id: number; name: string; folder_id: number; type: string }>([name, folderId, type]);
    return result[0] || null;
  },

  getFiles: (): FileRecord[] => {
    const database = getDb();
    return database.prepare("SELECT * FROM files ORDER BY name").all<{
      id: number;
      name: string;
      folder_id: number;
      type: string;
    }>();
  },

  getFilesByFolderId: (folderId: number): FileRecord[] => {
    const database = getDb();
    return database.prepare("SELECT * FROM files WHERE folder_id = ? ORDER BY name").all<{
      id: number;
      name: string;
      folder_id: number;
      type: string;
    }>([folderId]);
  },

  updateFileName: (id: number, name: string) => {
    const database = getDb();
    return database.prepare(
      "UPDATE files SET name = ? WHERE id = ?"
    ).run([name, id]);
  },

  moveFile: (id: number, newFolderId: number) => {
    const database = getDb();
    return database.prepare(
      "UPDATE files SET folder_id = ? WHERE id = ?"
    ).run([newFolderId, id]);
  },

  deleteFile: (id: number) => {
    const database = getDb();
    return database.prepare("DELETE FROM files WHERE id = ?").run([id]);
  },

  closeConnection: () => {
    if (db) {
      db.close();
      db = null;
    }
  }
};

// Ensure database is closed when the process exits
globalThis.addEventListener("unload", () => {
  dbOps.closeConnection();
});
