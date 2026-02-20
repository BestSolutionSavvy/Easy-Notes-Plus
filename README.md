# Easy Notes Plus

A modern desktop application for taking notes on PDF documents, built with Electron, Vue 3, and TypeScript.

Download your PDF slides, open them in Easy Notes Plus, and take synchronized notes on the right side. Your notes are automatically linked to the corresponding PDF pages, making it easy to review and study later.

## Features

### PDF Annotation

- **PDF Viewer**: View and annotate PDF documents with a clean, intuitive interface
- **Synchronized Navigation**: Navigate through PDF slides while taking notes on corresponding pages
- **Page Management**: Automatic page synchronization between PDF and notes
- **Zoom Controls**: Adjust PDF viewing scale for optimal readability

### Note-Taking

- **Dual-Pane Interface**: View PDF on the left, take notes on the right
- **Rich Text Editor**: Write notes with markdown support
- **Simple Notebooks**: Create notebooks without PDFs for general note-taking
- **Page Navigation**: Quick navigation with keyboard shortcuts (Arrow keys, Ctrl+Arrow)
- **Auto-Save**: Manual save with Ctrl+S or save button

### Notebook Management

- **File System Integration**: Notebooks are stored as .ezn files alongside PDFs in the filesystem, allowing for easy organization of the user using their own folder structure and file management tools
- **Subject Organization**: Organize notebooks by subject/folder
- **Recursive Folder Support**: PDFs can be nested in subfolders within subjects
- **Dual Notebook Types**:
  - **PDF Notebooks**: Linked to PDF files for annotation
  - **Simple Notebooks**: Standalone notebooks for general notes
- **Notebook List**: View all notebooks with reload functionality (Space to refresh)
- **Delete Notebooks**: Remove notebooks and associated files

### File Structure

```
NotebooksFolder/
├── Subject1/
│   ├── document.pdf
│   ├── document.ezn (notebook data)
│   └── nested/
│       ├── another.pdf
│       └── another.ezn
└── Subject2/
    ├── simple-notes.ezn (notebook without PDF)
    └── lecture.pdf
```

### Keyboard Shortcuts

- **Ctrl+S**: Save current notebook
- **Arrow Right/Left**: Navigate pages (when not typing)
- **Ctrl+Arrow Right/Left**: Navigate pages while editing
- **Enter**: Start editing notes (PDF notebooks)
- **Escape**: Stop editing notes
- **Space**: Reload notebooks list (in notebooks page)

## Prerequisites

- **Node.js**: v20 or higher

## Installation

1. Clone the repository:

```bash
git clone https://github.com/BestSolutionSavvy/Easy-Notes-Plus.git
cd easy-notes-plus
```

2. Install dependencies:

```bash
pnpm install
```

3. Configure notebooks folder:
   - On first run, the app will prompt you to select a folder where your notebooks and PDFs are stored
   - You can change this later in Settings

## Development

### Run in development mode:

```bash
pnpm dev:electron
```

This will:

1. Start the Vite dev server on `http://localhost:5173`
2. Launch the Electron app in development mode
3. Enable hot-reload for Vue components

### Run only the web interface:

```bash
pnpm dev
```

## Building

### Type checking:

```bash
pnpm type-check
```

### Build for production:

```bash
pnpm build
```

### Create distributable:

```bash
pnpm dist
```

This will create platform-specific installers in the `dist/` directory.

## Code Quality

### Linting:

```bash
pnpm lint
```

### Format code:

```bash
pnpm format
```

## Technology Stack

- **Electron**: Desktop application framework
- **Vue 3**: Frontend framework with Composition API
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **vue-pdf-embed**: PDF rendering component
- **marked**: Markdown parsing

## Project Structure

```
easy-notes-plus/
├── electron/           # Electron main process
│   ├── main.js        # Main entry point
│   ├── preload.js     # Preload script (IPC bridge)
│   ├── config/        # Configuration management
│   └── controllers/   # Backend logic
│       ├── notebookController.js  # Notebook CRUD
│       ├── pdfController.js       # PDF loading
│       └── folderController.js    # Folder management
├── src/               # Vue frontend
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── views/         # Route views
│   ├── lib/           # Utilities and helpers
│   ├── types/         # TypeScript definitions
│   └── routes/        # Vue Router configuration
└── public/            # Static assets
```

## File Formats

### .ezn Files (Easy Notes Format)

JSON format containing notebook data:

```json
{
  "name": "Notebook Name",
  "subject": "Subject/Folder",
  "date": "2026-02-19T12:00:00.000Z",
  "last_page": 5,
  "num_notebook_pages": 100,
  "pages": [
    {
      "page_number": 1,
      "slide_number": 1,
      "content": "# Page 1 notes"
    }
  ]
}
```

## License

This project uses the MIT License. See [LICENSE](LICENSE) for details.
