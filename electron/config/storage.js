const { app } = require('electron')
const path = require('path')
const fs = require('fs').promises

// Storage for the notebooks root folder path
const STORAGE_FILE = path.join(app.getPath('userData'), 'config.json')

const getConfig = async () => {
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

const saveConfig = async (config) => {
  await fs.writeFile(STORAGE_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

module.exports = {
  getConfig,
  saveConfig,
}
