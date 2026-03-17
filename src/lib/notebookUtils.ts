import type { Notebook } from '../types/notebook'
import pdfIcon from '../assets/pdf.svg'
import notebookIcon from '../assets/open-notebook.svg'
import notesIcon from '../assets/notes.svg'

// Type definition for the Electron API
declare global {
  interface Window {
    api: {
      selectNotebooksFolder: () => Promise<{ success: boolean; path?: string }>
      getNotebooksFolder: () => Promise<string | null>
      loadNotebooks: () => Promise<Notebook[]>
      loadNotebook: (fileName: string, subject: string) => Promise<Notebook>
      saveNotebook: (
        notebook: Notebook,
        fileName?: string,
      ) => Promise<{ success: boolean; fileName: string }>
      deleteNotebook: (fileName: string, subject: string) => Promise<{ success: boolean }>
      loadPdf: (
        fileName: string,
        subject: string,
        pdfPath: string,
      ) => Promise<{ success: boolean; data: number[]; name: string }>
      ping: () => string
    }
  }
}

export const loadNotebooks = async (): Promise<Notebook[]> => {
  try {
    // Check if notebooks folder is configured
    const folderPath = await window.api.getNotebooksFolder()

    if (!folderPath) {
      // First time setup - ask user to select folder
      const result = await window.api.selectNotebooksFolder()
      if (!result.success) {
        throw new Error('No notebooks folder selected')
      }
    }

    const notebooks = await window.api.loadNotebooks()
    return notebooks
  } catch (error: any) {
    console.error('Error loading notebooks:', error)
    throw new Error(error.message || 'Failed to load notebooks')
  }
}

export const loadNotebook = async (fileName: string, subject: string): Promise<Notebook> => {
  try {
    const notebook = await window.api.loadNotebook(fileName, subject)
    return notebook
  } catch (error: any) {
    console.error('Error loading notebook:', error)
    throw new Error(error.message || 'Failed to load notebook')
  }
}

export const saveNotebook = async (
  notebook: Notebook,
  fileName?: string,
): Promise<{ success: boolean; fileName: string }> => {
  try {
    const result = await window.api.saveNotebook(notebook, fileName)
    return result
  } catch (error: any) {
    console.error('Error saving notebook:', error)
    throw new Error(error.message || 'Failed to save notebook')
  }
}

export const deleteNotebook = async (fileName: string, subject: string): Promise<void> => {
  try {
    await window.api.deleteNotebook(fileName, subject)
  } catch (error: any) {
    console.error('Error deleting notebook:', error)
    throw new Error(error.message || 'Failed to delete notebook')
  }
}

// Helper function to get the filename from notebook name (no normalization)
export const getNotebookFileName = (notebook: Notebook): string => {
  return notebook.name
}

// Get gradient background based on notebook type
export const getNotebookGradient = (type: 'pdf' | 'simple' | 'full' = 'simple'): string => {
  const gradients: Record<'pdf' | 'simple' | 'full', string> = {
    pdf: '[background:linear-gradient(90deg,_#ffcee9,_#ffe5f3_65.38%,_#fff3f9)]',
    simple: '[background:linear-gradient(90deg,_#ced8ff,_#e5ebff_65.38%,_#f5f7ff)]',
    full: '[background:linear-gradient(90deg,_#fff0ca,_#fff8e6_65.38%,_#fffcf5)]',
  }
  return gradients[type]
}

// Get button background based on notebook type
export const getButtonsBackground = (type: 'pdf' | 'simple' | 'full' = 'simple'): string => {
  const backgrounds: Record<'pdf' | 'simple' | 'full', string> = {
    pdf: 'bg-pink-600',
    simple: 'bg-blue-950',
    full: 'bg-orangered-100',
  }
  return backgrounds[type]
}

// Get icon base on notebook type
export const getNotebookIcon = (type: 'pdf' | 'simple' | 'full' = 'simple'): string => {
  const icons: Record<'pdf' | 'simple' | 'full', string> = {
    pdf: pdfIcon,
    simple: notesIcon,
    full: notebookIcon,
  }
  return icons[type]
}
