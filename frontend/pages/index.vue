<template>
  <div class="container">
    <div class="header">
      <h1>Folder Structure Explorer</h1>
      <p class="subtitle">Import, organize, and manage your directory structure</p>
    </div>
    <FileExplorer />
  </div>
</template>

<script setup lang="ts">
import FileExplorer from '~/components/FileExplorer.vue';
</script>

<style>
:root {
  --primary-color: #4CAF50;
  --primary-hover: #45a049;
  --background-color: #1e1e1e;
  --surface-color: #2d2d2d;
  --text-color: #ffffff;
  --text-secondary: #b0b0b0;
  --border-color: #404040;
  --hover-color: #3d3d3d;
}

body {
  background-color: var(--background-color);
  color: var(--text-color);
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  padding: 2rem;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
}

h1 {
  margin: 0;
  font-size: 2.5rem;
  font-weight: 600;
  background: linear-gradient(45deg, #4CAF50, #8BC34A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: var(--text-secondary);
  margin: 0.5rem 0 0;
  font-size: 1.1rem;
}

/* Global styles for buttons and inputs */
button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--primary-hover);
}

button.secondary {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

button.secondary:hover {
  background-color: var(--hover-color);
}

input {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  color: var(--text-color);
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 1rem;
}

input:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* Context menu styles */
.context-menu {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 0.5rem 0;
}

.context-menu-item {
  padding: 0.5rem 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color);
}

.context-menu-item:hover {
  background-color: var(--hover-color);
}

.context-menu-item .material-icons {
  font-size: 1.2rem;
  color: var(--text-secondary);
}
</style>
