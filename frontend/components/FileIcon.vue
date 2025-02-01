<template>
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    stroke-width="2" 
    stroke-linecap="round" 
    stroke-linejoin="round"
  >
    <template v-if="type === 'pdf'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <text x="8" y="19" font-size="8" fill="currentColor">PDF</text>
    </template>

    <template v-else-if="type === 'image'">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </template>

    <template v-else-if="type === 'doc'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
    </template>

    <template v-else-if="type === 'code'">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </template>

    <template v-else-if="type === 'zip'">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M10 10h4v4h-4z" />
    </template>

    <template v-else-if="type === 'audio'">
      <circle cx="5.5" cy="17.5" r="2.5"/>
      <circle cx="18.5" cy="17.5" r="2.5"/>
      <path d="M8 17V5l12-2v14"/>
    </template>

    <template v-else-if="type === 'video'">
      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
      <path d="M10 8l6 4-6 4V8z"/>
    </template>

    <template v-else>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </template>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  type: string
}>();
</script>

<style scoped>
svg {
  color: #ddd;
}
</style>
