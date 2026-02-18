const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Folder selection
  selectNotebooksFolder: () => ipcRenderer.invoke('select-notebooks-folder'),
  getNotebooksFolder: () => ipcRenderer.invoke('get-notebooks-folder'),

  // Notebooks operations
  loadNotebooks: () => ipcRenderer.invoke('load-notebooks'),
  loadNotebook: (fileName, subject) => ipcRenderer.invoke('load-notebook', fileName, subject),
  saveNotebook: (notebook, fileName) => ipcRenderer.invoke('save-notebook', notebook, fileName),
  deleteNotebook: (fileName, subject) => ipcRenderer.invoke('delete-notebook', fileName, subject),

  // PDF operations
  loadPdf: (fileName, subject, pdfPath) =>
    ipcRenderer.invoke('load-pdf', fileName, subject, pdfPath),
})
