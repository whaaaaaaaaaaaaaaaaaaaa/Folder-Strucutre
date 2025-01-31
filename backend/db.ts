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

      console.log("Creating structures table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS structures (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
          FOREIGN KEY (user_id) REFERENCES users(id)
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
          FOREIGN KEY (parent_id) REFERENCES folders(id),
          FOREIGN KEY (structure_id) REFERENCES structures(id),
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
          color TEXT DEFAULT '#000000',
          FOREIGN KEY (folder_id) REFERENCES folders(id),
          FOREIGN KEY (structure_id) REFERENCES structures(id),
          UNIQUE(path, structure_id)
        )
      `).run();

      console.log("Creating comments table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          color TEXT DEFAULT '#FFD700',
          target_type TEXT NOT NULL CHECK (target_type IN ('file', 'folder')),
          target_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (target_id)
            REFERENCES files(id)
            ON DELETE CASCADE
            WHEN target_type = 'file',
          FOREIGN KEY (target_id)
            REFERENCES folders(id)
            ON DELETE CASCADE
            WHEN target_type = 'folder'
        )
      `).run();

      console.log("Creating expanded_folders table if not exists");
      database.prepare(`
        CREATE TABLE IF NOT EXISTS expanded_folders (
          user_id INTEGER NOT NULL,
          folder_id INTEGER NOT NULL,
          structure_id INTEGER NOT NULL,
          PRIMARY KEY (user_id, folder_id, structure_id),
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (folder_id) REFERENCES folders(id),
          FOREIGN KEY (structure_id) REFERENCES structures(id)
        )
      `).run();

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
      console.log("Getting all folders");
      const database = getDb();
      const result = database.prepare(`
        WITH RECURSIVE folder_tree AS (
          -- Base case: root folders (no parent)
          SELECT 
            f.id, f.path, f.name, f.parent_id,
            f.path as full_path,
            0 as level
          FROM folders f
          WHERE f.parent_id IS NULL
          
          UNION ALL
          
          -- Recursive case: child folders
          SELECT 
            f.id, f.path, f.name, f.parent_id,
            ft.full_path || '/' || f.name as full_path,
            ft.level + 1 as level
          FROM folders f
          JOIN folder_tree ft ON f.parent_id = ft.id
        )
        SELECT 
          ft.*,
          (SELECT COUNT(*) FROM folders WHERE parent_id = ft.id) as subfolder_count,
          json_group_array(
            json_object(
              'id', COALESCE(f.id, NULL),
              'name', f.name,
              'type', f.type
            )
          ) as files
        FROM folder_tree ft
        LEFT JOIN files f ON f.folder_id = ft.id
        GROUP BY ft.id
        ORDER BY ft.level, ft.full_path
      `).all() as (FolderRecord & { files: string })[];

      // Parse the JSON string of files into an array and filter out null entries
      const folders = result.map(record => ({
        ...record,
        files: JSON.parse(record.files).filter((f: any) => f.id !== null)
      }));
      
      console.log("Retrieved folders:", folders.length);
      return folders;
    } catch (error) {
      console.error("Error getting folders:", error);
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
    try {
      const database = getDb();
      const folder = database.prepare("SELECT * FROM folders WHERE id = ?").get([id]) as FolderRecord;
      if (!folder) throw new Error("Folder not found");

      const parentPath = folder.path.substring(0, folder.path.lastIndexOf('/') + 1);
      const newPath = parentPath + name;
      
      const result = database.prepare(
        "UPDATE folders SET path = ?, name = ? WHERE id = ?"
      ).run([newPath, name, id]);

      return result as unknown as DbResult;
    } catch (error) {
      console.error("Error updating folder:", error);
      throw error;
    }
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

  addComment: async (targetId: number, targetType: 'file' | 'folder', content: string, color: string = '#FFD700'): Promise<CommentRecord> => {
    try {
      console.log("Adding comment:", { targetId, targetType, content, color });
      const database = getDb();
      
      const stmt = database.prepare(
        "INSERT INTO comments (target_id, target_type, content, color) VALUES (?, ?, ?, ?) RETURNING *"
      );
      const result = stmt.all(targetId, targetType, content, color) as CommentRecord[];
      
      if (!result || result.length === 0) {
        throw new Error("Failed to add comment");
      }

      console.log("Added comment successfully:", result[0]);
      return result[0];
    } catch (error) {
      console.error("Error adding comment:", error);
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
  createStructure: async (name: string, description: string | null, position: number): Promise<number> => {
    const db = getDb();
    try {
      const result = db.prepare(`
        INSERT INTO structures (name, description, position)
        VALUES (?, ?, ?)
      `).run(name, description, position) as unknown as DbResult;
      
      return result.lastInsertId || 0;
    } catch (error) {
      console.error("Error creating structure:", error);
      throw error;
    }
  },

  getStructures: (): StructureRecord[] => {
    try {
      const database = getDb();
      return database.prepare(`
        SELECT * FROM structures ORDER BY position
      `).all() as StructureRecord[];
    } catch (error) {
      console.error("Error getting structures:", error);
      throw error;
    }
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
  createFolder: async (name: string, structureId: number, parentId: number | null): Promise<number> => {
    const db = getDb();
    try {
      const parentFolder = parentId ? await dbOps.getFolderById(parentId) : null;
      const path = parentFolder ? `${parentFolder.path}/${name}` : name;
      
      const result = db.prepare(`
        INSERT INTO folders (name, path, parent_id, structure_id)
        VALUES (?, ?, ?, ?)
      `).run(name, path, parentId, structureId) as unknown as DbResult;
      
      return result.lastInsertId || 0;
    } catch (error) {
      console.error("Error creating folder:", error);
      throw error;
    }
  },

  // Create a new file
  createFile: async (name: string, folderId: number, structureId: number, color?: string): Promise<number> => {
    const db = getDb();
    try {
      const folder = await dbOps.getFolderById(folderId);
      if (!folder) {
        throw new Error("Folder not found");
      }

      const path = `${folder.path}/${name}`;
      const type = name.split('.').pop() || '';
      
      const result = db.prepare(`
        INSERT INTO files (name, path, folder_id, structure_id, type, color)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(name, path, folderId, structureId, type, color || '#000000') as unknown as DbResult;
      
      return result.lastInsertId || 0;
    } catch (error) {
      console.error("Error creating file:", error);
      throw error;
    }
  },
};

// Ensure database is closed when the process exits
globalThis.addEventListener("unload", () => {
  dbOps.closeConnection();
});
