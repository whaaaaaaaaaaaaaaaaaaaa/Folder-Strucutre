<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
      variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
      variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      variant === 'outline' && 'border border-input hover:bg-accent hover:text-accent-foreground',
      variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
      variant === 'link' && 'underline-offset-4 hover:underline text-primary',
      size === 'default' && 'h-10',
      size === 'sm' && 'h-9 px-3',
      size === 'lg' && 'h-11 px-8',
      size === 'icon' && 'h-10 w-10',
      className
    ]"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'default',
  className: '',
  disabled: false,
})</script>