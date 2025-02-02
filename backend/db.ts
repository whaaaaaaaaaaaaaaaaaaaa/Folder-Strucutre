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
  name: string;
  parent_id: number | null;
  parent_path: string | null;
  structure_id: number;
  subfolder_count: number;
  file_count: number;
}

interface StructureRecord extends RowObject {
  id: number;
  name: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

interface UserRecord extends RowObject {
  id: number;
  role: 'viewer' | 'editor';
  password_hash: string | null;
}

interface SessionRecord extends RowObject {
  id: number;
  user_id: number;
  token: string;
  created_at: string;
  expires_at: string;
}

interface FileRecord extends RowObject {
  id: number;
  name: string;
  path: string;
  folder_id: number;
  type: string;
  folder_path: string;
  color: string;
  structure_id: number;
}

interface DbResult {
  changes: number;
  lastInsertId: number | null;
}

interface CommentRecord extends RowObject {
  id: number;
  content: string;
  color: string;
  target_type: 'file' | 'folder';
  target_id: number;
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
}

// Type guard for DbResult
function isDbResult(value: unknown): value is DbResult {
  return typeof value === 'object' && value !== null &&
         'changes' in value && 'lastInsertId' in value;
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
  initializeDatabase: async () => {
    try {
      const database = getDb();

      // Function to get table info
      const getTableInfo = (tableName: string) => {
        console.log(`Table ${tableName} schema:`);
        const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
        console.log(columns);
        return columns;
      };

      console.log("Creating structures table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS structures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(name)
        )
      `).run();

      console.log("Creating users table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')) DEFAULT 'viewer',
          password_hash TEXT
        )
      `).run();

      console.log("Creating sessions table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          expires_at DATETIME NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `).run();

      console.log("Creating folders table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS folders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          parent_id INTEGER,
          structure_id INTEGER NOT NULL,
          level INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
          FOREIGN KEY (structure_id) REFERENCES structures(id) ON DELETE CASCADE,
          UNIQUE(path, structure_id)
        )
      `).run();

      console.log("Creating files table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          path TEXT NOT NULL,
          folder_id INTEGER NOT NULL,
          structure_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#2196F3',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
          FOREIGN KEY (structure_id) REFERENCES structures(id) ON DELETE CASCADE,
          UNIQUE(path, structure_id)
        )
      `).run();

      console.log("Creating or updating comments table");
      try {
        // First try to create the table if it doesn't exist
        database.prepare(`
          CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#FFD700',
            target_type TEXT NOT NULL CHECK (target_type IN ('file', 'folder')),
            target_id INTEGER NOT NULL,
            x INTEGER NOT NULL DEFAULT 0,
            y INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
      } catch (error) {
        console.log("Comments table exists, checking for needed columns");
      }

      // Check current schema
      getTableInfo('comments');

      // Add target_id column if it doesn't exist
      try {
        database.prepare("SELECT target_id FROM comments LIMIT 1").run();
      } catch (error) {
        console.log("Adding target_id column to comments table");
        database.prepare("ALTER TABLE comments ADD COLUMN target_id INTEGER NOT NULL DEFAULT 0").run();
      }

      // Add x and y columns if they don't exist
      try {
        database.prepare("SELECT x, y FROM comments LIMIT 1").run();
      } catch (error) {
        console.log("Adding x and y columns to comments table");
        database.prepare("ALTER TABLE comments ADD COLUMN x INTEGER NOT NULL DEFAULT 0").run();
        database.prepare("ALTER TABLE comments ADD COLUMN y INTEGER NOT NULL DEFAULT 0").run();
      }

      // Check final schema
      console.log("Final comments table schema:");
      getTableInfo('comments');

      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  },

  clearAllData: () => {
    try {
      const database = getDb();
      database.prepare("DELETE FROM files").run();
      database.prepare("DELETE FROM folders").run();
      database.prepare("DELETE FROM comments").run();
      console.log("Cleared all data from database");
    } catch (error) {
      console.error("Error clearing data:", error);
      throw error;
    }
  },

  addFolder: async (params: {
    path: string;
    name: string;
    parentId: number | null;
    structureId: number;
  }): Promise<FolderRecord> => {
    try {
      console.log("Adding folder:", params);
      const database = getDb();
      const stmt = database.prepare(
        "INSERT INTO folders (path, name, parent_id, structure_id) VALUES (?, ?, ?, ?) RETURNING *"
      );
      const result = stmt.all(params.path, params.name, params.parentId, params.structureId) as FolderRecord[];
      if (!result || result.length === 0) {
        throw new Error("Failed to add folder");
      }
      console.log("Added folder successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error adding folder:", error);
      throw error;
    }
  },

  getFolders: (structureId?: number): FolderRecord[] => {
    try {
      const db = getDb();
      let query = `
        WITH RECURSIVE folder_tree AS (
          -- Base case: Get root folders
          SELECT 
            f.id, f.name, f.path, f.parent_id, f.structure_id,
            (SELECT COUNT(*) FROM folders sf WHERE sf.parent_id = f.id) as subfolder_count,
            (SELECT COUNT(*) FROM files ff WHERE ff.folder_id = f.id) as file_count
          FROM folders f
          WHERE f.parent_id IS NULL
          ${structureId ? 'AND f.structure_id = ?' : ''}
          
          UNION ALL
          
          -- Recursive case: Get child folders
          SELECT 
            f.id, f.name, f.path, f.parent_id, f.structure_id,
            (SELECT COUNT(*) FROM folders sf WHERE sf.parent_id = f.id) as subfolder_count,
            (SELECT COUNT(*) FROM files ff WHERE ff.folder_id = f.id) as file_count
          FROM folders f
          JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT * FROM folder_tree
        ORDER BY path;
      `;

      const params = structureId ? [structureId] : [];
      const folders = db.prepare(query).all(...params) as FolderRecord[];

      // Get files for each folder
      for (const folder of folders) {
        const files = dbOps.getFilesByFolderId(folder.id, folder.structure_id);
        folder.files = files;
      }

      return folders;
    } catch (error) {
      console.error('Error getting folders:', error);
      throw error;
    }
  },

  getFolderById: (id: number): FolderRecord | null => {
    try {
      const database = getDb();
      return database.prepare(`
        SELECT f1.*, 
               f2.path as parent_path,
               (SELECT COUNT(*) FROM folders WHERE parent_id = f1.id) as subfolder_count,
               (SELECT COUNT(*) FROM files WHERE folder_id = f1.id) as file_count
        FROM folders f1
        LEFT JOIN folders f2 ON f1.parent_id = f2.id
        WHERE f1.id = ?
      `).get([id]) as FolderRecord | null;
    } catch (error) {
      console.error("Error getting folder by id:", error);
      throw error;
    }
  },

  updateFolder: (id: number, name: string): DbResult => {
    const db = getDb();
    const result = db.prepare(`
      UPDATE folders 
      SET name = ? 
      WHERE id = ?
    `).run(name, id);
    return result;
  },

  addFile: async (file: {
    name: string;
    path: string;
    folderId: number;
    structureId: number;
    type: string;
    color?: string;
  }) => {
    try {
      const database = getDb();
      const stmt = database.prepare(`
        INSERT INTO files (name, path, folder_id, structure_id, type, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.all([
        file.name,
        file.path,
        file.folderId,
        file.structureId,
        file.type,
        file.color || '#000000'
      ]);
      return result;
    } catch (error) {
      console.error("Error adding file:", error);
      throw error;
    }
  },

  getFiles: (structureId?: number): FileRecord[] => {
    try {
      const database = getDb();
      const sql = structureId
        ? `
          SELECT f.*, folders.path as folder_path
          FROM files f
          JOIN folders ON f.folder_id = folders.id
          WHERE f.structure_id = ?
          ORDER BY f.name
        `
        : `
          SELECT f.*, folders.path as folder_path
          FROM files f
          JOIN folders ON f.folder_id = folders.id
          ORDER BY f.name
        `;
      return database.prepare(sql).all(structureId ? [structureId] : []);
    } catch (error) {
      console.error("Error getting files:", error);
      throw error;
    }
  },

  getFilesByFolderId: (folderId: number, structureId: number): FileRecord[] => {
    const database = getDb();
    const files = database.prepare(`
      SELECT f.*, folders.path as folder_path
      FROM files f
      JOIN folders ON f.folder_id = folders.id
      WHERE f.folder_id = ? AND f.structure_id = ?
      ORDER BY f.name
    `).all([folderId, structureId]) as FileRecord[];
    return files;
  },

  updateFileName: (id: number, name: string): DbResult => {
    const database = getDb();
    const result = database.prepare(
      "UPDATE files SET name = ? WHERE id = ?"
    ).run([name, id]);
    return result as unknown as DbResult;
  },

  moveFile: (id: number, newFolderId: number): DbResult => {
    const database = getDb();
    const result = database.prepare(
      "UPDATE files SET folder_id = ? WHERE id = ?"
    ).run([newFolderId, id]);
    return result as unknown as DbResult;
  },

  deleteFile: (id: number): DbResult => {
    const database = getDb();
    const result = database.prepare("DELETE FROM files WHERE id = ?").run([id]);
    return result as unknown as DbResult;
  },

  addComment: async (targetId: number, targetType: 'file' | 'folder', text: string, color: string = '#FFD700', x: number = 0, y: number = 0): Promise<CommentRecord> => {
    try {
      const database = getDb();

      // First verify that the target exists
      if (targetType === 'file') {
        const file = database.prepare("SELECT id FROM files WHERE id = ?").get(targetId);
        if (!file) {
          throw new Error('File not found');
        }
      } else {
        const folder = database.prepare("SELECT id FROM folders WHERE id = ?").get(targetId);
        if (!folder) {
          throw new Error('Folder not found');
        }
      }

      // Insert the comment
      console.log("Inserting comment:", { targetId, targetType, text, color, x, y });
      const result = database.prepare(`
        INSERT INTO comments (content, color, target_type, target_id, x, y)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(text, color, targetType, targetId, x, y);

      if (!isDbResult(result)) {
        throw new Error('Failed to add comment');
      }

      const commentId = result.lastInsertId;
      if (!commentId) {
        throw new Error('Failed to get comment ID');
      }

      // Return the newly created comment
      const comment = database.prepare(`
        SELECT * FROM comments WHERE id = ?
      `).get(commentId) as CommentRecord;

      if (!comment) {
        throw new Error('Failed to retrieve created comment');
      }

      console.log("Created comment:", comment);
      return comment;
    } catch (error) {
      console.error('Error in addComment:', error);
      throw error;
    }
  },

  getComments: (targetId: number, targetType: 'file' | 'folder'): CommentRecord[] => {
    try {
      const database = getDb();
      return database.prepare(`
        SELECT id, content, color, target_type, target_id, created_at, updated_at
        FROM comments
        WHERE target_id = ? AND target_type = ?
        ORDER BY created_at DESC
      `).all(targetId, targetType) as CommentRecord[];
    } catch (error) {
      console.error("Error getting comments:", error);
      throw error;
    }
  },

  updateComment: async (id: number, updates: { content?: string; color?: string }): Promise<void> => {
    try {
      const database = getDb();
      const setClause = Object.entries(updates)
        .map(([key]) => `${key} = ?`)
        .join(', ');
      const values = Object.values(updates);
      
      const sql = `UPDATE comments SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      const result = database.prepare(sql).run([...values, id]) as unknown as DbResult;
      
      if (result.changes === 0) {
        throw new Error("Comment not found");
      }
    } catch (error) {
      console.error("Error updating comment:", error);
      throw error;
    }
  },

  deleteComment: async (id: number): Promise<void> => {
    try {
      const database = getDb();
      const result = database.prepare(
        "DELETE FROM comments WHERE id = ?"
      ).run(id) as unknown as DbResult;
      
      if (result.changes === 0) {
        throw new Error("Comment not found");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      throw error;
    }
  },

  getAllComments: async (targetType?: 'file' | 'folder'): Promise<CommentRecord[]> => {
    try {
      const database = getDb();
      const sql = targetType
        ? "SELECT * FROM comments WHERE target_type = ? ORDER BY created_at DESC"
        : "SELECT * FROM comments ORDER BY created_at DESC";
      
      return database.prepare(sql).all(targetType ? [targetType] : []) as CommentRecord[];
    } catch (error) {
      console.error("Error getting all comments:", error);
      throw error;
    }
  },

  // Structure operations
  createStructure: async (params: { name: string; description: string; position: number }): Promise<number> => {
    try {
      const db = getDb();
      
      // Check if structure with this name already exists
      const existingStructure = db.prepare(`
        SELECT id FROM structures WHERE name = ?
      `).get(params.name) as { id: number } | undefined;

      if (existingStructure) {
        return existingStructure.id;
      }

      // Insert new structure
      const result = db.prepare(`
        INSERT INTO structures (name, description, position)
        VALUES (?, ?, ?)
      `).run(params.name, params.description, params.position);

      // Get the ID of the newly inserted structure
      const newStructure = db.prepare(`
        SELECT id FROM structures WHERE name = ?
      `).get(params.name) as { id: number } | undefined;

      if (!newStructure) {
        throw new Error('Failed to get ID of newly created structure');
      }

      return newStructure.id;
    } catch (error) {
      console.error('Error creating structure:', error);
      throw new Error(`Failed to create structure: ${error.message}`);
    }
  },

  getStructures: () => {
    const database = getDb();
    const structures = database.prepare(
      "SELECT * FROM structures ORDER BY position ASC"
    ).all();
    return structures.map((structure: StructureRecord) => ({
      ...structure,
      folders: database.prepare(
        "SELECT * FROM folders WHERE structure_id = ? ORDER BY path ASC"
      ).all(structure.id)
    }));
  },

  updateStructurePosition: (id: number, position: number): DbResult => {
    try {
      const database = getDb();
      const result = database.prepare(
        "UPDATE structures SET position = ? WHERE id = ?"
      ).run(position, id) as unknown as DbResult;
      return result;
    } catch (error) {
      console.error("Error updating structure position:", error);
      throw error;
    }
  },

  updateStructureName: async (id: number, name: string): Promise<void> => {
    try {
      const database = getDb();
      const result = database.prepare(`
        UPDATE structures 
        SET name = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(name, id);

      if (!result || result.changes === 0) {
        // Check if the structure exists
        const existing = database.prepare(`
          SELECT id FROM structures WHERE id = ?
        `).get(id);
        if (!existing) {
          throw new Error(`Structure with ID ${id} not found`);
        }
        // Otherwise, the update didn't change any data (possibly the same value was provided)
      }
    } catch (error) {
      console.error('Error updating structure name:', error);
      throw error;
    }
  },

  // Find a structure by name
  findStructureByName: async (name: string): Promise<{ id: number; name: string } | undefined> => {
    const db = getDb();
    try {
      const result = db.prepare(`
        SELECT id, name FROM structures WHERE name = ?
      `).get(name) as { id: number; name: string } | undefined;
      
      return result;
    } catch (error) {
      console.error('Error finding structure by name:', error);
      throw error;
    }
  },

  // Clear all folders and files in a structure
  clearStructure: async (structureId: number): Promise<void> => {
    const db = getDb();
    try {
      console.log('Clearing structure:', structureId);
      
      // Delete all files first (due to foreign key constraints)
      db.prepare(`
        DELETE FROM files WHERE structure_id = ?
      `).run(structureId);

      // Then delete all folders
      db.prepare(`
        DELETE FROM folders WHERE structure_id = ?
      `).run(structureId);

      console.log('Structure cleared successfully');
    } catch (error) {
      console.error('Error clearing structure:', error);
      throw error;
    }
  },

  // Delete a structure and all its folders/files
  deleteStructure: async (structureId: number): Promise<void> => {
    const db = getDb();
    try {
      console.log('Deleting structure:', structureId);
      
      // Delete all files first (due to foreign key constraints)
      db.prepare(`
        DELETE FROM files WHERE structure_id = ?
      `).run(structureId);

      // Then delete all folders
      db.prepare(`
        DELETE FROM folders WHERE structure_id = ?
      `).run(structureId);

      // Finally delete the structure
      db.prepare(`
        DELETE FROM structures WHERE id = ?
      `).run(structureId);

      console.log('Structure deleted successfully');
    } catch (error) {
      console.error('Error deleting structure:', error);
      throw error;
    }
  },

  // Get all structures
  getAllStructures: async (): Promise<any[]> => {
    const db = getDb();
    try {
      const structures = db.prepare(`
        SELECT * FROM structures
      `).all();
      return structures;
    } catch (error) {
      console.error('Error getting structures:', error);
      throw error;
    }
  },

  // User operations
  createUser: async (role: 'viewer' | 'editor', passwordHash: string | null): Promise<number> => {
    const db = getDb();
    try {
      const result = db.prepare(`
        INSERT INTO users (role, password_hash)
        VALUES (?, ?)
      `).run(role, passwordHash) as unknown as DbResult;
      
      return result.lastInsertId || 0;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },

  getUserByRole: (role: 'viewer' | 'editor'): UserRecord[] => {
    try {
      const database = getDb();
      return database.prepare(
        "SELECT * FROM users WHERE role = ?"
      ).all(role) as UserRecord[];
    } catch (error) {
      console.error("Error getting users by role:", error);
      throw error;
    }
  },

  // Session operations
  createSession: async (userId: number, token: string, expiresAt: string): Promise<number> => {
    const db = getDb();
    try {
      const result = db.prepare(`
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (?, ?, ?)
      `).run(userId, token, expiresAt) as unknown as DbResult;
      
      return result.lastInsertId || 0;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  },

  getSessionByToken: (token: string): SessionRecord | null => {
    try {
      const database = getDb();
      return database.prepare(
        "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
      ).get(token) as SessionRecord | null;
    } catch (error) {
      console.error("Error getting session:", error);
      throw error;
    }
  },

  deleteExpiredSessions: (): void => {
    try {
      const database = getDb();
      database.prepare(
        "DELETE FROM sessions WHERE expires_at <= datetime('now')"
      ).run();
    } catch (error) {
      console.error("Error deleting expired sessions:", error);
      throw error;
    }
  },

  closeConnection: () => {
    if (db) {
      db.close();
      db = null;
    }
  },

  // Create a new folder
  createFolder: async (name: string, structureId: number, parentId: number | null = null, allowOverwrite: boolean = false): Promise<number> => {
    try {
      const db = getDb();

      // Calculate the path and level
      let path = name;
      let level = 0;

      if (parentId) {
        const parentFolder = db.prepare(`
          SELECT path, level FROM folders WHERE id = ?
        `).get(parentId) as { path: string; level: number } | undefined;

        if (!parentFolder) {
          throw new Error(`Parent folder with ID ${parentId} not found`);
        }

        path = `${parentFolder.path}/${name}`;
        level = parentFolder.level + 1;
      }

      // Check if folder already exists at this path in this structure
      const existingFolder = db.prepare(`
        SELECT id FROM folders 
        WHERE path = ? AND structure_id = ?
      `).get(path, structureId) as { id: number } | undefined;

      if (existingFolder) {
        if (allowOverwrite) {
          // Delete existing folder and all its contents
          await dbOps.clearStructure(structureId);
        } else {
          return existingFolder.id;
        }
      }

      // Insert the new folder
      const result = db.prepare(`
        INSERT INTO folders (name, path, parent_id, structure_id, level)
        VALUES (?, ?, ?, ?, ?)
      `).run(name, path, parentId, structureId, level);

      // Get the ID of the newly inserted folder
      const newFolder = db.prepare(`
        SELECT id FROM folders 
        WHERE path = ? AND structure_id = ?
      `).get(path, structureId) as { id: number } | undefined;

      if (!newFolder) {
        throw new Error('Failed to get ID of newly created folder');
      }

      return newFolder.id;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  },

  // Create a new file
  createFile: async (name: string, folderId: number, structureId: number, allowOverwrite: boolean = false): Promise<number> => {
    const db = getDb();
    try {
      console.log('Creating file with params:', { name, folderId, structureId });

      // First, verify that the folder exists
      const folder = db.prepare(`
        SELECT path FROM folders WHERE id = ? AND structure_id = ?
      `).get(folderId, structureId) as { path: string } | undefined;

      if (!folder) {
        console.error(`Folder with ID ${folderId} not found in structure ${structureId}`);
        throw new Error(`Folder with ID ${folderId} not found in structure ${structureId}`);
      }

      // Create the file path
      const path = `${folder.path}/${name}`.replace(/\/+/g, '/');
      const type = name.split('.').pop() || 'file';

      // Check if file already exists
      const existingFile = db.prepare(`
        SELECT id FROM files 
        WHERE path = ? AND structure_id = ?
      `).get(path, structureId) as { id: number } | undefined;

      if (existingFile) {
        if (allowOverwrite) {
          console.log(`File ${path} already exists, returning existing ID:`, existingFile.id);
          return existingFile.id;
        } else {
          throw new Error(`File with path ${path} already exists in structure ${structureId}`);
        }
      }

      console.log('Creating file with path:', path);

      // Insert the file
      const result = db.prepare(`
        INSERT INTO files (name, path, folder_id, structure_id, type)
        VALUES (?, ?, ?, ?, ?)
        RETURNING id
      `).all(name, path, folderId, structureId, type);

      console.log('Insert result:', result);
      if (!result || !Array.isArray(result) || result.length === 0 || !result[0].id) {
        console.error('Failed to create file. Invalid result:', result);
        throw new Error('Failed to create file');
      }

      console.log('Created file with ID:', result[0].id);
      return result[0].id;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  },
};

// Ensure database is closed when the process exits
globalThis.addEventListener("unload", () => {
  try {
    const db = getDb();
    db.close();
    console.log("Database connection closed");
  } catch (error) {
    console.error("Error closing database:", error);
  }
});
