-- Add structures table to support multiple folder structures
CREATE TABLE IF NOT EXISTS structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  position INTEGER NOT NULL DEFAULT 0 -- Position in the grid (0-3 for up to 4 structures)
);

-- Add structure_id to folders table
ALTER TABLE folders ADD COLUMN structure_id INTEGER REFERENCES structures(id);

-- Add users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor')) DEFAULT 'viewer',
  password_hash TEXT -- Only for editors
);

-- Add sessions table for real-time collaboration
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

-- Add expanded_folders table to track per-user folder states
CREATE TABLE IF NOT EXISTS expanded_folders (
  user_id INTEGER NOT NULL REFERENCES users(id),
  folder_id INTEGER NOT NULL REFERENCES folders(id),
  structure_id INTEGER NOT NULL REFERENCES structures(id),
  PRIMARY KEY (user_id, folder_id, structure_id)
);

-- Add default editor user with password 'Sophie123456@'
INSERT INTO users (role, password_hash) 
VALUES ('editor', '$argon2id$v=19$m=65536,t=2,p=1$c29waGllMTIzNDU2QA$hashed_password_here');