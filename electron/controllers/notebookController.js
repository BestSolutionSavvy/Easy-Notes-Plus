const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const { getConfig } = require('../config/storage')
const { PDFDocument } = require('pdf-lib')

// Helper function to check if a date is valid
const _isValidDate = (dateString) => {
  if (!dateString) return false
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

// Helper function to calculate notebook type based on file structure
const _calculateNotebookType = (hasPdf, hasEznFile) => {
  if (hasPdf && hasEznFile) {
    return 'full'
  } else if (hasPdf) {
    return 'pdf'
  } else {
    return 'simple'
  }
}

// Helper function to extract date from PDF metadata
const _getPdfDate = async (pdfPath) => {
  try {
    const pdfBytes = await fs.readFile(pdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const creationDate = pdfDoc.getCreationDate()
    const modificationDate = pdfDoc.getModificationDate()
    const pdfDate = creationDate || modificationDate
    if (pdfDate) {
      return pdfDate.toISOString()
    }
  } catch (error) {
    console.error(`Error extracting PDF metadata from ${pdfPath}:`, error)
  }
  try {
    const stats = await fs.stat(pdfPath)
    return stats.mtime.toISOString()
  } catch (error) {
    console.error(`Error getting file stats from ${pdfPath}:`, error)
    return new Date().toISOString()
  }
}

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
            const relativePath = path.relative(notebooksPath, fileDir)
            const subject = relativePath.split(path.sep)[0]
            processedFiles.add(path.join(relativePath, fileName))
            let notebook
            if (fsSync.existsSync(eznPath)) {
              const content = await fs.readFile(eznPath, 'utf-8')
              notebook = JSON.parse(content)
              notebook.subject = subject
            } else {
              const pdfDate = await _getPdfDate(pdfPath)
              notebook = {
                name: fileName,
                subject: subject,
                date: pdfDate,
                last_page: 1,
                num_notebook_pages: 0,
                pages: [],
              }
            }
            notebook.pdf = pdfPath
            // Add notebook type
            const hasEzn = fsSync.existsSync(eznPath)
            notebook.type = _calculateNotebookType(true, hasEzn)
            // Only add notebook if it has a valid date
            if (_isValidDate(notebook.date)) {
              notebooks.push(notebook)
            }
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
            const relativePath = path.relative(notebooksPath, fileDir)
            const subject = relativePath.split(path.sep)[0]
            const fileKey = path.join(relativePath, fileName)
            if (!processedFiles.has(fileKey)) {
              const content = await fs.readFile(eznPath, 'utf-8')
              const notebook = JSON.parse(content)
              notebook.subject = subject
              // Add notebook type (EZN file without PDF)
              notebook.type = _calculateNotebookType(false, true)
              // Only add notebook if it has a valid date
              if (_isValidDate(notebook.date)) {
                notebooks.push(notebook)
              }
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
    const rootSubject = subject.split(path.sep)[0]
    if (eznPath) {
      const content = await fs.readFile(eznPath, 'utf-8')
      const notebook = JSON.parse(content)
      notebook.subject = rootSubject
      const hasPdf = !!pdfPath
      notebook.type = _calculateNotebookType(hasPdf, true)
      if (pdfPath) {
        notebook.pdf = pdfPath
      }
      return notebook
    }
    if (pdfPath) {
      const pdfDate = await _getPdfDate(pdfPath)
      const notebook = {
        name: fileName,
        subject: rootSubject,
        pdf: pdfPath,
        date: pdfDate,
        last_page: 1,
        num_notebook_pages: 0,
        pages: [],
      }
      notebook.type = _calculateNotebookType(true, false)
      return notebook
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
    const { pdf, subject, ...notebookToSave } = notebook
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
