<template>
  <div class="folder-tree-item">
    <div 
      class="folder-header" 
      @click="$emit('toggle-folder', folder.id)"
      :class="{ 'expanded': expandedFolders.includes(folder.id) }"
    >
      <div class="indent" :style="{ width: `${getDepth() * 20}px` }"></div>
      <span class="expand-icon material-icons">
        {{ expandedFolders.includes(folder.id) ? 'expand_more' : 'chevron_right' }}
      </span>
      <span class="folder-icon material-icons">folder</span>
      <span class="name">{{ getFolderName() }}</span>
      <div v-if="isAuthenticated" class="actions">
        <button 
          class="icon-button"
          @click.stop="$emit('edit-item', { id: folder.id, type: 'folder', name: getFolderName() })"
          title="Rename"
        >
          <span class="material-icons">edit</span>
        </button>
        <button 
          class="icon-button"
          @click.stop="$emit('move-item', { id: folder.id, type: 'folder' })"
          title="Move"
        >
          <span class="material-icons">drive_file_move</span>
        </button>
        <button 
          class="icon-button"
          @click.stop="$emit('delete-item', { id: folder.id, type: 'folder' })"
          title="Delete"
        >
          <span class="material-icons">delete</span>
        </button>
      </div>
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
          @edit-item="$emit('edit-item', $event)"
          @move-item="$emit('move-item', $event)"
          @delete-item="$emit('delete-item', $event)"
        />
      </template>
      
      <!-- Files in current folder -->
      <div
        v-for="file in folderFiles"
        :key="file.id"
        class="file-item"
      >
        <div class="indent" :style="{ width: `${(getDepth() + 1) * 20}px` }"></div>
        <span class="file-icon material-icons">{{ getFileIcon(file.type) }}</span>
        <span class="name">{{ file.name }}</span>
        <div v-if="isAuthenticated" class="actions">
          <button 
            class="icon-button"
            @click.stop="$emit('edit-item', { id: file.id, type: 'file', name: file.name })"
            title="Rename"
          >
            <span class="material-icons">edit</span>
          </button>
          <button 
            class="icon-button"
            @click.stop="$emit('move-item', { id: file.id, type: 'file' })"
            title="Move"
          >
            <span class="material-icons">drive_file_move</span>
          </button>
          <button 
            class="icon-button"
            @click.stop="$emit('delete-item', { id: file.id, type: 'file' })"
            title="Delete"
          >
            <span class="material-icons">delete</span>
          </button>
        </div>
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
}

interface File {
  id: number;
  name: string;
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

defineEmits<{
  (e: 'toggle-folder', id: number): void;
  (e: 'edit-item', item: { id: number; type: 'folder' | 'file'; name: string }): void;
  (e: 'move-item', item: { id: number; type: 'folder' | 'file' }): void;
  (e: 'delete-item', item: { id: number; type: 'folder' | 'file' }): void;
}>();

const childFolders = computed(() => {
  return props.allFolders.filter(f => f.parent_id === props.folder.id);
});

const folderFiles = computed(() => {
  return props.files.filter(f => f.folder_id === props.folder.id);
});

function getFolderName() {
  return props.folder.path.split(/[/\\]/).pop() || props.folder.path;
}

function getDepth() {
  let depth = 0;
  let current = props.folder;
  while (current.parent_id !== null) {
    depth++;
    current = props.allFolders.find(f => f.id === current.parent_id)!;
  }
  return depth;
}

function getFileIcon(type: string) {
  const icons: { [key: string]: string } = {
    pdf: 'picture_as_pdf',
    doc: 'description',
    docx: 'description',
    txt: 'article',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'gif',
    mp3: 'audiotrack',
    mp4: 'movie',
    zip: 'folder_zip',
    rar: 'folder_zip'
  };
  return icons[type.toLowerCase()] || 'insert_drive_file';
}
</script>

<style scoped>
.folder-tree-item {
  font-family: system-ui, -apple-system, sans-serif;
}

.folder-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  margin: 2px 0;
}

.folder-header:hover {
  background-color: #f5f5f5;
}

.folder-header.expanded {
  background-color: #f0f0f0;
}

.indent {
  display: inline-block;
  flex-shrink: 0;
}

.expand-icon {
  color: #666;
  transition: transform 0.2s;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.folder-header.expanded .expand-icon {
  transform: rotate(0deg);
}

.folder-icon {
  color: #FFA000;
  margin-right: 4px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
}

.file-item:hover {
  background-color: #f5f5f5;
}

.file-icon {
  color: #666;
  margin-right: 4px;
}

.name {
  font-size: 14px;
  color: #333;
}

.material-icons {
  font-size: 20px;
}

.actions {
  display: none;
  gap: 0.25rem;
}

.folder-header:hover .actions,
.file-item:hover .actions {
  display: flex;
}

.icon-button {
  padding: 4px;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.icon-button:hover {
  background-color: #e0e0e0;
  color: #333;
}
</style>
