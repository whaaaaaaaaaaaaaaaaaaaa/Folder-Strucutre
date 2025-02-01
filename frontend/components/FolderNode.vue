<template>
  <div 
    class="folder-node"
    :style="{ marginLeft: `${level * 20}px` }"
    :class="{ 'is-dragging': isDragging }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @dragover.prevent
    @drop.prevent="onDrop"
    @contextmenu.prevent="showContextMenu"
  >
    <div class="folder-header" @click="onFolderClick">
      <span class="folder-icon" :class="{ 'is-expanded': isExpanded }">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      </span>
      <span class="folder-name">{{ folder.name }}</span>
      <span class="folder-count">
        ({{ folder.subfolder_count }} folders, {{ folder.file_count }} files)
      </span>
    </div>

    <div v-show="isExpanded" class="folder-content" :class="{ 'expanded': isExpanded }">
      <!-- Files -->
      <div 
        v-for="file in folder.files" 
        :key="file.id"
        class="file-item"
        @contextmenu.prevent="showFileContextMenu($event, file)"
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
        @toggle="$emit('toggle', $event)"
        @select="$emit('select', $event)"
        @drag-start="$emit('drag-start', $event)"
        @drag-end="$emit('drag-end')"
        @drop="$emit('drop', $event)"
      />
    </div>

    <ContextMenu
      :show="showMenu"
      :x="menuX"
      :y="menuY"
      :type="menuType"
      :is-authenticated="isAuthenticated"
      @add-folder="$emit('add-folder', folder.id)"
      @add-file="$emit('add-file', folder.id)"
      @rename="$emit('rename', { id: menuItemId, type: menuType })"
      @move="$emit('move', { id: menuItemId, type: menuType })"
      @delete="$emit('delete', { id: menuItemId, type: menuType })"
      @comment="$emit('comment', { id: menuItemId, type: menuType })"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFolderStructureStore } from '../stores/folderStructure';
import ContextMenu from './ContextMenu.vue';
import FileIcon from './FileIcon.vue';

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

const emit = defineEmits([
  'toggle',
  'select',
  'drag-start',
  'drag-end',
  'drop',
  'add-folder',
  'add-file',
  'rename',
  'move',
  'delete',
  'comment'
]);

const store = useFolderStructureStore();
const isExpanded = computed(() => store.isExpanded(props.structureId, props.folder.id));

const isDragging = ref(false);

// Context menu state
const showMenu = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuType = ref<'file' | 'folder'>('folder');
const menuItemId = ref<number | null>(null);

// Close menu when clicking outside
const closeContextMenu = () => {
  showMenu.value = false;
};

import { onMounted, onUnmounted } from 'vue';
onMounted(() => {
  document.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu);
});

const showContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuType.value = 'folder';
  menuItemId.value = props.folder.id;
  showMenu.value = true;
};

const showFileContextMenu = (event: MouseEvent, file: any) => {
  event.preventDefault();
  menuX.value = event.clientX;
  menuY.value = event.clientY;
  menuType.value = 'file';
  menuItemId.value = file.id;
  showMenu.value = true;
};

const onFolderClick = () => {
  console.log('Folder clicked:', props.folder.id);
  store.toggleFolder(props.structureId, props.folder.id);
};

const onDragStart = (event: DragEvent) => {
  event.dataTransfer?.setData('text/plain', JSON.stringify({
    id: props.folder.id,
    type: 'folder',
    structureId: props.structureId
  }));
  emit('drag-start', props.folder);
};

const onDragEnd = () => {
  emit('drag-end');
};

const onDrop = (event: DragEvent) => {
  event.stopPropagation();
  const data = event.dataTransfer?.getData('text/plain');
  if (data) {
    emit('drop', {
      targetId: props.folder.id,
      targetStructureId: props.structureId,
      data: JSON.parse(data)
    });
  }
};

const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  const typeMap: { [key: string]: string } = {
    // Documents
    'pdf': 'pdf',
    'doc': 'doc',
    'docx': 'doc',
    'txt': 'doc',
    'rtf': 'doc',
    'odt': 'doc',
    
    // Images
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'gif': 'image',
    'svg': 'image',
    'webp': 'image',
    
    // Code
    'js': 'code',
    'ts': 'code',
    'py': 'code',
    'java': 'code',
    'cpp': 'code',
    'html': 'code',
    'css': 'code',
    'json': 'code',
    
    // Archives
    'zip': 'zip',
    'rar': 'zip',
    '7z': 'zip',
    'tar': 'zip',
    'gz': 'zip',
    
    // Media
    'mp3': 'audio',
    'wav': 'audio',
    'ogg': 'audio',
    'mp4': 'video',
    'avi': 'video',
    'mov': 'video',
    'wmv': 'video'
  };
  
  return typeMap[ext] || 'default';
};
</script>

<style scoped>
.folder-node {
  position: relative;
  z-index: 1;
}

.folder-header {
  position: relative;
  display: flex;
  align-items: center;
  padding: 1px 0 1px 4px;
  cursor: pointer;
  z-index: 2;
}

.folder-content {
  position: relative;
  margin-left: 11px;
  border-left: 1px solid #555;
  padding: 1px 0;
  z-index: 1;
  overflow: hidden;
  transition: max-height 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease 0.1s, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  max-height: 0;
  opacity: 0;
  transform: translateY(-6px);
}

.folder-content.expanded {
  max-height: 1000px;
  opacity: 1;
  transform: translateY(0);
  animation: gentle-appear 0.4s ease;
}

@keyframes gentle-appear {
  0% { opacity: 0; transform: translateY(-4px); }
  50% { opacity: 1; transform: translateY(1px); }
  100% { opacity: 1; transform: translateY(0); }
}

.file-item {
  position: relative;
  display: flex;
  align-items: center;
  padding: 1px 0 1px 11px;
  font-size: 14px;
  color: #ddd;
  z-index: 2;
}

.folder-icon,
.file-icon {
  margin-right: 8px;
  font-size: 16px;
  color: #aaa;
  width: 14px;
  text-align: center;
  position: relative;
  z-index: 3;
}

.folder-icon svg {
  fill: #aaa;
  transition: fill 0.2s ease;
}

.folder-icon.is-expanded svg {
  fill: none;
  stroke: #aaa;
}

.folder-name {
  margin-right: 2px;
  color: #fff;
}

.folder-count {
  margin-left: 2px;
  color: #666;
  font-size: 12px;
}
</style>
