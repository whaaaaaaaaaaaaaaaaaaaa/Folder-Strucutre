<template>
  <Teleport to="body">
    <div v-if="show" class="modal-backdrop" @click="$emit('close')">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="close-button" @click="$emit('close')">&times;</button>
        </div>
        <div class="modal-body">
          <input
            v-model="inputValue"
            :placeholder="placeholder"
            class="modal-input"
            @keyup.enter="handleSubmit"
            ref="inputField"
          />
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="$emit('close')">Cancel</button>
          <button class="submit-button" @click="handleSubmit">Submit</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';

const props = defineProps<{
  show: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
}>();

const emit = defineEmits<{
  (e: 'submit', value: string): void;
  (e: 'close'): void;
}>();

const inputValue = ref(props.initialValue || '');
const inputField = ref<HTMLInputElement | null>(null);

watch(() => props.show, (newValue) => {
  if (newValue) {
    // Reset input value when modal is opened
    inputValue.value = props.initialValue || '';
    // Focus the input field
    setTimeout(() => {
      inputField.value?.focus();
    }, 100);
  }
});

const handleSubmit = () => {
  if (inputValue.value.trim()) {
    emit('submit', inputValue.value.trim());
    emit('close');
  }
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #1e1e1e;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
  font-size: 1.2rem;
}

.close-button {
  background: none;
  border: none;
  color: #666;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-button:hover {
  color: #fff;
}

.modal-body {
  padding: 1rem;
}

.modal-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #333;
  border-radius: 4px;
  background-color: #2d2d2d;
  color: #fff;
  font-size: 1rem;
}

.modal-input:focus {
  outline: none;
  border-color: #0078d4;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid #333;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.cancel-button,
.submit-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.cancel-button {
  background-color: #333;
  color: #fff;
}

.cancel-button:hover {
  background-color: #444;
}

.submit-button {
  background-color: #0078d4;
  color: #fff;
}

.submit-button:hover {
  background-color: #0086f0;
}
</style>
