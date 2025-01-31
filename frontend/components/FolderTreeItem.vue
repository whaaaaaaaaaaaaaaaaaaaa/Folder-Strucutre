<template>
  <div class="folder-tree-item">
    <div 
      class="folder-header" 
      @click="$emit('toggle-folder', folder.id)"
      @contextmenu.prevent="showFolderContextMenu($event)"
      :class="{ 'expanded': expandedFolders.includes(folder.id) }"
      ref="folderRef"
    >
      <div class="indent" :style="{ width: `${getDepth() * 20}px` }"></div>
      <span class="expand-icon material-icons">
        {{ expandedFolders.includes(folder.id) ? 'expand_more' : 'chevron_right' }}
      </span>
      <span class="folder-icon material-icons">folder</span>
      <span class="name">{{ getFolderName() }}</span>
    </div>
    
    <div v-if="expandedFolders.includes(folder.id)" class="folder-content">
      <!-- Child folders -->
      <template v-for="childFolder in childFolders" :key="childFolder.id">
        <FolderTreeItem
          :folder="childFolder"
          :all-folders="allFolders"
          :files="files"
          :expanded-folders="expandedFolders"
          :is-authenticated="isAuthenticated"
          @toggle-folder="$emit('toggle-folder', $event)"
          @refresh="$emit('refresh')"
        />
      </template>
      
      <!-- Files in current folder -->
      <div
        v-for="file in folderFiles"
        :key="file.id"
        class="file-item"
        @contextmenu.prevent="showFileContextMenu($event, file)"
        ref="fileRefs"
      >
        <div class="indent" :style="{ width: `${(getDepth() + 1) * 20}px` }"></div>
        <span class="file-icon material-icons">{{ getFileIcon(file.type) }}</span>
        <span class="name">{{ file.name }}</span>
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu 
      v-if="contextMenu.show" 
      :show="contextMenu.show"
      :x="contextMenu.x" 
      :y="contextMenu.y" 
      :type="contextMenu.type"
      @add-folder="handleAddFolder"
      @add-file="handleAddFile"
      @rename="handleRename"
      @move="handleMove"
      @delete="handleDelete"
      @comment="handleComment"
    />

    <!-- Comments -->
    <div class="comments-container">
      <CommentBubble
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :x="comment.x"
        :y="comment.y"
        :is-authenticated="isAuthenticated"
        @delete="handleDeleteComment"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import ContextMenu from './ContextMenu.vue';
import CommentBubble from './CommentBubble.vue';

interface Comment {
  id: number;
  text: string;
  color: string;
  timestamp: string;
  x: number;
  y: number;
  item_id: number;
  item_type: 'folder' | 'file';
}

interface Folder {
  id: number;
  path: string;
  parent_id: number | null;
  name: string;
}

interface File {
  id: number;
  name: string;
  path: string;
  folder_id: number;
  type: string;
}

const props = defineProps<{
  folder: Folder;
  allFolders: Folder[];
  files: File[];
  expandedFolders: number[];
  isAuthenticated: boolean;
}>();

const emit = defineEmits(['toggle-folder', 'refresh']);

const folderRef = ref<HTMLElement | null>(null);
const fileRefs = ref<HTMLElement[]>([]);
const comments = ref<Comment[]>([]);

// Context menu state
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  type: 'folder' as 'folder' | 'file',
  itemId: 0
});

const showFolderContextMenu = (event: MouseEvent) => {
  console.log('Showing folder context menu', { folderId: props.folder.id });
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    type: 'folder',
    itemId: props.folder.id
  };
};

const showFileContextMenu = (event: MouseEvent, file: File) => {
  console.log('Showing file context menu', { fileId: file.id });
  event.preventDefault();
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    type: 'file',
    itemId: file.id
  };
};

const closeContextMenu = () => {
  console.log('Closing context menu');
  contextMenu.value.show = false;
};

// Load comments
const loadComments = async (type: 'folder' | 'file', id: number) => {
  try {
    const response = await fetch(`/api/comments/${id}`);
    if (!response.ok) {
      throw new Error('Failed to load comments');
    }
    comments.value = await response.json();
  } catch (error) {
    console.error('Error loading comments:', error);
  }
};

// Context menu handlers
const handleAddFolder = async () => {
  console.log('Adding folder to parent:', contextMenu.value.itemId);
  const name = prompt('Enter folder name:');
  if (!name) return;

  try {
    console.log('Making API request to create folder');
    const response = await fetch('/api/folders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name,
        parent_id: contextMenu.value.itemId
      })
    });

    console.log('API response:', response);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create folder');
    }

    emit('refresh');
  } catch (error) {
    console.error('Error creating folder:', error);
    alert('Failed to create folder. Please try again.');
  }
  closeContextMenu();
};

const handleAddFile = async () => {
  console.log('Adding file to folder:', contextMenu.value.itemId);
  const name = prompt('Enter file name:');
  if (!name) return;

  try {
    console.log('Making API request to create file');
    const response = await fetch('/api/files', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name,
        folder_id: contextMenu.value.itemId
      })
    });

    console.log('API response:', response);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create file');
    }

    emit('refresh');
  } catch (error) {
    console.error('Error creating file:', error);
    alert('Failed to create file. Please try again.');
  }
  closeContextMenu();
};

const handleRename = async () => {
  console.log('Renaming item:', { type: contextMenu.value.type, id: contextMenu.value.itemId });
  const name = prompt('Enter new name:');
  if (!name) return;

  try {
    console.log('Making API request to rename item');
    const response = await fetch(`/api/${contextMenu.value.type}s/${contextMenu.value.itemId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ name })
    });

    console.log('API response:', response);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to rename item');
    }

    emit('refresh');
  } catch (error) {
    console.error('Error renaming item:', error);
    alert('Failed to rename item. Please try again.');
  }
  closeContextMenu();
};

const handleMove = async () => {
  console.log('Moving item:', { type: contextMenu.value.type, id: contextMenu.value.itemId });
  const folders = props.allFolders
    .filter(f => f.id !== contextMenu.value.itemId)
    .map(f => `${f.id}: ${f.path || f.name}`)
    .join('\n');
  
  const targetFolderId = prompt(`Enter the ID of the target folder:\n\nAvailable folders:\n${folders}`);
  if (!targetFolderId) return;

  try {
    console.log('Making API request to move item');
    const response = await fetch(`/api/${contextMenu.value.type}s/${contextMenu.value.itemId}/move`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ 
        [contextMenu.value.type === 'folder' ? 'parent_id' : 'folder_id']: parseInt(targetFolderId)
      })
    });

    console.log('API response:', response);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to move item');
    }

    emit('refresh');
  } catch (error) {
    console.error('Error moving item:', error);
    alert('Failed to move item. Please try again.');
  }
  closeContextMenu();
};

const handleDelete = async () => {
  console.log('Deleting item:', { type: contextMenu.value.type, id: contextMenu.value.itemId });
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    console.log('Making API request to delete item');
    const response = await fetch(`/api/${contextMenu.value.type}s/${contextMenu.value.itemId}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('API response:', response);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete item');
    }

    emit('refresh');
  } catch (error) {
    console.error('Error deleting item:', error);
    alert('Failed to delete item. Please try again.');
  }
  closeContextMenu();
};

const handleComment = async (event: MouseEvent) => {
  console.log('Adding comment to:', { type: contextMenu.value.type, id: contextMenu.value.itemId });
  const text = prompt('Enter comment:');
  if (!text) return;

  try {
    console.log('Making API request to add comment');
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const response = await fetch('/api/comments', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        item_id: contextMenu.value.itemId,
        item_type: contextMenu.value.type,
        text,
        x: rect.right + 10,
        y: rect.top
      })
    });

    console.log('API response:', response);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add comment');
    }

    loadComments(contextMenu.value.type, contextMenu.value.itemId);
  } catch (error) {
    console.error('Error adding comment:', error);
    alert('Failed to add comment. Please try again.');
  }
  closeContextMenu();
};

const handleDeleteComment = async (commentId: number) => {
  if (!confirm('Are you sure you want to delete this comment?')) return;

  try {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }

    comments.value = comments.value.filter(c => c.id !== commentId);
  } catch (error) {
    console.error('Error deleting comment:', error);
    alert('Failed to delete comment. Please try again.');
  }
};

// Computed properties
const childFolders = computed(() => {
  return props.allFolders
    .filter(f => f.parent_id === props.folder.id)
    .sort((a, b) => a.name.localeCompare(b.name));
});

const folderFiles = computed(() => {
  return props.files
    .filter(f => f.folder_id === props.folder.id)
    .sort((a, b) => a.name.localeCompare(b.name));
});

const getFolderName = () => {
  const parts = props.folder.path.split('/');
  return parts[parts.length - 1];
};

const getDepth = () => {
  let depth = 0;
  let currentFolder = props.folder;
  while (currentFolder.parent_id !== null) {
    depth++;
    currentFolder = props.allFolders.find(f => f.id === currentFolder.parent_id)!;
  }
  return depth;
};

const getFileIcon = (type: string) => {
  const icons: { [key: string]: string } = {
    'pdf': 'picture_as_pdf',
    'doc': 'description',
    'docx': 'description',
    'xls': 'table_chart',
    'xlsx': 'table_chart',
    'txt': 'article',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'gif',
    'mp4': 'movie',
    'mp3': 'audio_file',
  };
  return icons[type.toLowerCase()] || 'insert_drive_file';
};

// WebSocket for real-time updates
const setupWebSocket = () => {
  const ws = new WebSocket(`ws://${window.location.host}/ws`);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'refresh') {
      emit('refresh');
    } else if (data.type === 'comment' && data.itemId === contextMenu.value.itemId) {
      loadComments(contextMenu.value.type, contextMenu.value.itemId);
    }
  };

  ws.onclose = () => {
    // Reconnect after a short delay
    setTimeout(setupWebSocket, 1000);
  };
};

onMounted(() => {
  document.addEventListener('click', closeContextMenu);
  setupWebSocket();
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});
</script>

<style scoped>
.folder-tree-item {
  font-family: system-ui, -apple-system, sans-serif;
  position: relative;
}

.folder-header, .file-item {
  display: flex;
  align-items: center;
  padding: 4px;
  cursor: pointer;
  user-select: none;
  position: relative;
}

.folder-header:hover, .file-item:hover {
  background-color: #f5f5f5;
}

.indent {
  flex-shrink: 0;
}

.expand-icon, .folder-icon, .file-icon {
  margin-right: 4px;
  color: #666;
}

.name {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-content {
  margin-left: 0;
}

.comments-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.comments-container > * {
  pointer-events: auto;
}
</style>
