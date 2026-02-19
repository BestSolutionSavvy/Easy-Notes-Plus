const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const { getConfig } = require('../config/storage')

// Helper function to recursively find files with a specific extension
const _findFilesRecursively = async (dir, extension) => {
  const files = []
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const subFiles = await _findFilesRecursively(fullPath, extension)
        files.push(...subFiles)
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }
  return files
}

// Helper function to find a file by name recursively
const _findFileByName = async (dir, fileName) => {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = await _findFileByName(fullPath, fileName)
        if (found) return found
      } else if (entry.isFile() && entry.name === fileName) {
        return fullPath
      }
    }
  } catch (error) {
    console.error(`Error searching in ${dir}:`, error)
  }
  return null
}

const loadNotebooks = async () => {
  try {
    const config = await getConfig()
    const notebooksPath = config.notebooksPath
    if (!notebooksPath) {
      throw new Error('Notebooks folder not configured')
    }
    const entries = await fs.readdir(notebooksPath, { withFileTypes: true })
    const notebooks = []
    const processedFiles = new Set()
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subjectPath = path.join(notebooksPath, entry.name)
        const pdfFiles = await _findFilesRecursively(subjectPath, '.pdf')
        for (const pdfPath of pdfFiles) {
          try {
            const fileName = path.basename(pdfPath, '.pdf')
            const eznPath = path.join(path.dirname(pdfPath), `${fileName}.ezn`)
            const fileDir = path.dirname(pdfPath)
            const subject = path.relative(notebooksPath, fileDir)
            processedFiles.add(path.join(subject, fileName))
            let notebook
            if (fsSync.existsSync(eznPath)) {
              const content = await fs.readFile(eznPath, 'utf-8')
              notebook = JSON.parse(content)
            } else {
              notebook = {
                name: fileName,
                subject: subject,
                date: new Date().toISOString(),
                last_page: 1,
                num_notebook_pages: 0,
                pages: [],
              }
            }
            notebook.pdf = pdfPath
            notebooks.push(notebook)
          } catch (error) {
            console.error(`Error processing ${pdfPath}:`, error)
          }
        }
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subjectPath = path.join(notebooksPath, entry.name)
        const eznFiles = await _findFilesRecursively(subjectPath, '.ezn')
        for (const eznPath of eznFiles) {
          try {
            const fileName = path.basename(eznPath, '.ezn')
            const fileDir = path.dirname(eznPath)
            const subject = path.relative(notebooksPath, fileDir)
            const fileKey = path.join(subject, fileName)
            if (!processedFiles.has(fileKey)) {
              const content = await fs.readFile(eznPath, 'utf-8')
              const notebook = JSON.parse(content)
              notebooks.push(notebook)
            }
          } catch (error) {
            console.error(`Error processing ${eznPath}:`, error)
          }
        }
      }
    }
    return notebooks
  } catch (error) {
    console.error('Error loading notebooks:', error)
    throw error
  }
}

const loadNotebook = async (fileName, subject) => {
  try {
    const config = await getConfig()
    const notebooksPath = config.notebooksPath
    if (!notebooksPath) {
      throw new Error('Notebooks folder not configured')
    }
    const subjectPath = path.join(notebooksPath, subject)
    const eznPath = await _findFileByName(subjectPath, `${fileName}.ezn`)
    const pdfPath = await _findFileByName(subjectPath, `${fileName}.pdf`)
    if (eznPath) {
      const content = await fs.readFile(eznPath, 'utf-8')
      const notebook = JSON.parse(content)
      if (pdfPath) {
        notebook.pdf = pdfPath
      }
      return notebook
    }
    if (pdfPath) {
      return {
        name: fileName,
        subject: subject,
        pdf: pdfPath,
        date: new Date().toISOString(),
        last_page: 1,
        num_notebook_pages: 0,
        pages: [],
      }
    }
    throw new Error('Notebook not found')
  } catch (error) {
    console.error('Error loading notebook:', error)
    throw error
  }
}

const saveNotebook = async (notebook, fileName) => {
  try {
    const config = await getConfig()
    const notebooksPath = config.notebooksPath
    if (!notebooksPath) {
      throw new Error('Notebooks folder not configured')
    }
    const subjectPath = path.join(notebooksPath, notebook.subject)
    if (!fsSync.existsSync(subjectPath)) {
      await fs.mkdir(subjectPath, { recursive: true })
    }
    const finalFileName = fileName || notebook.name
    const pdfPath = await _findFileByName(subjectPath, `${finalFileName}.pdf`)
    let eznPath
    if (pdfPath) {
      eznPath = path.join(path.dirname(pdfPath), `${finalFileName}.ezn`)
    } else {
      eznPath = path.join(subjectPath, `${finalFileName}.ezn`)
    }
    const { pdf, ...notebookToSave } = notebook
    await fs.writeFile(eznPath, JSON.stringify(notebookToSave, null, 2), 'utf-8')
    return { success: true, fileName: finalFileName }
  } catch (error) {
    console.error('Error saving notebook:', error)
    throw error
  }
}

const deleteNotebook = async (fileName, subject) => {
  try {
    const config = await getConfig()
    const notebooksPath = config.notebooksPath
    if (!notebooksPath) {
      throw new Error('Notebooks folder not configured')
    }
    const subjectPath = path.join(notebooksPath, subject)
    const eznPath = await _findFileByName(subjectPath, `${fileName}.ezn`)
    if (eznPath) {
      await fs.unlink(eznPath)
    }
    const pdfPath = await _findFileByName(subjectPath, `${fileName}.pdf`)
    if (pdfPath) {
      await fs.unlink(pdfPath)
      return { success: true }
    }
    if (!eznPath && !pdfPath) {
      throw new Error('Notebook not found')
    }
    return { success: true }
  } catch (error) {
    console.error('Error deleting notebook:', error)
    throw error
  }
}

module.exports = {
  loadNotebooks,
  loadNotebook,
  saveNotebook,
  deleteNotebook,
}
