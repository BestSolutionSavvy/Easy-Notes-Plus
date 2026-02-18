const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { selectNotebooksFolder, getNotebooksFolder } = require('./controllers/folderController')
const {
  loadNotebooks,
  loadNotebook,
  saveNotebook,
  deleteNotebook,
} = require('./controllers/notebookController')
const { loadPdf } = require('./controllers/pdfController')

let mainWindow = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    autoHideMenuBar: true,
    icon: 'public/favicon.ico',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.maximize()

  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// IPC Handlers

// Select the notebooks root folder
ipcMain.handle('select-notebooks-folder', () => selectNotebooksFolder(mainWindow))

// Get the stored notebooks folder path
ipcMain.handle('get-notebooks-folder', getNotebooksFolder)

// Load all notebooks from the filesystem
ipcMain.handle('load-notebooks', loadNotebooks)

// Load a single notebook by fileName
ipcMain.handle('load-notebook', (event, fileName, subject) => loadNotebook(fileName, subject))

// Save a notebook to the filesystem
ipcMain.handle('save-notebook', (event, notebook, fileName) => saveNotebook(notebook, fileName))

// Delete a notebook
ipcMain.handle('delete-notebook', (event, fileName, subject) => deleteNotebook(fileName, subject))

// Load PDF file
ipcMain.handle('load-pdf', (event, fileName, subject, pdfPath) =>
  loadPdf(fileName, subject, pdfPath),
)

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
