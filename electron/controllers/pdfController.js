const path = require('path')
const fs = require('fs').promises
const { getConfig } = require('../config/storage')

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

const loadPdf = async (fileName, subject, pdfPath) => {
  try {
    if (!pdfPath) {
      throw new Error('PDF path is required')
    }
    if (!path.isAbsolute(pdfPath)) {
      throw new Error(`PDF path must be absolute, received: ${pdfPath}`)
    }
    const pdfBuffer = await fs.readFile(pdfPath)
    return {
      success: true,
      data: Array.from(pdfBuffer),
      name: fileName,
    }
  } catch (error) {
    console.error('Error loading PDF:', error)
    throw error
  }
}

module.exports = {
  loadPdf,
}
