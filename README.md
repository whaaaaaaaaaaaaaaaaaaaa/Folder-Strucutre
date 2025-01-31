# Folder Structure Manager

A full-stack application for managing folder structures, built with Deno, SQLite, and Nuxt 3. The application allows users to import and manage both local and network directory structures with a modern, user-friendly interface.

## Features

- Secure authentication system for protected operations
- Import existing directory structures (local and network paths)
- View folders and files in a cascading UI
- Right-click context menu for file/folder operations
- Add new files to folders
- Rename files and folders
- Move files between folders
- Delete files and folders
- SQLite database for persistent storage
- Cross-platform support (Windows, Linux, macOS)

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Deno](https://deno.land/) (v1.37 or higher)
- [SQLite](https://www.sqlite.org/) (included with Deno)

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd folder-structure-manager
   ```

2. Set up environment variables:
   ```bash
   cd backend
   cp .env.example .env
   ```
   Edit `.env` file and set:
   - `ADMIN_PASSWORD`: Your desired admin password
   - `JWT_SECRET`: A secure random string for JWT token signing

3. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Install root dependencies:
   ```bash
   cd ..
   npm install
   ```

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   deno task dev
   ```
   This will start the backend server at http://localhost:8000

2. In a new terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
   This will start the frontend application at http://localhost:3000

## Usage

1. Open http://localhost:3000 in your browser
2. Log in using the admin password set in your `.env` file
3. Enter a directory path to import its structure
   - Can be a local path (e.g., `C:\Users\username\Documents`)
   - Can be a network path (e.g., `\\server\share\folder`)
4. Use the cascading UI to browse folders and files
5. Right-click on folders to:
   - Add new files
   - Rename folder
   - Delete folder and its contents
6. Right-click on files to:
   - Rename file
   - Move file to different folder
   - Delete file

## Technology Stack

### Backend
- **Deno** - Modern TypeScript runtime
- **Oak** - Web framework for Deno
- **SQLite** - Lightweight, file-based database
- **JWT** - JSON Web Tokens for authentication
- **jose** - JWT implementation

### Frontend
- **Nuxt 3** - Vue.js framework
- **TypeScript** - Type-safe JavaScript
- **Vue 3 Composition API** - Modern Vue.js features
- **Material Icons** - Google's Material Design icons

## Development

The application uses a modern development setup:
- Hot module replacement (HMR) for both frontend and backend
- TypeScript for type safety
- ESLint and Prettier for code formatting
- SQLite with WAL mode for better performance
- CORS enabled for local development

## Deployment

The application can be deployed on any platform that supports Deno and Node.js. For Raspberry Pi deployment:

1. Install prerequisites:
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # Install Deno
   curl -fsSL https://deno.land/x/install/install.sh | sh
   ```

2. Follow the standard setup instructions above

3. For production deployment, consider:
   - Using a process manager (e.g., PM2)
   - Setting up HTTPS
   - Configuring proper file permissions
   - Regular database backups

## Troubleshooting

Common issues and solutions:

1. **Permission Denied**: Ensure you have read/write permissions for the target directories
2. **Network Path Error**: Make sure network paths are accessible and properly formatted
3. **Database Errors**: Check if the `db` directory exists and is writable
4. **Authentication Issues**: Verify your `.env` file is properly configured

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[MIT License](LICENSE)
