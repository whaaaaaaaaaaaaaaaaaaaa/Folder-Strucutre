<template>
  <div class="app">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import FileExplorer from './components/FileExplorer.vue';
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100vh;
  background: #121212;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.app {
  height: 100vh;
  width: 100vw;
  margin: 0;
  padding: 0;
  overflow: hidden;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

* {
  box-sizing: border-box;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #4a4a4a;
}
</style>
