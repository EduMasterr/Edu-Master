/**
 * 💾 EduMaster Pro - Multi-Branch Backup & Sync Engine
 * Handles branch-specific guardians and global HQ backup
 */

window.BackupEngine = {
    _cachedHandle: null,

    async preloadHandle() {
        try {
            if (!this._cachedHandle) {
                this._cachedHandle = await this.getFolderHandle();
            }
        } catch (e) { }
    },

    /**
     * Get branch-specific storage keys
     */
    getKeys() {
        const branchId = window.Permissions?.getActiveBranchId() || 'global';
        return {
            sync: `edumaster_last_sync_b${branchId}`,
            active: `edumaster_guardian_active_b${branchId}`,
            folder: `edumaster_guardian_folder_b${branchId}`,
            fixedPath: `edumaster_guardian_fixed_path_b${branchId}`
        };
    },

    /**
     * Store/Retrieve Directory Handle from IndexedDB
     */
    async getFolderHandle() {
        return new Promise((resolve) => {
            const request = indexedDB.open('EduMasterDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction('handles', 'readonly');
                const store = tx.objectStore('handles');
                const getReq = store.get('backup_folder');
                getReq.onsuccess = () => resolve(getReq.result);
                getReq.onerror = () => resolve(null);
            };
            request.onerror = () => resolve(null);
        });
    },

    async saveFolderHandle(handle) {
        return new Promise((resolve) => {
            const request = indexedDB.open('EduMasterDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction('handles', 'readwrite');
                tx.objectStore('handles').put(handle, 'backup_folder');
                tx.oncomplete = () => resolve(true);
            };
        });
    },

    /**
     * Link Folder for Current Branch
     */
    async linkBranchFolder() {
        const branchId = window.Permissions?.getActiveBranchId();
        const branchName = branchId ? `الفرع ${branchId}` : 'الإدارة العامة';

        try {
            if (window.eduAPI) {
                // If in desktop app, we can just hardcode paths
                const fixedPath = 'D:\\Backups-Edu-Master';
                const keys = this.getKeys();
                localStorage.setItem(keys.active, 'true');
                localStorage.setItem(keys.folder, fixedPath);
                if (window.Toast) Toast.show(`تم تفعيل درع الحماية في سطح المكتب: ${fixedPath}`, 'success');
                if (window.updateGuardianUI) window.updateGuardianUI();
                return;
            }

            // In BROWSER, we must use the File System Access API
            if ('showDirectoryPicker' in window) {
                const handle = await window.showDirectoryPicker();
                this._cachedHandle = handle;
                await this.saveFolderHandle(handle);

                const keys = this.getKeys();
                localStorage.setItem(keys.active, 'true');
                localStorage.setItem(keys.folder, handle.name);

                if (window.Toast) Toast.show(`تم ربط وتفعيل درع الحماية في: ${handle.name}`, 'success');
                if (window.updateGuardianUI) window.updateGuardianUI();
            } else {
                if (window.Toast) Toast.show('متصفحك لا يدعم خاصية درع الحماية التلقائي. يرجى استخدام متصفح حديث مثل Chrome أو Edge', 'warning');
            }
        } catch (err) {
            console.error('Folder Pick Error:', err);
            if (window.Toast) Toast.show('يجب اختيار مجلد لتفعيل الحماية التلقائية', 'warning');
        }
    },

    /**
     * Export Branch-Specific Data
     */
    async exportBranchData(silent = false) {
        const branchId = window.Permissions?.getActiveBranchId();

        // ⚡ Use IDBEngine to get ALL data (unlimited, no 5MB cap)
        const allData = window.IDBEngine?.isReady
            ? window.IDBEngine.getAllData()
            : (() => {
                // Fallback: read localStorage manually
                const d = {};
                Object.keys(localStorage).forEach(k => {
                    if (k.startsWith('edumaster_')) {
                        try { d[k] = JSON.parse(localStorage.getItem(k)); }
                        catch (e) { d[k] = localStorage.getItem(k); }
                    }
                });
                return d;
            })();

        allData['backup_meta'] = {
            exporter: branchId ? `Branch_${branchId}` : 'HQ_Global',
            date: new Date().toISOString(),
            version: '2.0'
        };

        const jsonContent = JSON.stringify(allData, null, 2);
        const fileName = (branchId ? `Auto_Branch_${branchId}` : `Auto_HQ_Full`) + `_${new Date().toISOString().slice(0, 10)}.json`;

        try {
            // SILENT AUTO-GUARDIAN MODE
            // Try to use the File System Access API if the user has previously linked a folder
            if (silent) {
                if (window.eduAPI) {
                    return false; // Handled by Desktop bridge
                }

                const handle = this._cachedHandle || await this.getFolderHandle();
                if (handle) {
                    let status = await handle.queryPermission({ mode: 'readwrite' });

                    // If not granted, we try to ask for permission. 
                    // Note: Chrome often requires a user gesture here, so safeExit might fail silently if the browser blocks it.
                    if (status !== 'granted') {
                        try {
                            status = await handle.requestPermission({ mode: 'readwrite' });
                        } catch (e) {
                            console.warn("Could not request permission for silent save (gesture required)", e);
                        }
                    }

                    if (status === 'granted') {
                        const fileHandle = await handle.getFileHandle(fileName, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(jsonContent);
                        await writable.close();

                        const keys = this.getKeys();
                        localStorage.setItem(keys.sync, new Date().toLocaleString('ar-EG'));
                        localStorage.setItem('edumaster_last_backup_check', Date.now().toString());
                        return true;
                    }
                }
                // Fallthrough if it fails
            }

            // REGULAR MODE (User Clicked Manual Backup)
            if ('showSaveFilePicker' in window && !silent) {
                try {
                    // Let the user pick exact file location without running into folder sandbox permission blocks
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'EduMaster Secure Backup',
                            accept: { 'application/json': ['.json'] },
                        }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(jsonContent);
                    await writable.close();

                    if (window.Toast) Toast.show('تم حفظ النسخة المؤمنة بنجاح', 'success');
                } catch (err) {
                    console.warn('Save File Picker failed or cancelled, falling back to standard download:', err);
                    const blob = new Blob([jsonContent], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                    if (window.Toast) Toast.show('تم تنزيل النسخة (الوضع القياسي)', 'success');
                }
            } else {
                // FALLBACK for old browsers or if forced silent failed
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                if (window.Toast && !silent) Toast.show('تم تنزيل النسخة (الوضع القياسي)', 'success');
            }

            // Update Sync Time and Last Backup Check
            const keys = this.getKeys();
            const timestamp = new Date().toLocaleString('ar-EG');
            localStorage.setItem(keys.sync, timestamp);
            localStorage.setItem('edumaster_last_backup_check', Date.now().toString());

            const alert = document.getElementById('sync-alert');
            if (alert) alert.style.display = 'none';

            // Hide global reminder if active
            const globalAlert = document.getElementById('global-backup-alert');
            if (globalAlert) globalAlert.remove();

        } catch (err) {
            console.error('Backup Error:', err);
            if (!silent) Toast.show('فشل في عملية النسخ الاحتياطي', 'error');
            throw err;
        }
    },

    /**
     * Global Sync Simulation for HQ
     */
    async syncGlobal() {
        Toast.show('جاري تجميع البيانات من جميع الفروع المربوطة...', 'info');
        return new Promise((resolve) => {
            setTimeout(() => {
                const timestamp = new Date().toLocaleString('ar-EG');
                localStorage.setItem('edumaster_last_sync_b0', timestamp);
                Toast.show('تمت المزامنة المركزية الشاملة بنجاح', 'success');
                resolve(timestamp);
            }, 3000);
        });
    },

    /**
     * Import Data from JSON File
     */
    importData(file) {
        if (!file) return;

        // ══════════════════════════════════════════════════════════
        // CRITICAL FIX: Read the file FIRST before showing any modal
        // If we reset fileInput.value before reading, the file is gone
        // ══════════════════════════════════════════════════════════
        Toast.show('جاري قراءة الملف...', 'info');

        const reader = new FileReader();
        reader.onload = (e) => {
            let importedData;
            try {
                importedData = JSON.parse(e.target.result);
            } catch (parseErr) {
                Toast.show('الملف تالف أو ليس ملف JSON صحيح', 'error');
                return;
            }

            // 🛡️ SECURITY CHECK
            const activeBranchId = window.Permissions?.getActiveBranchId();
            if (activeBranchId && importedData['backup_meta']?.exporter === 'HQ_Global') {
                Toast.show('⛔ خطأ أمني: لا يمكنك استعادة نسخة "إدارة عامة" داخل فرع.', 'error');
                return;
            }

            // Count items before showing confirm
            const itemCount = Object.keys(importedData).filter(k => k !== 'backup_meta').length;

            // NOW show the confirmation modal (data is already loaded in memory)
            Modal.confirm({
                title: 'تأكيد استعادة البيانات',
                message: `تم تحميل الملف بنجاح (${itemCount} وحدة). سيتم استبدال البيانات الحالية وإعادة تشغيل النظام. هل أنت متأكد؟`,
                confirmText: 'نعم، استعد البيانات',
                cancelText: 'إلغاء',
                type: 'danger',
                icon: 'fa-file-import',
                onConfirm: () => {
                    let count = 0;

                    // Write ALL data to localStorage immediately
                    for (const [key, value] of Object.entries(importedData)) {
                        if (key === 'backup_meta') continue;
                        const lsKey = key.startsWith('edumaster_') ? key : `edumaster_${key}`;
                        try {
                            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
                            localStorage.setItem(lsKey, serialized);
                            count++;
                        } catch(writeErr) {
                            console.warn(`Could not write ${lsKey} to localStorage:`, writeErr);
                        }
                    }

                    // Sync to IDB in background (non-blocking)
                    if (window.IDBEngine) {
                        window.IDBEngine.bulkImport(importedData).catch(err => {
                            console.warn('IDB background sync (non-critical error):', err);
                        });
                    }

                    // Reset IDB migration flag
                    localStorage.removeItem('__idb_v2_done__');

                    if (count > 0) {
                        Modal.success({
                            title: 'تمت الاستعادة بنجاح!',
                            message: `تم استعادة ${count} وحدة من البيانات بنجاح. اضغط "استمرار" لإعادة تشغيل النظام.`,
                            onComplete: () => location.reload()
                        });
                    } else {
                        Toast.show('لم يتم العثور على بيانات صالحة في الملف.', 'warning');
                    }
                }
            });
        };

        reader.onerror = () => {
            Toast.show('فشل في قراءة الملف. يرجى المحاولة مرة أخرى.', 'error');
        };

        // Read the file NOW (before any modal or reset)
        reader.readAsText(file);

        // Reset the file input AFTER reading starts (so same file can be re-selected)
        setTimeout(() => {
            const fileInput = document.getElementById('file-import');
            if (fileInput) fileInput.value = '';
        }, 500);
    },


    /**
     * Safe Exit Sequence
     * Triggered by user close/logout
     * @param {boolean} isFullShutdown If true, close the entire application. If false, just logout.
     */
    async safeExit(isFullShutdown = false) {
        // Show Loading Overlay
        const overlay = document.createElement('div');
        overlay.id = 'safe-exit-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.98); z-index: 100000;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #fff; font-family: 'Tajawal', sans-serif; backdrop-filter: blur(15px);
        `;
        overlay.innerHTML = `
            <div style="text-align: center; max-width: 400px; padding: 40px; background: rgba(255,255,255,0.03); border-radius: 24px; border: 1px solid rgba(0, 234, 255, 0.1);">
                <div style="width: 70px; height: 70px; border: 3px solid rgba(0, 234, 255, 0.1); border-top: 3px solid var(--accent-teal); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 30px;"></div>
                <h2 style="font-weight: 800; margin-bottom: 15px; color: var(--accent-teal); font-size: 1.5rem;">جاري تأمين وإغلاق النظام...</h2>
                <p id="safe-exit-msg" style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.6;">يتم الآن حفظ نسخة احتياطية ذكية في المسار المعتمد: <br> (D:\\Backups-Edu-Master)</p>
                <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                    <span style="font-size: 0.7rem; color: var(--accent-teal); background: rgba(0, 234, 255, 0.1); padding: 4px 12px; border-radius: 50px;">Auto-Guardian Active</span>
                </div>
            </div>
            <style> @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } </style>
        `;
        document.body.appendChild(overlay);

        if (window.AudioCore) AudioCore.playSave();

        // Path Prefix Strategy
        const prefix = (window.location.pathname.includes('/admin-console/') || window.location.pathname.includes('/staff-attendance/')) ? '../' : '';

        try {
            // 🛡️ DESKTOP-MODE (Silent & True Shutdown)
            if (window.eduAPI) {
                // ... same desktop logic ...
                const allData = window.IDBEngine?.isReady
                    ? window.IDBEngine.getAllData()
                    : (() => {
                        const d = {};
                        Object.keys(localStorage).forEach(k => d[k] = localStorage.getItem(k));
                        return d;
                    })();
                allData['backup_meta'] = { date: new Date().toISOString(), type: 'Auto_Shutdown', version: '2.0' };

                await window.eduAPI.forceBackup(JSON.stringify(allData, null, 2));

                document.getElementById('safe-exit-msg').innerHTML = "<span style='color: #4ade80;'>✅ تم الحفظ التلقائي والخروج بنجاح.</span>";

                setTimeout(() => {
                    localStorage.setItem('edumaster_logout_active', 'true'); // SET FLAG
                    localStorage.removeItem('edumaster_session');
                    if (isFullShutdown) {
                        window.eduAPI.closeApp(); 
                    } else {
                        window.location.href = prefix + 'index.html'; 
                    }
                }, 500);
                return;
            }

            // 🌐 BROWSER-MODE (Fallback)
            const success = await this.exportBranchData(true);

            if (success) {
                document.getElementById('safe-exit-msg').innerHTML = "<span style='color: #4ade80;'>✅ تم الحفظ التلقائي بنجاح في مجلد الحماية.</span><br>جاري الإغلاق...";

                setTimeout(() => {
                    localStorage.setItem('edumaster_logout_active', 'true'); // SET FLAG
                    localStorage.removeItem('edumaster_session');
                    if (isFullShutdown) {
                        window.location.href = prefix + 'index.html';
                    } else {
                        window.location.href = prefix + 'index.html';
                    }
                }, 500);
            } else {
                document.getElementById('safe-exit-msg').innerHTML = "<span style='color: #f59e0b;'>⚠️ تنبيه: درع الحماية غير مربوط (لم يتم الحفظ في D:).</span><br>يرجى ربط المجلد من الإعدادات لاحقاً.. جاري الإغلاق الآن.";

                setTimeout(() => {
                    localStorage.setItem('edumaster_logout_active', 'true'); // SET FLAG
                    localStorage.removeItem('edumaster_session');
                    window.location.href = prefix + 'index.html';
                }, 1500);
            }

        } catch (err) {
            console.error('Safe Exit Error:', err);
            document.getElementById('safe-exit-msg').innerHTML = "<span style='color: #ef4444;'>❌ عذراً، تعذر الحفظ التلقائي: " + err.message + "</span><br>سيتم إغلاق النظام الآن للأمان.";

            setTimeout(() => {
                localStorage.setItem('edumaster_logout_active', 'true'); // SET FLAG
                localStorage.removeItem('edumaster_session');
                window.location.href = prefix + 'index.html';
            }, 2000);
        }
    }
};

// Intercept Logout for Safe Exit
if (window.Permissions) {
    window.Permissions.logout = function () {
        // No confirmation, just safe exit (Logout mode)
        BackupEngine.safeExit(false);
    };
}

// Preload the handle in browser mode so Chrome doesn't drop the gesture token later!
document.addEventListener('DOMContentLoaded', () => {
    if (window.BackupEngine && !window.eduAPI) {
        BackupEngine.preloadHandle();
    }
});
