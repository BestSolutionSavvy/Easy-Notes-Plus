const { autoUpdater } = require('electron-updater')
const { app, dialog } = require('electron')

// Configurazione auto-updater
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

// Check for updates on startup
const checkForUpdates = () => {
  if (!app.isPackaged) {
    console.log('Auto-update disabled in dev mode')
    return
  }

  autoUpdater.checkForUpdatesAndNotify()
}

// Updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...')
})

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version)
})

autoUpdater.on('update-not-available', () => {
  console.log('No updates available')
})

autoUpdater.on('error', (err) => {
  console.error('Error during update:', err)
})

autoUpdater.on('download-progress', (progressObj) => {
  const percent = progressObj.percent.toFixed(2)
  console.log(`Downloading: ${percent}%`)
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version)

  dialog
    .showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} is available`,
      detail: 'The update will be installed on application restart.',
      buttons: ['Restart Now', 'Later'],
    })
    .then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall()
      }
    })
})

module.exports = {
  checkForUpdates,
}
