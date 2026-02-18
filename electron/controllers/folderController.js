const { dialog } = require('electron')
const { getConfig, saveConfig } = require('../config/storage')

const selectNotebooksFolder = async (mainWindow) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select the notebooks root folder',
  })
  if (!result.canceled && result.filePaths.length > 0) {
    const folderPath = result.filePaths[0]
    const config = await getConfig()
    config.notebooksPath = folderPath
    await saveConfig(config)
    return { success: true, path: folderPath }
  }
  return { success: false }
}

const getNotebooksFolder = async () => {
  const config = await getConfig()
  return config.notebooksPath || null
}

module.exports = {
  selectNotebooksFolder,
  getNotebooksFolder,
}
