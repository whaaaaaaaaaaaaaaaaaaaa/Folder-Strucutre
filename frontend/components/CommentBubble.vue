&lt;template>
  &lt;div class="comment-container" :style="{ top: `${y}px`, left: `${x}px` }">
    &lt;div class="comment-bubble" :style="{ backgroundColor: comment.color }">
      &lt;div class="comment-header">
        &lt;span class="comment-timestamp">{{ formatTimestamp(comment.timestamp) }}&lt;/span>
        &lt;button v-if="isAuthenticated" class="delete-button" @click="$emit('delete', comment.id)">
          &lt;span class="material-icons">close&lt;/span>
        &lt;/button>
      &lt;/div>
      &lt;div class="comment-text">{{ comment.text }}&lt;/div>
      &lt;div class="comment-pointer">&lt;/div>
    &lt;/div>
  &lt;/div>
&lt;/template>

&lt;script setup lang="ts">
interface Comment {
  id: number;
  text: string;
  color: string;
  timestamp: string;
}

defineProps<{
  comment: Comment;
  x: number;
  y: number;
  isAuthenticated: boolean;
}>();

defineEmits<{
  delete: [id: number];
}>();

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}
&lt;/script>

&lt;style scoped>
.comment-container {
  position: absolute;
  z-index: 100;
  pointer-events: all;
}

.comment-bubble {
  position: relative;
  min-width: 200px;
  max-width: 300px;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-left: 16px;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  font-size: 0.8em;
  color: rgba(0, 0, 0, 0.6);
}

.delete-button {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-button:hover {
  opacity: 1;
}

.comment-text {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.comment-pointer {
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-top: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-right: 8px solid currentColor;
}

.material-icons {
  font-size: 16px;
}
&lt;/style>
