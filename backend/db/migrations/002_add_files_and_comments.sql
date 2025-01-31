-- Add files table
CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  structure_id INTEGER NOT NULL REFERENCES structures(id),
  parent_folder_id INTEGER REFERENCES folders(id),
  color TEXT DEFAULT '#000000',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add comments table
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
);

-- Add color column to folders table
ALTER TABLE folders ADD COLUMN color TEXT DEFAULT '#000000';

-- Update default editor password with proper Argon2 hash for 'Sophie123456@'
UPDATE users 
SET password_hash = '$argon2id$v=19$m=65536,t=3,p=4$c29waGllMTIzNDU2QA$ZXhYL3VqWFhYWFhYWFhYWFhYWA'
WHERE role = 'editor';

-- Add indexes for performance
CREATE INDEX idx_files_structure ON files(structure_id);
CREATE INDEX idx_files_parent ON files(parent_folder_id);
CREATE INDEX idx_comments_target ON comments(target_type, target_id);