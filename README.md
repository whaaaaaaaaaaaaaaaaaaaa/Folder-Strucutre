# Folder Structure Manager

A full-stack application for managing folder structures, built with Deno, SQLite, and Nuxt 3.

## Features

- Import existing directory structures
- View folders and files in a cascading UI
- Right-click context menu for file/folder operations
- Add new files to folders
- Rename files and folders
- Move files between folders
- Delete files and folders

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Deno](https://deno.land/) (v1.37 or higher)

## Setup

1. Install backend dependencies:
   ```bash
   cd backend
   ```
   No additional steps needed as Deno manages dependencies automatically.

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

3. Install root dependencies:
   ```bash
   npm install
   ```

## Running the Application

1. Start both frontend and backend servers:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server at http://localhost:8000
   - Frontend application at http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Enter a directory path to import its structure
3. Use the cascading UI to browse folders and files
4. Right-click on folders to:
   - Add new files
   - Rename folder
   - Delete folder
5. Right-click on files to:
   - Rename file
   - Move file to different folder
   - Delete file

## Technology Stack

- **Backend**
  - Deno (TypeScript runtime)
  - Oak (Web framework)
  - SQLite (Database)

- **Frontend**
  - Nuxt 3 (Vue.js framework)
  - TypeScript
  - Vue 3 Composition API
