&lt;template>
  &lt;div 
    v-if="show"
    class="context-menu"
    :style="{ top: `${y}px`, left: `${x}px` }"
    @click.stop
  >
    &lt;div v-if="type === 'folder'" class="menu-item" @click.stop="$emit('add-folder')">
      &lt;span class="material-icons">create_new_folder&lt;/span>
      Add Folder
    &lt;/div>
    &lt;div v-if="type === 'folder'" class="menu-item" @click.stop="$emit('add-file')">
      &lt;span class="material-icons">note_add&lt;/span>
      Add File
    &lt;/div>
    &lt;div class="menu-item" @click.stop="$emit('rename')">
      &lt;span class="material-icons">edit&lt;/span>
      Rename
    &lt;/div>
    &lt;div class="menu-item" @click.stop="$emit('move')">
      &lt;span class="material-icons">drive_file_move&lt;/span>
      Move
    &lt;/div>
    &lt;div class="menu-item" @click.stop="$emit('delete')">
      &lt;span class="material-icons">delete&lt;/span>
      Delete
    &lt;/div>
    &lt;div class="menu-item" @click.stop="$emit('comment')">
      &lt;span class="material-icons">comment&lt;/span>
      Add Comment
    &lt;/div>
  &lt;/div>
&lt;/template>

&lt;script setup lang="ts">
defineProps<{
  show: boolean
  x: number
  y: number
  type: 'file' | 'folder'
}>();

defineEmits<{
  (e: 'add-folder'): void
  (e: 'add-file'): void
  (e: 'rename'): void
  (e: 'move'): void
  (e: 'delete'): void
  (e: 'comment'): void
}>();
&lt;/script>

&lt;style scoped>
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  padding: 4px 0;
  min-width: 150px;
  z-index: 1000;
}

.menu-item {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.menu-item:hover {
  background: #f5f5f5;
}

.menu-item .material-icons {
  font-size: 18px;
}
&lt;/style>
