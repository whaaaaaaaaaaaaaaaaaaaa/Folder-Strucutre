<template>
  <div 
    class="folder-node"
    :style="{ paddingLeft: `${level * 6}px` }"
    :class="{ 'is-dragging': isDragging }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover.prevent
    @drop.prevent="onDrop"
    @contextmenu.stop.prevent="showContextMenu"
  >
    <div class="folder-header" @click="onFolderClick">
      <span class="folder-icon" :class="{ 'is-expanded': isExpanded }">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isExpanded ? 'none' : 'currentColor'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      </span>
      <span class="folder-name">{{ folder.name }}</span>
    </div>

    <div v-show="isExpanded" class="folder-content">
      <div class="connector-line" v-if="folder.files.length > 0 || folder.children.length > 0"></div>
      
      <!-- Files -->
      <div 
        v-for="file in folder.files" 
        :key="file.id"
        class="file-item"
        @contextmenu.stop.prevent="showFileContextMenu($event, file)"
      >
        <span class="file-icon">
          <FileIcon :type="getFileType(file.name)" />
        </span>
        <span class="file-name">{{ file.name }}</span>
      </div>

      <!-- Nested folders -->
      <FolderNode
        v-for="childFolder in folder.children"
        :key="childFolder.id"
        :folder="childFolder"
        :structure-id="structureId"
        :level="level + 1"
        :is-authenticated="isAuthenticated"
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @drag-start="$emit('drag-start', $event)"
        @drag-end="$emit('drag-end')"
        @drop="$emit('drop', $event)"
        @refresh="$emit('refresh')"
      />
    </div>

    <ContextMenu
      :show="showMenu"
      :x="menuX"
      :y="menuY"
      :type="menuType"
      :is-authenticated="isAuthenticated"
      @add-folder="handleAddFolder(menuItemId)"
      @add-file="handleAddFile(menuItemId)"
      @rename="handleRename({ id: menuItemId, type: menuType })"
      @move="handleMove({ id: menuItemId, type: menuType })"
      @delete="handleDelete({ id: menuItemId, type: menuType })"
      @comment="handleComment({ id: menuItemId, type: menuType })"
    />

    <InputModal
      :show="showInputModal"
      :title="inputModalConfig.title"
      :placeholder="inputModalConfig.placeholder"
      :initial-value="inputModalConfig.initialValue"
      @submit="handleInputModalSubmit"
      @close="showInputModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFolderStructureStore } from '../stores/folderStructure';
import { useAuthStore } from '../stores/auth';
import ContextMenu from './ContextMenu.vue';
import FileIcon from './FileIcon.vue';
import InputModal from './InputModal.vue';
import { onMounted, onUnmounted } from 'vue';

const props = defineProps({
  folder: {
    type: Object,
    required: true
  },
  structureId: {
    type: Number,
    required: true
  },
  level: {
    type: Number,
    default: 0
  },
  isAuthenticated: {
    type: Boolean,
    required: true
  }
});

const authStore = useAuthStore();
const folderStore = useFolderStructureStore();

const emit = defineEmits([
  'toggle',
  'select',
  'drag-start',
  'drag-end',
  'drop',
  'refresh'
]);

const showMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuType = ref<'folder' | 'file'>('folder');
const menuItemId = ref<number | null>(null);
const isExpanded = ref(false);
const isDragging = ref(false);

const showInputModal = ref(false);
const inputModalConfig = ref({
  title: '',
  placeholder: '',
  initialValue: '',
  action: '',
  data: null as any
});

// Close menu when clicking outside
const closeContextMenu = (event?: MouseEvent) => {
  if (event) {
    event.preventDefault();
  }
  showMenu.value = false;
};

onMounted(() => {
  window.addEventListener('click', closeContextMenu);
  window.addEventListener('contextmenu', closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu);
  window.removeEventListener('contextmenu', closeContextMenu);
});

const showContextMenu = (event: MouseEvent) => {
  console.log('Right click detected');
  console.log('Auth state:', props.isAuthenticated);
  
  if (!props.isAuthenticated) {
    console.log('Not authenticated, skipping menu');
    return;
  }
  
  event.preventDefault();
  event.stopPropagation();
  
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuType.value = 'folder';
  menuItemId.value = props.folder.id;
  showMenu.value = true;
  
  console.log('Menu state:', {
    show: showMenu.value,
    x: menuX.value,
    y: menuY.value,
    type: menuType.value,
    itemId: menuItemId.value
  });
};

const showFileContextMenu = (event: MouseEvent, file: any) => {
  console.log('File right click detected');
  console.log('Auth state:', props.isAuthenticated);
  
  if (!props.isAuthenticated) {
    console.log('Not authenticated, skipping menu');
    return;
  }
  
  event.preventDefault();
  event.stopPropagation();
  
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuType.value = 'file';
  menuItemId.value = file.id;
  showMenu.value = true;
  
  console.log('Menu state:', {
    show: showMenu.value,
    x: menuX.value,
    y: menuY.value,
    type: menuType.value,
    itemId: menuItemId.value
  });
};

const onFolderClick = () => {
  isExpanded.value = !isExpanded.value;
  emit('toggle', props.folder.id);
};

const handleInputModalSubmit = async (value: string) => {
  switch (inputModalConfig.value.action) {
    case 'comment':
      await submitComment(value, inputModalConfig.value.data);
      break;
    case 'rename':
      await submitRename(value, inputModalConfig.value.data);
      break;
    case 'addFolder':
      await submitAddFolder(value, inputModalConfig.value.data);
      break;
    case 'addFile':
      await submitAddFile(value, inputModalConfig.value.data);
      break;
  }
};

const submitComment = async (content: string, { id, type }: { id: number, type: string }) => {
  try {
    const requestData = {
      text: content,
      color: '#FFD700',
      target_type: type,
      target_id: id,
      x: 0,
      y: 0
    };

    console.log('Submitting comment:', requestData);

    const response = await fetch('http://localhost:8000/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const responseData = await response.json();
    console.log('Response:', { status: response.status, data: responseData });

    if (!response.ok) {
      throw new Error(responseData.error || `Server error: ${response.status}`);
    }

    emit('refresh');
    showMenu.value = false;
  } catch (error) {
    console.error('Error adding comment:', error);
    alert(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const handleComment = (data: { id: number, type: string }) => {
  inputModalConfig.value = {
    title: 'Add Comment',
    placeholder: 'Enter your comment...',
    initialValue: '',
    action: 'comment',
    data
  };
  showInputModal.value = true;
};

const handleAddFolder = (parentId: number) => {
  inputModalConfig.value = {
    title: 'Add Folder',
    placeholder: 'Enter folder name...',
    initialValue: '',
    action: 'addFolder',
    data: { parentId }
  };
  showInputModal.value = true;
};

const handleAddFile = (folderId: number) => {
  inputModalConfig.value = {
    title: 'Add File',
    placeholder: 'Enter file name...',
    initialValue: '',
    action: 'addFile',
    data: { folderId }
  };
  showInputModal.value = true;
};

const handleRename = (data: { id: number, type: string }) => {
  const currentName = data.type === 'folder' 
    ? props.folder.name 
    : props.folder.files.find(f => f.id === data.id)?.name || '';
    
  inputModalConfig.value = {
    title: `Rename ${data.type}`,
    placeholder: 'Enter new name...',
    initialValue: currentName,
    action: 'rename',
    data
  };
  showInputModal.value = true;
};

const submitRename = async (name: string, { id, type }: { id: number, type: string }) => {
  try {
    if (type === 'folder') {
      await folderStore.renameFolder(id, name);
    } else {
      await folderStore.renameFile(id, name);
    }
    emit('refresh');
    showMenu.value = false;
  } catch (error) {
    console.error('Error renaming item:', error);
  }
};

const submitAddFolder = async (name: string, { parentId }: { parentId: number }) => {
  try {
    await folderStore.addFolder({
      name,
      structureId: props.structureId,
      parentId
    });
    emit('refresh');
    showMenu.value = false;
  } catch (error) {
    console.error('Error adding folder:', error);
  }
};

const submitAddFile = async (name: string, { folderId }: { folderId: number }) => {
  try {
    await folderStore.addFile({
      name,
      folderId,
      structureId: props.structureId
    });
    emit('refresh');
    showMenu.value = false;
  } catch (error) {
    console.error('Error adding file:', error);
  }
};

const handleMove = async ({ id, type }: { id: number | null; type: string }) => {
  if (!id) return;
  try {
    const targetFolderId = prompt('Enter target folder ID:');
    if (!targetFolderId) return;
    
    if (type === 'folder') {
      await folderStore.moveFolder(id, parseInt(targetFolderId));
    } else {
      await folderStore.moveFile(id, parseInt(targetFolderId));
    }
    emit('refresh');
    showMenu.value = false;
  } catch (error) {
    console.error('Error moving item:', error);
  }
};

const handleDelete = async ({ id, type }: { id: number | null; type: string }) => {
  if (!id) return;
  try {
    const confirm = window.confirm('Are you sure you want to delete this item?');
    if (!confirm) return;
    
    if (type === 'folder') {
      await folderStore.deleteFolder(id);
    } else {
      await folderStore.deleteFile(id);
    }
    emit('refresh');
    showMenu.value = false;
  } catch (error) {
    console.error('Error deleting item:', error);
  }
};

const onDragStart = (event: DragEvent) => {
  isDragging.value = true;
  emit('drag-start', { id: props.folder.id, type: 'folder' });
};

const onDragEnd = () => {
  isDragging.value = false;
  emit('drag-end');
};

const onDrop = (event: DragEvent) => {
  emit('drop', { targetId: props.folder.id });
};

const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'xls':
    case 'xlsx':
      return 'excel';
    case 'ppt':
    case 'pptx':
      return 'powerpoint';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'image';
    case 'txt':
      return 'text';
    default:
      return 'file';
  }
};
</script>

<style scoped>
.folder-node {
  position: relative;
  padding: 2px 0;
  user-select: none;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 2px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  position: relative;
  z-index: 2;
}

.folder-header:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.folder-icon {
  display: inline-flex;
  margin-right: 6px;
  color: #FFD700;
  width: 16px;
  text-align: center;
}

.folder-name {
  color: #fff;
}

.folder-content {
  position: relative;
  overflow: hidden;
  padding-left: 6px;
}

.connector-line {
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 4px;
  width: 1px;
  background-color: #404040;
}

.file-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 2px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.file-icon {
  display: inline-flex;
  margin-right: 6px;
  color: #A9A9A9;
  width: 16px;
  text-align: center;
}

.file-name {
  color: #fff;
}

.is-dragging {
  opacity: 0.5;
}
</style>