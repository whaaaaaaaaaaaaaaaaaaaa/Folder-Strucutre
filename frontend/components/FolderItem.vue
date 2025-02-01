<template>
  <div 
    class="folder-item"
    :class="{ 'is-dragging': isDragging }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
    @contextmenu.prevent="showContextMenu"
  >
    <div class="item-content" :style="{ marginLeft: `${level * 20}px` }">
      <!-- Connecting lines -->
      <div v-if="level > 0" class="connecting-lines">
        <div class="vertical-line" :style="{ height: '100%', left: `${(level - 1) * 20 + 10}px` }"></div>
        <div class="horizontal-line" :style="{ width: '10px', left: `${(level - 1) * 20 + 10}px` }"></div>
      </div>

      <!-- Folder/File icon and name -->
      <div class="item-header" @click="toggleFolder">
        <span v-if="folder.type === 'folder'" class="material-icons folder-icon" :class="{ 'expanded': isExpanded }">
          {{ isExpanded ? 'folder_open' : 'folder' }}
        </span>
        <span v-else class="material-icons file-icon">description</span>
        <span class="item-name">{{ folder.name }}</span>
        
        <!-- Comment indicator -->
        <div v-if="hasComments" class="comment-indicator" @click.stop="$emit('view-comments', folder)">
          <span class="material-icons" :style="{ color: commentColor }">comment</span>
          <div class="comment-preview">
            {{ latestComment }}
          </div>
        </div>
      </div>
    </div>

    <!-- Child items -->
    <div v-if="isExpanded && hasChildren" class="children">
      <FolderItem
        v-for="child in children"
        :key="child.id"
        :folder="child"
        :level="level + 1"
        :all-folders="allFolders"
        :expanded-folders="expandedFolders"
        :comments="comments"
        :is-admin="isAdmin"
        @toggle="$emit('toggle', $event)"
        @context-menu="$emit('context-menu', $event)"
        @drop="$emit('drop', $event)"
        @view-comments="$emit('view-comments', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  folder: any
  level?: number
  allFolders: any[]
  expandedFolders: Set<number>
  comments: any[]
  isAdmin: boolean
}>()

const emit = defineEmits(['toggle', 'context-menu', 'drop', 'view-comments'])

const level = computed(() => props.level || 0)
const isDragging = ref(false)

const isExpanded = computed(() => props.expandedFolders.has(props.folder.id))
const children = computed(() => props.allFolders.filter(f => f.parent_id === props.folder.id))
const hasChildren = computed(() => children.value.length > 0)

const folderComments = computed(() => {
  return props.comments.filter(c => c.item_id === props.folder.id && c.item_type === props.folder.type)
})

const hasComments = computed(() => folderComments.value.length > 0)
const latestComment = computed(() => {
  const comment = folderComments.value[folderComments.value.length - 1]
  return comment ? comment.content.substring(0, 50) + (comment.content.length > 50 ? '...' : '') : ''
})

const commentColor = computed(() => {
  const comment = folderComments.value[folderComments.value.length - 1]
  return comment ? comment.color : '#4CAF50'
})

const toggleFolder = () => {
  if (props.folder.type === 'folder') {
    emit('toggle', props.folder.id)
  }
}

const handleDragStart = (event: DragEvent) => {
  isDragging.value = true
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify({
      id: props.folder.id,
      type: props.folder.type,
      name: props.folder.name,
      structure_id: props.folder.structure_id
    }))
  }
}

const handleDragEnd = () => {
  isDragging.value = false
}

const handleDragOver = (event: DragEvent) => {
  if (props.folder.type === 'folder') {
    event.preventDefault()
  }
}

const handleDrop = (event: DragEvent) => {
  if (!event.dataTransfer) return
  
  const data = JSON.parse(event.dataTransfer.getData('text/plain'))
  emit('drop', {
    sourceId: data.id,
    targetId: props.folder.id,
    sourceType: data.type,
    sourceStructureId: data.structure_id,
    targetStructureId: props.folder.structure_id
  })
}

const showContextMenu = (event: MouseEvent) => {
  emit('context-menu', { event, item: props.folder })
}
</script>

<style scoped>
.folder-item {
  position: relative;
  user-select: none;
}

.item-content {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.item-content:hover {
  background-color: var(--hover-color);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  width: 100%;
}

.connecting-lines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.vertical-line {
  position: absolute;
  width: 2px;
  background-color: var(--border-color);
}

.horizontal-line {
  position: absolute;
  height: 2px;
  top: 50%;
  background-color: var(--border-color);
}

.folder-icon, .file-icon {
  color: var(--primary-color);
  transition: transform 0.2s;
}

.folder-icon.expanded {
  transform: rotate(0deg);
}

.item-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comment-indicator {
  position: relative;
  cursor: pointer;
  padding: 4px;
}

.comment-preview {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 8px;
  width: 200px;
  display: none;
  z-index: 10;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.comment-indicator:hover .comment-preview {
  display: block;
}

.is-dragging {
  opacity: 0.5;
}

.children {
  margin-left: 20px;
}
</style>
