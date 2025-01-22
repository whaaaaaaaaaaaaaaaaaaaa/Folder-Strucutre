<template>
  <div class="file-explorer">
    <div v-if="!isLoggedIn" class="login-section">
      <input 
        type="password" 
        v-model="password" 
        placeholder="Enter admin password"
        @keyup.enter="login"
        class="input"
      />
      <button @click="login" class="button">Login</button>
    </div>

    <div v-else>
      <div class="import-section" v-if="!hasImportedData">
        <div class="import-card">
          <span class="material-icons import-icon">folder_open</span>
          <h2>Import Directory</h2>
          <p>Enter the path to your directory to begin exploring</p>
          <div class="import-form">
            <input 
              v-model="directoryPath" 
              placeholder="Enter directory path..."
              @keyup.enter="importDirectory"
              class="input"
            >
            <button @click="importDirectory" :disabled="!directoryPath" class="button">
              <span class="material-icons">upload_file</span>
              Import
            </button>
          </div>
        </div>
      </div>

      <div v-else class="explorer-content">
        <div class="toolbar">
          <button class="secondary" @click="reimportDirectory">
            <span class="material-icons">refresh</span>
            Reimport
          </button>
        </div>
        
        <div class="tree-view">
          <div 
            v-for="item in structure" 
            :key="item.id" 
            class="tree-item"
            @contextmenu.prevent="showContextMenu($event, item)"
          >
            <div 
              class="item-content"
              :style="{ paddingLeft: item.level * 20 + 'px' }"
              @click="toggleFolder(item)"
            >
              <span class="material-icons item-icon" v-if="item.type === 'folder'">
                {{ item.expanded ? 'folder_open' : 'folder' }}
              </span>
              <span class="material-icons item-icon" v-else>
                {{ getFileIcon(item.name) }}
              </span>
              <span class="item-name">{{ item.name }}</span>
            </div>
          </div>
        </div>

        <!-- Context Menu -->
        <div 
          v-if="showMenu" 
          class="context-menu"
          :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }"
        >
          <div v-if="selectedItem.type === 'folder'" class="context-menu-items">
            <div class="context-menu-item" @click="addNewFile">
              <span class="material-icons">note_add</span>
              Add File
            </div>
            <div class="context-menu-item" @click="renameItem">
              <span class="material-icons">edit</span>
              Rename
            </div>
            <div class="context-menu-item" @click="deleteItem">
              <span class="material-icons">delete</span>
              Delete
            </div>
          </div>
          <div v-else class="context-menu-items">
            <div class="context-menu-item" @click="renameItem">
              <span class="material-icons">edit</span>
              Rename
            </div>
            <div class="context-menu-item" @click="moveItem">
              <span class="material-icons">drive_file_move</span>
              Move
            </div>
            <div class="context-menu-item" @click="deleteItem">
              <span class="material-icons">delete</span>
              Delete
            </div>
          </div>
        </div>

        <!-- Modal for adding/editing files -->
        <div v-if="showModal" class="modal">
          <div class="modal-content">
            <h3>{{ modalTitle }}</h3>
            <input 
              v-model="modalInput" 
              :placeholder="modalPlaceholder"
              @keyup.enter="confirmModal"
              class="input"
            >
            <div class="modal-actions">
              <button class="secondary" @click="cancelModal">Cancel</button>
              <button @click="confirmModal">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface StructureItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
  parent_id: number | null;
  level: number;
  expanded?: boolean;
  path?: string;
}

// State variables
const directoryPath = ref('');
const hasImportedData = ref(false);
const structure = ref<StructureItem[]>([]);
const showMenu = ref(false);
const menuPosition = ref({ x: 0, y: 0 });
const selectedItem = ref<StructureItem | null>(null);
const showModal = ref(false);
const modalTitle = ref('');
const modalInput = ref('');
const modalPlaceholder = ref('');
const modalCallback = ref<((value: string) => void) | null>(null);

// Auth state
const isLoggedIn = ref(false);
const password = ref('');
const authToken = ref('');

const login = async () => {
  try {
    const response = await fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: password.value }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    authToken.value = data.token;
    isLoggedIn.value = true;
    password.value = ''; // Clear password after successful login
  } catch (error) {
    console.error('Login error:', error);
    alert(error.message || 'Login failed. Please check your password and try again.');
  }
};

// Functions
const importDirectory = async () => {
  try {
    console.log('Starting import for path:', directoryPath.value);

    // Make the request
    const response = await fetch('http://localhost:8000/folders/import-directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.value}`,
      },
      body: JSON.stringify({ path: directoryPath.value }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Log the raw response
    const responseText = await response.text();
    console.log('Raw response text:', responseText);
    console.log('Response text length:', responseText.length);

    // Try to parse the response
    let data;
    try {
      if (!responseText) {
        throw new Error('Empty response from server');
      }
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
    } catch (e) {
      console.error('Failed to parse response:', e);
      console.error('Response that failed to parse:', responseText);
      throw new Error(`Server returned invalid JSON: ${e.message}`);
    }

    // Check for errors
    if (!data.success) {
      throw new Error(data.error || 'Unknown error occurred');
    }

    // Log success data
    console.log('Import successful:', data);

    // Update UI
    await loadStructure();
    hasImportedData.value = true;
  } catch (error) {
    console.error('Import failed:', error);
    alert(error.message || 'Failed to import directory');
  }
};

const loadStructure = async () => {
  try {
    const response = await fetch('http://localhost:8000/structure', {
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to load structure');
    }
    const data = await response.json();
    structure.value = processStructure(data);
  } catch (error) {
    console.error('Error loading structure:', error);
    alert('Failed to load folder structure');
  }
};

const processStructure = (data: StructureItem[]) => {
  return data.map(item => ({
    ...item,
    expanded: false,
    level: calculateLevel(item, data)
  }));
};

const calculateLevel = (item: StructureItem, allItems: StructureItem[]): number => {
  let level = 0;
  let currentItem = item;
  
  while (currentItem.parent_id) {
    level++;
    currentItem = allItems.find(i => i.id === currentItem.parent_id) || currentItem;
    if (!currentItem) break;
  }
  
  return level;
};

const reimportDirectory = async () => {
  if (confirm('This will delete all existing data. Are you sure?')) {
    await importDirectory();
  }
};

const showContextMenu = (event: MouseEvent, item: StructureItem) => {
  event.preventDefault();
  event.stopPropagation();
  showMenu.value = true;
  menuPosition.value = {
    x: event.clientX,
    y: event.clientY,
  };
  selectedItem.value = item;
};

const toggleFolder = (item: StructureItem) => {
  if (item.type === 'folder') {
    item.expanded = !item.expanded;
  }
};

const addNewFile = () => {
  if (!selectedItem.value) return;
  
  modalTitle.value = 'Add New File';
  modalPlaceholder.value = 'Enter file name (with extension)';
  modalInput.value = '';
  showModal.value = true;
  modalCallback.value = async (fileName: string) => {
    try {
      const response = await fetch('http://localhost:8000/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken.value}`,
        },
        body: JSON.stringify({
          name: fileName,
          parentId: selectedItem.value?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add file');
      }

      await loadStructure();
    } catch (error) {
      console.error('Error adding file:', error);
      alert('Failed to add file');
    }
  };
};

const renameItem = () => {
  if (!selectedItem.value) return;

  modalTitle.value = `Rename ${selectedItem.value.type}`;
  modalPlaceholder.value = 'Enter new name';
  modalInput.value = selectedItem.value.name;
  showModal.value = true;
  modalCallback.value = async (newName: string) => {
    try {
      const response = await fetch(`http://localhost:8000/${selectedItem.value?.type}s/${selectedItem.value?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken.value}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename item');
      }

      await loadStructure();
    } catch (error) {
      console.error('Error renaming item:', error);
      alert('Failed to rename item');
    }
  };
};

const moveItem = () => {
  if (!selectedItem.value) return;
  
  const folders = structure.value.filter(item => item.type === 'folder');
  modalTitle.value = `Move ${selectedItem.value.type}`;
  modalPlaceholder.value = 'Select destination folder';
  showModal.value = true;
  // TODO: Implement folder selection UI
};

const deleteItem = async () => {
  if (!selectedItem.value) return;

  if (confirm(`Are you sure you want to delete this ${selectedItem.value.type}?`)) {
    try {
      const response = await fetch(`http://localhost:8000/${selectedItem.value.type}s/${selectedItem.value.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken.value}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      await loadStructure();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  }
};

const confirmModal = () => {
  if (modalCallback.value) {
    modalCallback.value(modalInput.value);
  }
  showModal.value = false;
};

const cancelModal = () => {
  showModal.value = false;
};

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch(ext) {
    case 'pdf': return 'picture_as_pdf';
    case 'doc':
    case 'docx': return 'description';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif': return 'image';
    case 'mp3':
    case 'wav': return 'audio_file';
    case 'mp4':
    case 'mov': return 'video_file';
    default: return 'insert_drive_file';
  }
};

// Initialize
onMounted(async () => {
  try {
    const response = await fetch('http://localhost:8000/structure', {
      headers: {
        'Authorization': `Bearer ${authToken.value}`,
      },
    });
    if (response.ok) {
      const data = await response.json();
      structure.value = processStructure(data);
      hasImportedData.value = data.length > 0;
    }
  } catch (error) {
    console.error('Error checking structure:', error);
  }

  // Only add event listeners on client side
  if (typeof window !== 'undefined') {
    const closeContextMenu = (event: MouseEvent) => {
      if (showMenu.value) {
        showMenu.value = false;
      }
    };

    document.addEventListener('click', closeContextMenu);
    
    // Clean up on component unmount
    onUnmounted(() => {
      document.removeEventListener('click', closeContextMenu);
    });
  }
});
</script>

<style scoped>
.file-explorer {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--background-color);
}

.login-section {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.import-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.import-card {
  background-color: var(--surface-color);
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.import-icon {
  font-size: 4rem;
  color: var(--primary-color);
  margin-bottom: 1rem;
}

.import-form {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.import-form input {
  flex: 1;
}

.explorer-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 1rem;
}

.tree-view {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.tree-item {
  margin: 2px 0;
}

.item-content {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.item-content:hover {
  background-color: var(--hover-color);
}

.item-icon {
  margin-right: 0.5rem;
  color: var(--text-secondary);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--surface-color);
  padding: 2rem;
  border-radius: 8px;
  min-width: 400px;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.modal-content input {
  width: 100%;
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  flex: 1;
}

.button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.button:hover {
  background-color: #45a049;
}

/* Make sure context menu is above other elements */
.context-menu {
  position: fixed;
  z-index: 1000;
}
</style>