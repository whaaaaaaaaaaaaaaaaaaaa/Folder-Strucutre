<template>
  <div class="file-explorer">
    <div class="explorer-content">
      <nav class="toolbar">
        <div class="nav-items">
          <template v-if="!isLoggedIn">
            <div class="nav-item" @click="showLoginModal = true">
              <span class="material-icons">login</span>
              <span>Login for Admin</span>
            </div>
          </template>
          <template v-else>
            <div class="nav-item" @click="importFolderStructure">
              <span class="material-icons">folder_open</span>
              <span>Import Structure</span>
            </div>
            <div class="nav-item" @click="logout">
              <span class="material-icons">logout</span>
              <span>Logout</span>
            </div>
          </template>
        </div>
      </nav>

      <div class="structures-grid">
        <div v-for="structure in structures" :key="structure.id" class="structure-column">
          <div class="structure-title" @contextmenu.prevent="showStructureRenamePrompt(structure.id)">
            {{ structure.name }}
            <button 
              v-if="isLoggedIn" 
              class="delete-btn" 
              @click.stop="deleteStructure(structure.id)"
              title="Delete structure"
            >
              ×
            </button>
          </div>
          <div class="folder-tree">
            <template v-if="folders[structure.id]">
              <FolderNode
                v-for="folder in folders[structure.id]"
                :key="folder.id"
                :folder="folder"
                :structure-id="structure.id"
                :level="0"
                :is-authenticated="isLoggedIn"
                @toggle="toggleFolder"
                @select="selectItem"
                @drag-start="startDragging"
                @drag-end="stopDragging"
                @drop="handleDrop"
                @delete-folder="deleteFolder"
                @add-folder="handleAddFolder"
                @add-file="handleAddFile"
                @rename="handleRename"
                @move="handleMove"
                @delete="handleDelete"
                @comment="handleComment"
              />
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Login Modal -->
    <div v-if="showLoginModal" class="modal">
      <div class="modal-content login-modal">
        <div class="modal-header">
          <h2>Admin Login</h2>
          <span class="material-icons close-icon" @click="showLoginModal = false">close</span>
        </div>
        <div class="modal-body">
          <div class="input-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password"
              v-model="password"
              placeholder="Enter admin password"
              @keyup.enter="login"
            >
          </div>
          <div class="button-group">
            <button class="btn btn-secondary" @click="showLoginModal = false">Cancel</button>
            <button class="btn btn-primary" @click="login">Login</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal">
      <div class="modal-content">
        <h2>Import Folder Structure</h2>
        <input 
          type="text" 
          v-model="importPath" 
          placeholder="Enter folder path (e.g., C:\Users\YourName\Documents)"
          @keyup.enter="submitImport"
          class="input"
        />
        <div class="modal-actions">
          <button @click="showImportModal = false" class="button secondary">Cancel</button>
          <button @click="submitImport" class="button">Import</button>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <div 
      v-if="isContextMenuVisible" 
      class="context-menu"
      :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }"
      @mouseleave="closeContextMenu"
    >
      <!-- Admin-only actions -->
      <template v-if="isLoggedIn">
        <div v-if="selectedItem?.type === 'folder'" class="menu-item" @click="addNewFile">
          <span class="material-icons">note_add</span>
          Add File
        </div>
        <div v-if="selectedItem?.type === 'folder'" class="menu-item" @click="addNewFolder">
          <span class="material-icons">create_new_folder</span>
          Add Folder
        </div>
        <div class="menu-item" @click="renameItem">
          <span class="material-icons">edit</span>
          Rename
        </div>
        <div class="menu-item" @click="promptAndMoveItem">
          <span class="material-icons">drive_file_move</span>
          Move
        </div>
        <div class="menu-item" @click="deleteItem">
          <span class="material-icons">delete</span>
          Delete
        </div>
        <div class="menu-item" @click="addComment">
          <span class="material-icons">comment</span>
          Add Comment
        </div>
      </template>
      <!-- View comments for all users -->
      <div v-if="selectedItemComments.length > 0" class="menu-item" @click="viewComments">
        <span class="material-icons">comment</span>
        View Comments ({{ selectedItemComments.length }})
      </div>
    </div>

    <!-- Comments Modal -->
    <div v-if="showCommentsModal" class="modal">
      <div class="modal-content">
        <h2>Comments</h2>
        <div class="comments-list">
          <div v-for="comment in selectedItemComments" :key="comment.id" 
               class="comment" :style="{ borderColor: comment.color }">
            <div class="comment-header">
              <span>{{ new Date(comment.created_at).toLocaleString() }}</span>
              <div v-if="isLoggedIn" class="comment-actions">
                <button @click="editComment(comment)" class="icon-button">
                  <span class="material-icons">edit</span>
                </button>
                <button @click="deleteComment(comment.id)" class="icon-button">
                  <span class="material-icons">delete</span>
                </button>
                <input 
                  type="color" 
                  v-model="comment.color"
                  @change="updateCommentColor(comment.id, ($event.target as HTMLInputElement).value)"
                >
              </div>
            </div>
            <div class="comment-content">{{ comment.content }}</div>
          </div>
        </div>
        <div v-if="isLoggedIn" class="comment-form">
          <input 
            v-model="newComment" 
            placeholder="Add a comment..."
            class="input"
          />
          <input 
            type="color" 
            v-model="newCommentColor"
            class="color-picker"
          />
          <button @click="submitComment" class="button">Add</button>
        </div>
        <div class="modal-actions">
          <button @click="showCommentsModal = false" class="button">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useFolderStructureStore } from '../stores/folderStructure'
import type { File, Folder, Comment, FolderItem as FolderItemType } from '../stores/folderStructure'
import FolderNode from './FolderNode.vue'

const API_URL = 'http://localhost:8000';

const store = useFolderStructureStore()
const {
  structures,
  selectedStructure,
  folders,
  selectedItem,
  expandedFolders,
  comments,
  isLoggedIn,
  authToken,
  currentUserId,
  isDragging,
  draggedItem
} = storeToRefs(store)

const {
  loadStructures,
  loadFolders,
  loadComments,
  toggleFolder,
  startDragging,
  stopDragging,
  moveItem
} = store

const password = ref('')
const showLoginModal = ref(false)
const isContextMenuVisible = ref(false)
const showCommentsModal = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const newComment = ref('')
const newCommentColor = ref('#ffeb3b')
const showImportModal = ref(false);
const importPath = ref('');

const selectedItemComments = computed(() => {
  if (!selectedItem.value?.id) return []
  return comments.value.filter((c: Comment) =>
    c.target_id === selectedItem.value?.id &&
    c.target_type === selectedItem.value?.type
  )
})

const handleContextMenu = (data: { event: MouseEvent, item: FolderItemType }) => {
  if (!isLoggedIn.value) return
  
  const { event, item } = data
  store.selectItem(item)
  
  menuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  
  isContextMenuVisible.value = true
}

onMounted(async () => {
  await loadStructures()
  await loadComments()
  
  const token = localStorage.getItem('authToken')
  if (token) {
    authToken.value = token
    isLoggedIn.value = true
    currentUserId.value = parseInt(localStorage.getItem('userId') || '0')
  }
})

const login = async () => {
  try {
    const response = await fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password.value }),
    })

    if (!response.ok) {
      throw new Error('Invalid password')
    }

    const data = await response.json()
    isLoggedIn.value = true
    if (data.token) {
      authToken.value = data.token
      localStorage.setItem('authToken', data.token)
    }
    if (data.userId) {
      currentUserId.value = data.userId
      localStorage.setItem('userId', data.userId.toString())
    }
    password.value = ''
    showLoginModal.value = false

    await loadStructures()
  } catch (error) {
    console.error('Login error:', error)
    alert('Login failed: ' + error.message)
  }
}

const viewComments = () => {
  showCommentsModal.value = true
}

const editComment = (comment: Comment) => {
  const newContent = prompt('Edit comment:', comment.content)
  if (!newContent) return

  updateComment(comment.id, { content: newContent })
}

const updateComment = async (commentId: number, updates: { content?: string; color?: string }) => {
  try {
    const response = await fetch(`http://localhost:8000/comments/${commentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`,
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) throw new Error('Failed to update comment')
    await loadComments()
  } catch (error) {
    console.error('Error updating comment:', error)
  }
}

const addNewFile = async () => {
  if (!selectedItem.value || selectedItem.value.type !== 'folder' || !selectedStructure.value) return
  
  const name = prompt('Enter file name:')
  if (!name) return

  try {
    const response = await fetch('http://localhost:8000/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`
      },
      body: JSON.stringify({
        name,
        folder_id: selectedItem.value.id,
        structure_id: selectedStructure.value.id,
        color: '#000000'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create file')
    }

    await loadStructures()
    closeContextMenu()
  } catch (error: any) {
    console.error('Error creating file:', error)
    alert('Failed to create file. Please try again.')
  }
}

const addNewFolder = async () => {
  if (!selectedItem.value || selectedItem.value.type !== 'folder' || !selectedStructure.value) return
  
  const name = prompt('Enter folder name:')
  if (!name) return

  try {
    const response = await fetch('http://localhost:8000/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`
      },
      body: JSON.stringify({
        name,
        parent_id: selectedItem.value.id,
        structure_id: selectedStructure.value.id,
        color: '#000000'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create folder')
    }

    await loadStructures()
    closeContextMenu()
  } catch (error: any) {
    console.error('Error creating folder:', error)
    alert('Failed to create folder. Please try again.')
  }
}

const renameItem = async () => {
  if (!selectedItem.value || !selectedStructure.value) return
  
  const name = prompt('Enter new name:')
  if (!name) return

  try {
    const response = await fetch(`http://localhost:8000/${selectedItem.value.type}s/${selectedItem.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`
      },
      body: JSON.stringify({ name })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to rename item')
    }

    await loadStructures()
    closeContextMenu()
  } catch (error: any) {
    console.error('Error renaming item:', error)
    alert('Failed to rename item. Please try again.')
  }
}

// Removed duplicate moveItem function

const deleteItem = async () => {
  if (!selectedItem.value || !selectedStructure.value) return
  
  if (!confirm(`Are you sure you want to delete this ${selectedItem.value.type}?`)) return

  try {
    const response = await fetch(`http://localhost:8000/${selectedItem.value.type}s/${selectedItem.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken.value}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete item')
    }

    await loadStructures()
    closeContextMenu()
  } catch (error: any) {
    console.error('Error deleting item:', error)
    alert('Failed to delete item. Please try again.')
  }
}

// Handle drag and drop
const handleDrop = async (targetStructureId: number, targetFolderId: number | null) => {
  if (!selectedItem.value || !selectedStructure.value) return

  try {
    const response = await fetch(`http://localhost:8000/${selectedItem.value.type}s/${selectedItem.value.id}/move`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`
      },
      body: JSON.stringify({
        structure_id: targetStructureId,
        [selectedItem.value.type === 'folder' ? 'parent_id' : 'folder_id']: targetFolderId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to move item')
    }

    await loadStructures()
  } catch (error: any) {
    console.error('Error moving item:', error)
    alert('Failed to move item. Please try again.')
  }
}

const logout = () => {
  authToken.value = ''
  isLoggedIn.value = false
  currentUserId.value = null
  localStorage.removeItem('authToken')
  localStorage.removeItem('userId')
}

const addComment = () => {
  if (!selectedItem.value) return

  newComment.value = ''
  newCommentColor.value = '#ffeb3b'
  showCommentsModal.value = true
}

const submitComment = async () => {
  if (!selectedItem.value) return

  const content = newComment.value.trim()
  if (!content) return

  try {
    const response = await fetch('http://localhost:8000/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({
        target_id: selectedItem.value.id,
        target_type: selectedItem.value.type,
        content,
        color: newCommentColor.value,
      }),
    })

    if (!response.ok) throw new Error('Failed to submit comment')

    await loadComments()
    newComment.value = ''
    newCommentColor.value = '#ffeb3b'
    showCommentsModal.value = false
  } catch (error) {
    console.error('Error submitting comment:', error)
  }
}

const deleteComment = async (commentId: number) => {
  try {
    const response = await fetch(`http://localhost:8000/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
      },
    })

    if (!response.ok) throw new Error('Failed to delete comment')

    await loadComments()
  } catch (error) {
    console.error('Error deleting comment:', error)
  }
}

const updateCommentColor = async (commentId: number, color: string) => {
  try {
    const response = await fetch(`http://localhost:8000/comments/${commentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({ color }),
    })

    if (!response.ok) throw new Error('Failed to update comment color')

    await loadComments()
  } catch (error) {
    console.error('Error updating comment color:', error)
  }
}

const promptAndMoveItem = async () => {
  if (!selectedItem.value || !selectedStructure.value) return

  const availableFolders = folders.value[selectedStructure.value.id] || []
  const folderList = availableFolders
    .filter(f => f.id !== selectedItem.value?.id)
    .map(f => `${f.id}: ${f.path || f.name}`)
    .join('\n')
  
  const targetFolderId = prompt(`Enter the ID of the target folder:\n\nAvailable folders:\n${folderList}`)
  if (!targetFolderId) return

  await moveItem(selectedStructure.value.id, parseInt(targetFolderId))
  closeContextMenu()
}

const closeContextMenu = () => {
  isContextMenuVisible.value = false
}

const getItemComments = (id: number, type: 'file' | 'folder') => {
  return comments.value.filter(comment =>
    comment.target_id === id && comment.target_type === type
  )
}

const getFileIcon = (type: string): string => {
  const iconMap: { [key: string]: string } = {
    pdf: 'picture_as_pdf',
    doc: 'description',
    docx: 'description',
    xls: 'table_chart',
    xlsx: 'table_chart',
    txt: 'article',
    csv: 'table_chart',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'gif',
    mp4: 'video_file',
    zip: 'folder_zip',
    rar: 'folder_zip',
    exe: 'terminal',
    bat: 'terminal',
    dll: 'settings_applications',
    SLDPRT: 'view_in_ar',
    SLDASM: 'view_in_ar',
    stp: 'view_in_ar',
    xml: 'code',
    log: 'article',
    db: 'storage'
  }
  return iconMap[type.toLowerCase()] || 'insert_drive_file'
}

async function deleteStructure(id: number) {
  try {
    const response = await fetch(`http://localhost:8000/api/structures/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete structure');
    }

    // Remove the structure from the local state
    structures.value = structures.value.filter(s => s.id !== id);
    
    // Also remove any folders associated with this structure
    folders.value = Object.fromEntries(
      Object.entries(folders.value).filter(([structureId]) => parseInt(structureId) !== id)
    );

    // Reload all structures to ensure everything is in sync
    await store.loadStructures();
  } catch (error) {
    console.error('Error deleting structure:', error);
    alert('Failed to delete structure: ' + error.message);
  }
}

function importFolderStructure() {
  showImportModal.value = true;
}

async function submitImport() {
  try {
    if (!importPath.value) {
      alert('Please enter a valid path');
      return;
    }

    const response = await fetch('http://localhost:8000/api/folders/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`
      },
      body: JSON.stringify({
        path: importPath.value
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to import folder structure');
    }

    await loadStructures();
    showImportModal.value = false;
    importPath.value = '';
  } catch (error) {
    console.error('Import error:', error);
    alert(error.message);
  }
}

const showStructureRenamePrompt = async (structureId: number) => {
  if (!isLoggedIn.value) return;
  
  const structure = structures.value.find(s => s.id === structureId);
  if (!structure) {
    alert('Structure not found');
    return;
  }
  
  const newName = prompt('Enter new name:', structure.name);
  if (newName && newName !== structure.name) {
    try {
      const response = await fetch(`${API_URL}/structures/${structureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken.value}`
        },
        body: JSON.stringify({ name: newName.trim() })
      });

      if (response.ok) {
        await loadStructures();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to rename structure');
      }
    } catch (error) {
      console.error('Error renaming structure:', error);
      alert('Failed to rename structure');
    }
  }
};

const deleteFolder = async (folderId: number) => {
  if (!isLoggedIn.value) return;
  try {
    await fetch(`/api/folders/${folderId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    // Refresh the folder structure
    await loadStructures();
  } catch (error) {
    console.error('Error deleting folder:', error);
  }
};

const handleAddFolder = async (parentId: number) => {
  if (!isLoggedIn.value) return;
  const name = prompt('Enter folder name:');
  if (!name) return;

  try {
    const response = await fetch('http://localhost:8000/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, parentId })
    });

    if (!response.ok) throw new Error('Failed to create folder');
    await loadStructures();
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('Failed to create folder');
  }
};

const handleAddFile = async (parentId: number) => {
  if (!isLoggedIn.value) return;
  const name = prompt('Enter file name:');
  if (!name) return;

  try {
    const response = await fetch('http://localhost:8000/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, parentId })
    });

    if (!response.ok) throw new Error('Failed to create file');
    await loadStructures();
  } catch (error) {
    console.error('Error creating file:', error);
    alert('Failed to create file');
  }
};

const handleRename = async ({ id, type }: { id: number, type: 'file' | 'folder' }) => {
  if (!isLoggedIn.value) return;
  const name = prompt('Enter new name:');
  if (!name) return;

  try {
    const endpoint = type === 'file' ? 'files' : 'folders';
    const response = await fetch(`http://localhost:8000/${endpoint}/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) throw new Error(`Failed to rename ${type}`);
    await loadStructures();
  } catch (error: any) {
    console.error(`Error renaming ${type}:`, error);
    alert(`Failed to rename ${type}`);
  }
};

const handleMove = async ({ id, type }: { id: number, type: 'file' | 'folder' }) => {
  if (!isLoggedIn.value) return;
  const targetFolderId = prompt('Enter target folder ID:');
  if (!targetFolderId) return;

  try {
    const endpoint = type === 'file' ? 'files' : 'folders';
    const response = await fetch(`http://localhost:8000/${endpoint}/${id}/move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetFolderId: parseInt(targetFolderId) })
    });

    if (!response.ok) throw new Error(`Failed to move ${type}`);
    await loadStructures();
  } catch (error: any) {
    console.error(`Error moving ${type}:`, error);
    alert(`Failed to move ${type}`);
  }
};

const handleDelete = async ({ id, type }: { id: number, type: 'file' | 'folder' }) => {
  if (!isLoggedIn.value) return;
  if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

  try {
    const endpoint = type === 'file' ? 'files' : 'folders';
    const response = await fetch(`http://localhost:8000/${endpoint}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error(`Failed to delete ${type}`);
    await loadStructures();
  } catch (error: any) {
    console.error(`Error deleting ${type}:`, error);
    alert(`Failed to delete ${type}`);
  }
};

const handleComment = async ({ id, type }: { id: number, type: 'file' | 'folder' }) => {
  if (!isLoggedIn.value) return;
  const content = prompt('Enter comment:');
  if (!content) return;

  try {
    const response = await fetch('http://localhost:8000/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        content,
        itemId: id,
        itemType: type,
        color: '#ffeb3b' // Default yellow color
      })
    });

    if (!response.ok) throw new Error('Failed to add comment');
    await loadComments();
  } catch (error) {
    console.error('Error adding comment:', error);
    alert('Failed to add comment');
  }
};
</script>

<style scoped>
.file-explorer {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--background-color);
}

.explorer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.structures-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  padding: 16px;
  overflow: auto;
  margin: 0;
}

.structure-column {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

@media (max-width: 1200px) {
  .structures-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .structures-grid {
    grid-template-columns: 1fr;
  }
}

.toolbar {
  margin: 16px 16px 0 16px;
  display: flex;
  align-items: center;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
}

.nav-items {
  display: flex;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-color);
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: var(--hover-color);
}

.nav-item .material-icons {
  font-size: 20px;
  opacity: 0.9;
}

.nav-item span {
  font-size: 14px;
  font-weight: 500;
}

.folder-tree {
  flex: 1;
  overflow: auto;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.context-menu {
  position: absolute;
  z-index: 10;
  background-color: #1a1a1a;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 4px;
  cursor: pointer;
}

.menu-item:hover {
  background-color: #2a2a2a;
}

.menu-item .material-icons {
  margin-right: 4px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--surface-color);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 400px;
  margin: 16px;
  overflow: hidden;
}

.login-modal {
  animation: modal-appear 0.3s ease;
}

@keyframes modal-appear {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
}

.close-icon {
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  padding: 4px;
  border-radius: 4px;
}

.close-icon:hover {
  opacity: 1;
  background: var(--hover-color);
}

.modal-body {
  padding: 24px;
}

.input-group {
  margin-bottom: 24px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.input-group input {
  width: 100%;
  padding: 10px 16px;
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-color);
  font-size: 14px;
  transition: all 0.2s;
}

.input-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover);
}

.btn-secondary {
  background: var(--hover-color);
  color: var(--text-color);
}

.btn-secondary:hover {
  background: var(--surface-color);
}

.comments-list {
  max-height: 300px;
  overflow-y: auto;
  margin: 16px 0;
}

.comment {
  background-color: #2a2a2a;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  border-left: 4px solid;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9em;
  color: #888;
}

.comment-actions {
  display: flex;
  gap: 4px;
}

.comment-content {
  white-space: pre-wrap;
}

.comment-form {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.color-picker {
  width: 40px;
  padding: 0;
  border: none;
  background: none;
}

.input {
  flex: 1;
  background-color: #2a2a2a;
  border: 1px solid #404040;
  color: white;
  padding: 8px;
  border-radius: 4px;
}

.button {
  background-color: #404040;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.button:hover {
  background-color: #505050;
}

.button.secondary {
  background-color: transparent;
  border: 1px solid #404040;
}

.button.secondary:hover {
  background-color: #2a2a2a;
}

.icon-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #888;
}

.icon-button:hover {
  color: white;
}

.delete-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #888;
  font-size: 1.2rem;
  margin-left: 8px;
}

.delete-button:hover {
  color: white;
}

.delete-btn {
  opacity: 0;
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #ff4444;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  transition: opacity 0.2s ease;
}

.delete-btn:hover {
  color: #ff6666;
}

.structure-title:hover .delete-btn {
  opacity: 1;
}
</style>
