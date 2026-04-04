const { app, BrowserWindow, ipcMain, dialog, Menu, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1366, height: 768,
        title: "EduMaster Pro - Desktop Edition",
        icon: path.join(__dirname, 'education.png'),
        autoHideMenuBar: true,
        backgroundColor: '#0F172A',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            autoplayPolicy: 'no-user-gesture-required'
        }
    });

    mainWindow.loadFile('index.html');
    mainWindow.maximize();

    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.webContents.send('app-close-request');
        }
    });
}

// === IPC HANDLERS ===
ipcMain.on('app-exit-final', () => {
    isQuitting = true;
    app.quit();
});

ipcMain.handle('force-fixed-backup', async (event, dataStr) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + Date.now();
    const fileName = `EduMaster_AutoBackup_${timestamp}.json`;

    // Create paths emphasizing the internal 'backups' folder
    const internalBackupDir = path.join(__dirname, 'backups');
    const backupPaths = [
        path.join(internalBackupDir, fileName),
        'D:\\Backups-Edu-Master\\' + fileName,
        path.join(require('os').homedir(), 'Desktop', fileName)
    ];

    let lastError = '';
    // Ensure internal backup folder exists
    if (!fs.existsSync(internalBackupDir)) {
        fs.mkdirSync(internalBackupDir, { recursive: true });
    }

    for (const filePath of backupPaths) {
        try {
            const dir = path.dirname(filePath);
            const drive = filePath.split(':')[0] + ':';

            if (filePath.includes(':') && drive.length === 2 && !fs.existsSync(drive)) {
                lastError = `Drive ${drive} not found.`;
                continue;
            }

            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, dataStr, 'utf8');
            return { success: true, path: filePath };
        } catch (err) {
            lastError = err.message;
            console.warn(`Path failed: ${filePath}`, err.message);
        }
    }
    return { success: false, error: lastError || 'All paths failed' };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
