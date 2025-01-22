<template>
  <div class="folder-item">
    <div 
      class="folder-header" 
      @click="$emit('toggle', folder)"
      @contextmenu.prevent="$emit('context-menu', $event, 'folder', folder)"
    >
      <span class="icon">{{ expanded ? '📂' : '📁' }}</span>
      <span class="name">{{ getFolderName(folder.path) }}</span>
    </div>
    
    <div v-if="expanded" class="folder-content">
      <div 
        v-for="childFolder in folder.children" 
        :key="childFolder.id"
        class="folder"
      >
        <FolderItem 
          :folder="childFolder"
          :expanded-folders="expandedFolders"
          @toggle="$emit('toggle', $event)"
          @context-menu="$emit('context-menu', $event)"
        />
      </div>
      
      <div
        v-for="file in getFilesInFolder(folder.id)"
        :key="file.id"
        class="file"
        @contextmenu.prevent="$emit('context-menu', $event, 'file', file)"
      >
        <span class="icon">{{ getFileIcon(file.type) }}</span>
        <span class="name">{{ file.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Folder {
  id: number;
  path: string;
  parent_id: number | null;
  children: Folder[];
}

interface File {
  id: number;
  name: string;
  folder_id: number;
  type: string;
}

const props = defineProps<{
  folder: Folder;
  expandedFolders: number[];
}>();

const emit = defineEmits<{
  (e: 'toggle', folder: Folder): void;
  (e: 'context-menu', event: MouseEvent, type: string, item: Folder | File): void;
}>();

const expanded = computed(() => props.expandedFolders.includes(props.folder.id));

function getFolderName(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

function getFileIcon(type: string) {
  const icons: { [key: string]: string } = {
    pdf: '📕',
    doc: '📘',
    docx: '📘',
    txt: '📄',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎥',
    mp3: '🎵',
    zip: '📦',
    rar: '📦',
    exe: '⚙️',
    unknown: '📄'
  };
  return icons[type.toLowerCase()] || icons.unknown;
}

function getFilesInFolder(folderId: number) {
  // This should be passed from parent or managed through a store
  return [];
}
</script>

<style scoped>
.folder-item {
  margin-left: 20px;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 5px;
  cursor: pointer;
  user-select: none;
}

.folder-header:hover {
  background-color: #f5f5f5;
}

.folder-content {
  margin-left: 20px;
}

.icon {
  margin-right: 5px;
}

.file {
  display: flex;
  align-items: center;
  padding: 5px;
  cursor: pointer;
  user-select: none;
}

.file:hover {
  background-color: #f5f5f5;
}
</style>
