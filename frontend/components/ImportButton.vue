<template>
  <div class="import-button">
    <input
      type="file"
      id="folderInput"
      webkitdirectory
      @change="handleFolderSelect"
      style="display: none;"
    />
    <button @click="triggerFolderSelect">
      Import Folder Structure
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits(['import-complete']);

const triggerFolderSelect = () => {
  const input = document.getElementById('folderInput') as HTMLInputElement;
  if (input) {
    input.click();
  }
};

const handleFolderSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const path = input.files[0].webkitRelativePath.split('/')[0];
    try {
      const response = await fetch('http://localhost:8000/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path }),
      });

      if (response.ok) {
        emit('import-complete');
      } else {
        console.error('Import failed:', await response.json());
      }
    } catch (error) {
      console.error('Error during import:', error);
    }
  }
};
</script>

<style scoped>
.import-button {
  margin: 1rem;
}

button {
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}
</style>
