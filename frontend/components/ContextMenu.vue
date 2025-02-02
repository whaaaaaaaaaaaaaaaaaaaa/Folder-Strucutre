<template>
  <div 
    v-if="show"
    class="context-menu"
    :style="{ top: `${y}px`, left: `${x}px` }"
    @click.stop
  >
    <div v-if="type === 'folder'" class="menu-item" @click.stop="$emit('add-folder')">
      <span class="material-icons">create_new_folder</span>
      Add Folder
    </div>
    <div v-if="type === 'folder'" class="menu-item" @click.stop="$emit('add-file')">
      <span class="material-icons">note_add</span>
      Add File
    </div>
    <div class="menu-item" @click.stop="$emit('rename')">
      <span class="material-icons">edit</span>
      Rename
    </div>
    <div class="menu-item" @click.stop="$emit('move')">
      <span class="material-icons">drive_file_move</span>
      Move
    </div>
    <div class="menu-item danger" @click.stop="$emit('delete')">
      <span class="material-icons">delete</span>
      Delete
    </div>
    <div class="menu-item" @click.stop="$emit('comment')">
      <span class="material-icons">comment</span>
      Add Comment
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  x: number
  y: number
  type: 'file' | 'folder'
  isAuthenticated: boolean
}>();

defineEmits<{
  (e: 'add-folder'): void
  (e: 'add-file'): void
  (e: 'rename'): void
  (e: 'move'): void
  (e: 'delete'): void
  (e: 'comment'): void
}>();
</script>

<style scoped>
.context-menu {
  position: fixed;
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  padding: 4px 0;
  min-width: 180px;
  z-index: 1000;
  color: #fff;
}

.menu-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.menu-item:hover {
  background: #2a2a2a;
}

.menu-item.danger {
  color: #ff4444;
}

.menu-item.danger:hover {
  background: #2a1a1a;
}

.menu-item .material-icons {
  font-size: 18px;
  opacity: 0.9;
}
</style>
