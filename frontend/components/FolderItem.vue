<template>
  <div class="tree-item" :class="{ 'is-root': !folder.parent_id }">
    <div class="item-wrapper">
      <div class="line-guide" v-if="!isRoot">
        <div class="vertical-line"></div>
        <div class="horizontal-line"></div>
      </div>
      <div
        class="item-header"
        @click="$emit('toggle', folder.id)"
        @contextmenu="handleContextMenu"
      >
        <div class="folder-content">
          <span class="material-icons folder-icon">
            {{ isExpanded ? 'expand_more' : 'chevron_right' }}
          </span>
          <span class="material-icons">
            {{ isExpanded ? 'folder_open' : 'folder' }}
          </span>
          <span class="item-name">{{ folder.name }}</span>
          <span class="item-info">
            ({{ folder.files?.length || 0 }} files, {{ childFolders.length }} folders)
          </span>
          <div v-if="itemComments.length > 0" class="comment-indicator" :title="`${itemComments.length} comments`">
            <span class="material-icons">comment</span>
            <span class="comment-count">{{ itemComments.length }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-show="isExpanded" class="item-content">
      <!-- Files -->
      <div v-if="folder.files && folder.files.length > 0" class="files-group">
        <div
          v-for="(file, index) in folder.files"
          :key="file.id"
          class="file-item-wrapper"
          :class="{ 'is-last': index === folder.files.length - 1 && childFolders.length === 0 }"
        >
          <div class="line-guide">
            <div class="vertical-line"></div>
            <div class="horizontal-line"></div>
          </div>
          <div class="file-item" @contextmenu="handleFileContextMenu(file, $event)">
            <div class="file-content">
              <span class="material-icons file-icon">
                {{ getFileIcon(file.type) }}
              </span>
              <span class="file-name">{{ file.name }}</span>
              <div v-if="getFileComments(file.id).length > 0" class="comment-indicator" :title="`${getFileComments(file.id).length} comments`">
                <span class="material-icons">comment</span>
                <span class="comment-count">{{ getFileComments(file.id).length }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Child Folders -->
      <div class="folders-group">
        <FolderItem
          v-for="(childFolder, index) in childFolders"
          :key="childFolder.id"
          :folder="childFolder"
          :all-folders="allFolders"
          :expanded-folders="expandedFolders"
          :comments="comments"
          :is-admin="isAdmin"
          class="folder-child"
          :class="{ 'is-last': index === childFolders.length - 1 }"
          @toggle="$emit('toggle', $event)"
          @context-menu="$emit('context-menu', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import type { File, Folder, Comment, FolderItem } from '../stores/folderStructure'

const props = defineProps({
  folder: {
    type: Object as PropType<Folder>,
    required: true
  },
  allFolders: {
    type: Array as PropType<Folder[]>,
    required: true
  },
  expandedFolders: {
    type: Object as PropType<Set<number>>,
    required: true
  },
  comments: {
    type: Array as PropType<Comment[]>,
    required: true
  },
  isAdmin: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits<{
  (e: 'toggle', id: number): void
  (e: 'context-menu', data: { event: MouseEvent, item: File | Folder }): void
}>()

const isRoot = computed(() => !props.folder.parent_id)
const childFolders = computed(() => props.allFolders.filter(f => f.parent_id === props.folder.id))
const isExpanded = computed(() => props.expandedFolders.has(props.folder.id))
const itemComments = computed(() =>
  props.comments.filter(c => c.target_id === props.folder.id && c.target_type === 'folder')
)

const getFileComments = (fileId: number) => {
  return props.comments.filter(c => c.target_id === fileId && c.target_type === 'file')
}

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  emit('context-menu', {
    event,
    item: props.folder
  });
};

const handleFileContextMenu = (file: File, event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  emit('context-menu', {
    event,
    item: file
  });
};

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
.tree-item {
  position: relative;
  margin-left: 24px;
}

.tree-item.is-root {
  margin-left: 0;
}

.item-wrapper {
  position: relative;
  display: flex;
  min-height: 32px;
}

.line-guide {
  position: absolute;
  left: -24px;
  top: 0;
  bottom: 0;
  width: 24px;
}

.vertical-line {
  position: absolute;
  left: 11px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #444;
}

.horizontal-line {
  position: absolute;
  left: 11px;
  top: 50%;
  width: 13px;
  height: 2px;
  background-color: #444;
}

.item-header {
  flex: 1;
  display: flex;
  padding: 4px 8px;
  margin: 2px 0;
  cursor: pointer;
  border-radius: 4px;
  background-color: #1a1a1a;
}

.item-header:hover {
  background-color: #2a2a2a;
}

.folder-content,
.file-content {
  display: flex;
  align-items: center;
  width: 100%;
}

.item-content {
  position: relative;
}

.item-content::before {
  content: '';
  position: absolute;
  left: -13px;
  top: 0;
  bottom: 8px;
  width: 2px;
  background-color: #444;
}

.files-group {
  position: relative;
  margin: 4px 0;
}

.file-item-wrapper {
  position: relative;
  display: flex;
  min-height: 28px;
}

.file-item-wrapper.is-last .vertical-line {
  bottom: 50%;
}

.file-item {
  flex: 1;
  display: flex;
  padding: 4px 8px;
  margin: 2px 0;
  border-radius: 4px;
  background-color: #1a1a1a;
}

.file-item:hover {
  background-color: #2a2a2a;
}

.folders-group {
  position: relative;
  margin: 4px 0;
}

.folder-child.is-last + .folder-child .vertical-line,
.folder-child.is-last .item-content::before {
  display: none;
}

.material-icons {
  font-size: 18px;
  margin-right: 4px;
  color: #888;
}

.folder-icon {
  width: 20px;
}

.item-name {
  margin-left: 4px;
  font-weight: 500;
  color: #e0e0e0;
}

.item-info {
  margin-left: 8px;
  font-size: 0.8rem;
  color: #888;
}

.file-icon {
  color: #666;
}

.file-name {
  margin-left: 4px;
  font-size: 0.9rem;
  color: #d0d0d0;
}

.comment-indicator {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 2px 6px;
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  font-size: 0.8rem;
}

.comment-indicator .material-icons {
  font-size: 14px;
  margin-right: 0;
  color: #ffeb3b;
}

.comment-count {
  color: #ffeb3b;
}
</style>
