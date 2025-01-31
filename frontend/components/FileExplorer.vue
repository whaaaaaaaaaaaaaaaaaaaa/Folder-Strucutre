<template>
  <div class="file-explorer">
    <div class="explorer-content">
      <div class="toolbar">
        <div class="toolbar-left">
          <button v-if="!isLoggedIn" @click="showLoginModal = true" class="button">
            <span class="material-icons">login</span>
            Login for Admin
          </button>
          <template v-else>
            <button class="button" @click="logout">
              <span class="material-icons">logout</span>
              Logout
            </button>
          </template>
        </div>
      </div>

      <div class="structures-grid">
        <div v-for="structure in structures" :key="structure.id" class="structure-column">
          <div class="structure-header">
            <h3>{{ structure.name }}</h3>
            <span v-if="structure.description" class="structure-description">
              {{ structure.description }}
            </span>
          </div>
          <div class="tree-view">
            <div class="tree-container">
              <FolderItem
                v-for="folder in store.rootFolders(structure.id)"
                :key="folder.id"
                :folder="folder"
                :all-folders="folders[structure.id] || []"
                :expanded-folders="expandedFolders[structure.id] || new Set()"
                :comments="comments"
                :is-admin="isLoggedIn"
                @toggle="(id) => toggleFolder(structure.id, id)"
                @context-menu="handleContextMenu"
                @drop="handleDrop"
                @drag-start="startDragging"
                @drag-end="stopDragging"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Login Modal -->
    <div v-if="showLoginModal" class="modal">
      <div class="modal-content">
        <h2>Admin Login</h2>
        <input 
          type="password" 
          v-model="password" 
          placeholder="Enter admin password"
          @keyup.enter="login"
          class="input"
        />
        <div class="modal-actions">
          <button @click="showLoginModal = false" class="button secondary">Cancel</button>
          <button @click="login" class="button">Login</button>
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
import FolderItem from './FolderItem.vue'

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
    authToken.value = data.token
    isLoggedIn.value = true
    currentUserId.value = data.userId
    localStorage.setItem('authToken', data.token)
    localStorage.setItem('userId', data.userId.toString())
    password.value = ''
    showLoginModal.value = false

    await loadStructures()
  } catch (error: any) {
    console.error('Login failed:', error)
    alert(error.message || 'Login failed')
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
</script>

<style scoped>
.file-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.explorer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tree-view {
  background-color: #1a1a1a;
  border-radius: 4px;
  padding: 24px;
  min-height: 200px;
}

.tree-container {
  position: relative;
  padding-left: 12px;
}

.tree-container > .tree-item {
  margin-bottom: 8px;
}

.tree-container > .tree-item:last-child {
  margin-bottom: 0;
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
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: #1a1a1a;
  padding: 24px;
  border-radius: 8px;
  min-width: 300px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
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
</style>
