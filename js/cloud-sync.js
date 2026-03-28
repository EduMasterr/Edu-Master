/**
 * ☁️ EduMaster Pro - Cloud Sync Engine (GitHub)
 * 
 * Securely syncs IndexedDB data to GitHub Gists.
 */

window.CloudSync = {
    _config: {
        token: '',      // GitHub Personal Access Token
        gistId: '',     // The Gist ID used as storage
        lastSync: null
    },

    /**
     * Load config from Storage
     */
    init() {
        const saved = Storage.get('cloud_sync_config');
        if (saved) {
            this._config = { ...this._config, ...saved };
        }
        console.log('☁️ Cloud Sync Engine Initialized');
    },

    saveConfig(token, gistId) {
        this._config.token = token;
        this._config.gistId = gistId;
        Storage.save('cloud_sync_config', this._config);
        Toast.show('✅ تم حفظ إعدادات السحابة بنجاح', 'success');
    },

    /**
     * Push ALL local data to GitHub
     */
    async pushToCloud() {
        if (!this._config.token) {
            Toast.show('الرجاء إعداد توكن GitHub أولاً', 'error');
            return false;
        }

        try {
            Toast.show('📤 جاري رفع النسخة للسحاب...', 'info');

            // Get all data from IDBEngine
            const allData = window.IDBEngine ? window.IDBEngine.getAllData() : {};
            allData['sync_meta'] = {
                date: new Date().toISOString(),
                device: navigator.userAgent.slice(0, 50)
            };

            const payload = {
                description: "EduMaster Pro Cloud Backup",
                files: {
                    "edumaster_backup.json": {
                        content: JSON.stringify(allData)
                    }
                }
            };

            const url = this._config.gistId
                ? `https://api.github.com/gists/${this._config.gistId}`
                : `https://api.github.com/gists`;

            const method = this._config.gistId ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `token ${this._config.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('فشل الاتصال بـ GitHub');

            const result = await response.json();

            // If it's a new Gist, save the ID
            if (!this._config.gistId) {
                this._config.gistId = result.id;
                Storage.save('cloud_sync_config', this._config);
            }

            // ✅ NEW: Dual-Sync: Also push to Firebase for Mobile Portal usage
            if (window.Cloud && window.Cloud.pushAllRecords) {
                await Cloud.pushAllRecords(allData);
            }

            this._config.lastSync = new Date().toISOString();
            Storage.save('cloud_sync_config', this._config);

            Toast.show('✅ تمت المزامنة مع السحاب بنجاح', 'success');
            return true;

        } catch (err) {
            console.error('Cloud Push Error:', err);
            Toast.show('❌ خطأ في المزامنة: ' + err.message, 'error');
            return false;
        }
    },

    /**
     * Pull data from GitHub and override local
     */
    async pullFromCloud() {
        if (!this._config.token || !this._config.gistId) {
            Toast.show('لا توجد نسخة سحابية مسجلة', 'error');
            return false;
        }

        try {
            Toast.show('📥 جاري جلب البيانات من السحاب...', 'info');

            const response = await fetch(`https://api.github.com/gists/${this._config.gistId}`, {
                headers: { 'Authorization': `token ${this._config.token}` }
            });

            if (!response.ok) throw new Error('فشل جلب النسخة السحابية');

            const gist = await response.json();
            const content = gist.files["edumaster_backup.json"].content;
            const cloudData = JSON.parse(content);

            if (!confirm('⚠️ سيتم استبدال البيانات الحالية بالنسخة السحابية. هل أنت متأكد؟')) return;

            // Save to IDBEngine
            if (window.IDBEngine) {
                for (const [key, value] of Object.entries(cloudData)) {
                    await window.IDBEngine.save(key, value);
                }
                Toast.show('✅ تم استعادة البيانات بنجاح! سيتم إعادة تحميل الصفحة.', 'success');
                setTimeout(() => location.reload(), 2000);
            }

            return true;
        } catch (err) {
            console.error('Cloud Pull Error:', err);
            Toast.show('❌ فشل الاستعادة: ' + err.message, 'error');
            return false;
        }
    }
};

window.CloudSync.init();
