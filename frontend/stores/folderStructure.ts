import { defineStore } from 'pinia'

export interface File {
  id: number
  name: string
  type: 'file'
  color: string
  structure_id: number
}

export interface Folder {
  id: number
  name: string
  path: string
  level: number
  parent_id: number | null
  structure_id: number
  subfolder_count: number
  files: File[]
  type: 'folder'
  color: string
}

export type FolderItem = File | Folder

export interface Comment {
  id: number
  content: string
  color: string
  target_type: 'file' | 'folder'
  target_id: number
  created_at: string
  updated_at: string
}

interface Structure {
  id: number
  name: string
  description: string | null
  position: number
  created_at: string
  updated_at: string
}

interface State {
  structures: Structure[]
  selectedStructure: Structure | null
  folders: { [structureId: number]: Folder[] }
  selectedItem: FolderItem | null
  expandedFolders: { [structureId: number]: Set<number> }
  comments: Comment[]
  isLoggedIn: boolean
  authToken: string
  currentUserId: number | null
  isDragging: boolean
  draggedItem: FolderItem | null
}

const API_URL = 'http://localhost:8000';

export const useFolderStructureStore = defineStore('folderStructure', {
  state: () => ({
    structures: [] as Structure[],
    selectedStructure: null as Structure | null,
    folders: {} as { [key: number]: Folder[] },
    selectedItem: null as (Folder | File) | null,
    expandedFolders: {} as { [key: number]: Set<number> },
    comments: [] as Comment[],
    isLoggedIn: false,
    authToken: '',
    currentUserId: null as number | null,
    isDragging: false,
    draggedItem: null as (Folder | File) | null,
  }),

  getters: {
    rootFolders: (state) => (structureId: number) =>
      (state.folders[structureId] || []).filter((folder: Folder) => !folder.parent_id),
    
    getItemComments: (state) => (itemId: number, type: 'file' | 'folder') =>
      state.comments.filter((comment: Comment) =>
        comment.target_id === itemId && comment.target_type === type
      ),

    getFileComments: (state) => (structureId: number, fileId: number) => {
      const folders = state.folders[structureId] || []
      const files = folders.flatMap((f: Folder) => f.files || [])
      const file = files.find((f: File) => f.id === fileId)
      return file ? state.comments.filter((c: Comment) =>
        c.target_id === fileId && c.target_type === 'file'
      ) : []
    },

    getFolderComments: (state) => (structureId: number, folderId: number) => {
      const folder = state.folders[structureId]?.find((f: Folder) => f.id === folderId)
      return folder ? state.comments.filter((c: Comment) =>
        c.target_id === folderId && c.target_type === 'folder'
      ) : []
    },

    getStructureById: (state) => (id: number) =>
      state.structures.find((s: Structure) => s.id === id),

    isExpanded: (state) => (structureId: number, folderId: number) =>
      state.expandedFolders[structureId]?.has(folderId) || false
  },

  actions: {
    async loadStructures() {
      try {
        const response = await fetch(`${API_URL}/api/structures`);
        if (!response.ok) throw new Error('Failed to load structures');
        const structures = await response.json();
        this.structures = structures;
        
        // Load folders for each structure
        for (const structure of structures) {
          await this.loadFolders(structure.id);
        }
      } catch (error) {
        console.error('Error loading structures:', error);
        throw error;
      }
    },

    async loadFolders(structureId: number) {
      try {
        const response = await fetch(`${API_URL}/api/folders?structureId=${structureId}`);
        if (!response.ok) throw new Error('Failed to load folders');
        const folders = await response.json();
        
        // Create a map of parent IDs to child folders
        const folderMap = new Map<number | null, Folder[]>();
        folders.forEach((folder: Folder) => {
          const parentId = folder.parent_id;
          if (!folderMap.has(parentId)) {
            folderMap.set(parentId, []);
          }
          folderMap.get(parentId)!.push(folder);
        });

        // Function to recursively build folder hierarchy
        const buildHierarchy = (parentId: number | null): Folder[] => {
          const children = folderMap.get(parentId) || [];
          return children.map(folder => ({
            ...folder,
            children: buildHierarchy(folder.id)
          }));
        };

        // Build the complete hierarchy starting from root folders
        const rootFolders = buildHierarchy(null);
        this.folders[structureId] = rootFolders;
        this.expandedFolders[structureId] = new Set();
      } catch (error) {
        console.error('Error loading folders:', error);
        throw error;
      }
    },

    async loadComments() {
      try {
        const response = await fetch(`${API_URL}/api/comments`);
        if (!response.ok) throw new Error('Failed to load comments');
        const comments = await response.json();
        this.comments = comments;
      } catch (error) {
        console.error('Error loading comments:', error);
        throw error;
      }
    },

    toggleFolder(structureId: number, folderId: number) {
      if (!this.expandedFolders[structureId]) {
        this.expandedFolders[structureId] = new Set()
      }

      if (this.expandedFolders[structureId].has(folderId)) {
        this.expandedFolders[structureId].delete(folderId)
      } else {
        this.expandedFolders[structureId].add(folderId)
      }
    },

    startDragging(item: FolderItem) {
      this.isDragging = true
      this.draggedItem = item
    },

    stopDragging() {
      this.isDragging = false
      this.draggedItem = null
    },

    async moveItem(targetStructureId: number, targetFolderId: number | null) {
      if (!this.draggedItem) return

      try {
        const endpoint = this.draggedItem.type === 'file' ? 'files' : 'folders'
        const response = await fetch(`${API_URL}/${endpoint}/${this.draggedItem.id}/move`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            structure_id: targetStructureId,
            parent_id: targetFolderId
          })
        })

        if (!response.ok) throw new Error('Failed to move item')

        // Reload affected structures
        await this.loadStructures()
      } catch (error) {
        console.error('Error moving item:', error)
      } finally {
        this.stopDragging()
      }
    },

    async login(password: string) {
      try {
        const response = await fetch(`${API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        })

        if (!response.ok) throw new Error('Invalid password')

        const data = await response.json()
        this.authToken = data.token
        this.isLoggedIn = true
        this.currentUserId = data.userId
        localStorage.setItem('authToken', data.token)
        localStorage.setItem('userId', data.userId.toString())
      } catch (error) {
        console.error('Login failed:', error)
        throw error
      }
    },

    logout() {
      this.authToken = ''
      this.isLoggedIn = false
      this.currentUserId = null
      localStorage.removeItem('authToken')
      localStorage.removeItem('userId')
    },

    selectItem(item: FolderItem) {
      this.selectedItem = item
    },

    async addItem(item: {
      name: string;
      type: 'file' | 'folder';
      color?: string;
    }, parentId: number | null) {
      if (!this.selectedStructure) {
        throw new Error('No structure selected')
      }

      try {
        const endpoint = item.type === 'file' ? '/files' : '/folders'
        const response = await fetch(`${API_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            name: item.name,
            structure_id: this.selectedStructure.id,
            color: item.color || '#000000',
            ...(item.type === 'file'
              ? { folder_id: parentId }
              : { parent_id: parentId }
            )
          })
        })

        if (!response.ok) throw new Error(`Failed to create ${item.type}`)
        await this.loadFolders(this.selectedStructure.id)
      } catch (error) {
        console.error(`Error creating ${item.type}:`, error)
        throw error
      }
    },

    async addFolder({ name, structureId, parentId }: { name: string; structureId: number; parentId: number | null }) {
      try {
        const response = await fetch(`${API_URL}/api/folders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({ name, structure_id: structureId, parent_id: parentId })
        });

        if (!response.ok) {
          throw new Error('Failed to add folder');
        }

        await this.loadFolders(structureId);
      } catch (error) {
        console.error('Error adding folder:', error);
        throw error;
      }
    },

    async addFile({ name, folderId, structureId }: { name: string; folderId: number; structureId: number }) {
      try {
        const response = await fetch(`${API_URL}/api/files`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({ name, folder_id: folderId, structure_id: structureId })
        });

        if (!response.ok) {
          throw new Error('Failed to add file');
        }

        await this.loadFolders(structureId);
      } catch (error) {
        console.error('Error adding file:', error);
        throw error;
      }
    },

    async renameFolder(id: number, name: string) {
      try {
        const response = await fetch(`${API_URL}/api/folders/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({ name })
        });

        if (!response.ok) {
          throw new Error('Failed to rename folder');
        }

        await this.loadFolders(this.selectedStructure.id);
      } catch (error) {
        console.error('Error renaming folder:', error);
        throw error;
      }
    },

    async renameFile(id: number, name: string) {
      try {
        const response = await fetch(`${API_URL}/api/files/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({ name })
        });

        if (!response.ok) {
          throw new Error('Failed to rename file');
        }

        await this.loadFolders(this.selectedStructure.id);
      } catch (error) {
        console.error('Error renaming file:', error);
        throw error;
      }
    },

    async moveFolder(id: number, targetFolderId: number) {
      try {
        const response = await fetch(`${API_URL}/api/folders/${id}/move`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({ parent_id: targetFolderId })
        });

        if (!response.ok) {
          throw new Error('Failed to move folder');
        }

        await this.loadFolders(this.selectedStructure.id);
      } catch (error) {
        console.error('Error moving folder:', error);
        throw error;
      }
    },

    async moveFile(id: number, targetFolderId: number) {
      try {
        const response = await fetch(`${API_URL}/api/files/${id}/move`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({ folder_id: targetFolderId })
        });

        if (!response.ok) {
          throw new Error('Failed to move file');
        }

        await this.loadFolders(this.selectedStructure.id);
      } catch (error) {
        console.error('Error moving file:', error);
        throw error;
      }
    },

    async deleteFolder(id: number) {
      try {
        const response = await fetch(`${API_URL}/api/folders/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete folder');
        }

        await this.loadFolders(this.selectedStructure.id);
      } catch (error) {
        console.error('Error deleting folder:', error);
        throw error;
      }
    },

    async deleteFile(id: number) {
      try {
        const response = await fetch(`${API_URL}/api/files/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete file');
        }

        await this.loadFolders(this.selectedStructure.id);
      } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
      }
    },

    async addComment({ targetId, targetType, content, color }: { targetId: number; targetType: string; content: string; color: string }) {
      try {
        const response = await fetch(`${API_URL}/api/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          body: JSON.stringify({
            target_id: targetId,
            target_type: targetType,
            content,
            color
          })
        });

        if (!response.ok) {
          throw new Error('Failed to add comment');
        }

        await this.loadComments();
      } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
      }
    }
  }
})