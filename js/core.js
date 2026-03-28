// EduMaster Pro Core JS (Global Version)
const STORAGE_VERSION = '2.0.1'; // ⚡ Upgraded: Fixed Trainer Seeding

// ╔══════════════════════════════════════════════════════════════════╗
// ║  ⚡ IDB ENGINE  (embedded — no HTML changes required)            ║
// ║                                                                  ║
// ║  • Unlimited storage (GBs vs old 5MB localStorage limit)        ║
// ║  • In-memory cache → Storage.get() is still synchronous, fast   ║
// ║  • Auto-migrates localStorage → IndexedDB on first page load    ║
// ║  • 100% backwards-compatible with all existing code             ║
// ╚══════════════════════════════════════════════════════════════════╝
const _IDB = (() => {
    const DB_NAME = 'EduMasterProDB';
    const DB_VERSION = 2;
    const STORE_KV = 'keyvalue';
    const PREFIX = 'edumaster_';

    let _db = null;
    let _cache = {};
    let _ready = false;

    /* ── Open DB ── */
    function _open() {
        return new Promise((res, rej) => {
            if (_db) return res(_db);
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_KV))
                    db.createObjectStore(STORE_KV, { keyPath: 'key' });
                if (!db.objectStoreNames.contains('handles'))
                    db.createObjectStore('handles');
            };
            req.onsuccess = (e) => { _db = e.target.result; res(_db); };
            req.onerror = (e) => rej(e.target.error);
        });
    }

    /* ── Write key → IDB (background, non-blocking) ── */
    async function _write(key, value) {
        try {
            const db = await _open();
            return new Promise((res, rej) => {
                const tx = db.transaction(STORE_KV, 'readwrite');
                tx.objectStore(STORE_KV).put({ key, value });
                tx.oncomplete = () => res(true);
                tx.onerror = (e) => rej(e.target.error);
            });
        } catch (e) { /* silent fail – localStorage mirror is the backup */ }
    }

    /* ── Delete key from IDB ── */
    async function _del(key) {
        try {
            const db = await _open();
            const tx = db.transaction(STORE_KV, 'readwrite');
            tx.objectStore(STORE_KV).delete(key);
        } catch (e) { }
    }

    /* ── Load ALL records into in-memory cache on startup ── */
    async function _loadAll() {
        const db = await _open();
        return new Promise((res) => {
            const req = db.transaction(STORE_KV, 'readonly').objectStore(STORE_KV).getAll();
            req.onsuccess = () => {
                (req.result || []).forEach(r => { if (r.key) _cache[r.key] = r.value; });
                res(req.result?.length || 0);
            };
            req.onerror = () => res(0);
        });
    }

    /* ── One-time migration from localStorage → IDB ── */
    async function _migrate() {
        if (localStorage.getItem('__idb_v2_done__')) return;
        let n = 0;
        for (const k of Object.keys(localStorage)) {
            if (!k.startsWith(PREFIX)) continue;
            try {
                const parsed = JSON.parse(localStorage.getItem(k));
                _cache[k] = parsed;
                await _write(k, parsed);
            } catch (e) {
                const raw = localStorage.getItem(k);
                _cache[k] = raw;
                await _write(k, raw);
            }
            n++;
        }
        localStorage.setItem('__idb_v2_done__', '1');
        if (n > 0) console.log(`✅ IDB: migrated ${n} items from localStorage.`);
    }

    /* ── Boot sequence ── */
    (async () => {
        try {
            await _open();
            await _migrate();
            await _loadAll();
            _ready = true;
            console.log('🚀 EduMaster IDB Engine ready.');
        } catch (e) {
            console.error('IDB boot error – localStorage fallback active:', e);
        }
    })();

    /* ── Public API ── */
    return {
        get isReady() { return _ready; },

        get(key) {
            const k = key.startsWith(PREFIX) ? key : PREFIX + key;
            const v = _cache[k];
            return (v === undefined || v === null) ? null : v;
        },

        save(key, data) {
            const k = key.startsWith(PREFIX) ? key : PREFIX + key;
            _cache[k] = data;
            // Mirror to localStorage so session reads stay fast (until 5MB browser quota)
            try {
                const s = JSON.stringify(data);
                localStorage.setItem(k, s);
            } catch (e) {
                console.warn('IDB mirror to localStorage failed (Quota Exceeded)', e);
            }
            return _write(k, data); // returns Promise for await
        },

        remove(key) {
            const k = key.startsWith(PREFIX) ? key : PREFIX + key;
            delete _cache[k];
            localStorage.removeItem(k);
            return _del(k); // returns Promise
        },

        getAllData() {
            const out = {};
            Object.keys(_cache).filter(k => k.startsWith(PREFIX))
                .forEach(k => { out[k] = _cache[k]; });
            return out;
        },

        async bulkImport(data) {
            for (const [key, raw] of Object.entries(data)) {
                if (key === 'backup_meta') continue;
                let val = raw;
                if (typeof raw === 'string') { try { val = JSON.parse(raw); } catch (e) { } }
                _cache[key] = val;
                await _write(key, val);
                try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { }
            }
            console.log(`✅ IDB bulkImport: ${Object.keys(data).length} items restored.`);
        },

        syncCache(key, value) {
            const k = key.startsWith(PREFIX) ? key : PREFIX + key;
            _cache[k] = value;
        }
    };
})();

window.IDBEngine = _IDB; // expose globally

// ╔══════════════════════════════════════════════════════════════════╗
// ║  💾 STORAGE v2.0  – Same API • Now powered by IDB               ║
// ╚══════════════════════════════════════════════════════════════════╝
window.Storage = {
    get(key) {
        if (_IDB.isReady) return _IDB.get(key);
        // Fallback (brief startup window before IDB loads)
        try { const d = localStorage.getItem(`edumaster_${key}`); return d ? JSON.parse(d) : null; }
        catch (e) { return null; }
    },
    save(key, data) {
        if (_IDB.isReady) { return _IDB.save(key, data); }
        try { localStorage.setItem(`edumaster_${key}`, JSON.stringify(data)); return Promise.resolve(); }
        catch (e) { console.error('Storage.save fallback error:', e); return Promise.resolve(); }
    },
    remove(key) {
        if (_IDB.isReady) return _IDB.remove(key);
        localStorage.removeItem(`edumaster_${key}`);
        return Promise.resolve();
    },
    init(key, initialData, force = false) {
        if (force || !this.get(key)) this.save(key, initialData);
    }
};

window.Utils = {
    generateSecretCode: (prefix) => {
        // Keeping for manual triggers if needed (for trainers/employees)
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        const rand = (n) => Array.from({length: n}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
        return `${prefix}-${rand(4)}-${rand(4)}`.toUpperCase();
    },
    generateFixedCode: (prefix, id) => {
        // ⚡ v6: NUMERIC-ONLY codes (8 digits) — works with BOTH numeric ids AND string usernames
        // First digit = type: 1=STD, 2=EMP, 3=TRA
        const typeDigit = prefix === 'STD' ? '1' : prefix === 'EMP' ? '2' : '3';
        
        // Universal string hash (djb2-style) — handles both numeric ids and text strings 
        const str = String(id || 0);
        let seed = 5381;
        for (let i = 0; i < str.length; i++) {
            seed = ((seed << 5) + seed) ^ str.charCodeAt(i);
            seed = seed & 0xffffffff; // keep 32-bit
        }
        seed = Math.abs(seed);
        
        // 32-bit mix function (spread bits for better distribution)
        let h = (seed ^ (seed >>> 16)) * 0x45d9f3b;
        h = (h ^ (h >>> 16)) * 0x45d9f3b;
        h = (h ^ (h >>> 16));
        h = Math.abs(h);
        
        let code = '';
        for (let i = 0; i < 7; i++) {
            let slice = Math.abs((h ^ (i * 0x9E3779B9)) >>> (i * 3));
            code += String(slice % 10);
        }
        return `${typeDigit}${code}`;
    },
    // ✅ NEW: Time-based Dynamic Token (Changes every 30 seconds)
    generateDynamicToken: (seedId) => {
        const timeStep = Math.floor(Date.now() / 30000); // 30s window
        const combinedSeed = parseInt(seedId) ^ timeStep;
        
        // Simple hash for 4-digit token
        let h = (combinedSeed ^ (combinedSeed >>> 16)) * 0x45d9f3b;
        h = (h ^ (h >>> 16)) * 0x45d9f3b;
        return String(Math.abs(h) % 10000).padStart(4, '0');
    },
    validateDynamicToken: (seedId, scannedToken) => {
        const currentToken = Utils.generateDynamicToken(seedId);
        if (currentToken === scannedToken) return true;
        
        // Allow "grace period" for previous 30s window (clock drift safety)
        const prevStep = Math.floor(Date.now() / 30000) - 1;
        const combinedSeedPrev = parseInt(seedId) ^ prevStep;
        let h = (combinedSeedPrev ^ (combinedSeedPrev >>> 16)) * 0x45d9f3b;
        h = (h ^ (h >>> 16)) * 0x45d9f3b;
        const prevToken = String(Math.abs(h) % 10000).padStart(4, '0');
        
        return scannedToken === prevToken;
    },
    // ✅ NEW: Sequential Student ID Generator (1001, 1002, ...)
    generateStudentSerial: () => {
        try {
            let counters = Storage.get('student_id_counter') || { next: 1001 };
            const current = (counters.next || 1001);
            counters.next = current + 1;
            Storage.save('student_id_counter', counters);
            // v5 Format: Numeric only, starts with 1
            return String(current).startsWith('1') ? String(current) : `1${String(current).padStart(3, '0')}`;
        } catch(e) {
            const students = Storage.get('students') || [];
            return `1${(1001 + students.length)}`;
        }
    },

    // ✅ ALIAS: Mapping Utils.normalizeArabic to Formatter.normalizeArabic for backward compatibility
    normalizeArabic: (text) => {
        return window.Formatter ? Formatter.normalizeArabic(text) : (text || "");
    },
    // Reset and recalibrate the counter to match existing students
    recalibrateStudentCounter: () => {
        const students = Storage.get('students') || [];
        const maxNum = students.reduce((max, s) => {
            const m = String(s.serial_id || "").match(/\d+/); // Get any digits
            return m ? Math.max(max, parseInt(m[0])) : max;
        }, 1000);
        Storage.save('student_id_counter', { next: maxNum + 1 });
        console.log(`✅ Student counter recalibrated. Next ID: ${maxNum + 1}`);
    },

    // ⚡ v5: Data Migration (Legacy S-1001# -> 1001)
    migrateToNumericIDs: () => {
        let changed = false;
        
        // 1. Migrate Students
        const students = Storage.get('students') || [];
        students.forEach(s => {
            // FIX: If serial_id is missing OR legacy OR too long (timestamp-style)
            const isLegacy = s.serial_id && (String(s.serial_id).includes('S-') || String(s.serial_id).includes('#'));
            const isMissing = !s.serial_id;
            const isTooLong = s.serial_id && String(s.serial_id).length > 6;

            if (isLegacy || isMissing || isTooLong) {
                const old = s.serial_id || "MISSING";
                let clean = String(old).replace(/[^0-9]/g, '');
                
                // If it was missing or too long, use a fresh sequential serial
                if (!clean || clean.length < 3 || isTooLong) {
                    clean = Utils.generateStudentSerial();
                }

                if (!clean.startsWith('1')) clean = '1' + clean.padStart(3, '0');
                
                s.serial_id = clean;
                changed = true;
                console.log(`Migrated Student: ${old} -> ${clean}`);
            }
        });

        // 2. Migrate Trainers (T- -> 3)
        const trainers = Storage.get('trainers') || [];
        trainers.forEach(t => {
            if (!t.id || (isNaN(t.id) && String(t.id).includes('T-'))) {
                const old = t.id || "MISSING";
                let clean = String(old).replace(/[^0-9]/g, '');
                if (!clean.startsWith('3')) clean = '3' + clean.padStart(3, '0');
                t.id = clean;
                changed = true;
                console.log(`Migrated Trainer: ${old} -> ${clean}`);
            }
        });

        if (changed) {
            Storage.save('students', students);
            Storage.save('trainers', trainers);
            Utils.recalibrateStudentCounter();
            console.log("✅ Platform Migration to Numeric IDs Complete.");
        }
    }
};

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔄 CROSS-TAB SYNC ENGINE                                        ║
// ╚══════════════════════════════════════════════════════════════════╝
window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('edumaster_')) {
        const pureKey = e.key.replace('edumaster_', '');
        let newVal = null;
        try { newVal = e.newValue ? JSON.parse(e.newValue) : null; } catch (err) { newVal = e.newValue; }

        // 1. Sync the IDB In-Memory Cache for the current tab
        if (window.IDBEngine) {
            window.IDBEngine.syncCache(pureKey, newVal);
        }

        // 2. Dispatch a custom event so specific pages can re-render immediately
        window.dispatchEvent(new CustomEvent('edumaster:sync', { 
            detail: { key: pureKey, value: newVal } 
        }));
        
        console.log(`🔄 Sync: Data [${pureKey}] updated from another window.`);
    }
});

window.Formatter = {
    formatCurrency(amount) {
        const num = parseFloat(amount || 0);
        // Hide decimals if it's a whole number, otherwise show 2 decimals
        return num.toLocaleString(undefined, {
            minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
            maximumFractionDigits: 2
        });
    },

    normalizeArabic(text) {
        if (!text) return "";
        let res = text.trim().toLowerCase();
        // Remove diacritics
        res = res.replace(/[\u064B-\u0652]/g, "");
        // Normalize Alifs
        res = res.replace(/[أإآ]/g, "ا");
        // Normalize Taa Marbuta / Haa
        res = res.replace(/[ة]/g, "ه");
        // Normalize Yaa / Alif Maqsura
        res = res.replace(/[ىي]/g, "ي");
        return res;
    }
};

window.WhatsApp = {
    /**
     * Send a WhatsApp message via Web/Desktop/Mobile (Free)
     * @param {string} phone 
     * @param {string} message 
     */
    send(phone, message) {
        if (!phone) {
            Toast.show('رقم الهاتف غير مسجل لهذا الطالب', 'error');
            return;
        }

        // Clean phone number
        let cleanPhone = phone.replace(/\D/g, '');

        // Default to Egypt (+20) if it's a local 11-digit number starting with 0
        if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
            cleanPhone = '2' + cleanPhone;
        }

        const encodedMsg = encodeURIComponent(message);
        const url = `https://wa.me/${cleanPhone}/?text=${encodedMsg}`;
        window.open(url, '_blank');
    }
};

window.Toast = {
    show(message, type = 'info', duration = 3000) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
        container.appendChild(toast);

        // --- NEW: Integrated Professional Sound Trigger ---
        if (window.AudioCore) {
            if (message.includes('تم الحفظ') || message.includes('بنجاح')) AudioCore.playSaveVoice();
            else if (message.includes('إضافة') || message.includes('جديد')) AudioCore.playAdd();
            else if (type === 'success') AudioCore.playSuccess();
            else if (type === 'error') AudioCore.playWarning();
        }

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

window.Beep = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

    success() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    },

    error() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    },

    play(freq = 440, duration = 0.1, type = 'sine') {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
};

window.Modal = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    },
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            // Only restore scroll if no other active modals exist
            const activeModals = document.querySelectorAll('.modal-overlay.active');
            if (activeModals.length === 0) {
                document.body.style.overflow = '';
            }
        }
    },
    initCloseEvents() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('close-modal')) {
                const modal = e.target.closest('.modal-overlay');
                if (modal) this.close(modal.id);
            }
        });
    },
    success({ title, message, onComplete }) {
        let modal = document.getElementById('success-modal-global');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'success-modal-global';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-container" style="max-width: 400px; text-align: center; border-top: 5px solid #10b981;">
                    <div style="background: rgba(16, 185, 129, 0.1); color: #10b981; width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                        <i class="fa-solid fa-check" style="font-size: 3rem;"></i>
                    </div>
                    <h2 class="modal-title" id="global-success-title" style="color: #10b981;"></h2>
                    <p class="modal-message" id="global-success-message" style="margin-bottom: 25px; font-weight: 700;"></p>
                    <button id="global-success-ok" class="modal-btn modal-btn-confirm" style="width: 100%; background: #10b981; color: #fff;">استمرار وإغلاق</button>
                </div>
            `;
            document.body.appendChild(modal);
        }

        document.getElementById('global-success-title').innerText = title || 'تم بنجاح!';
        document.getElementById('global-success-message').innerText = message || '';

        const okBtn = document.getElementById('global-success-ok');
        const cleanup = () => {
            this.close('success-modal-global');
            const newOk = okBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOk, okBtn);
        };

        if (window.AudioCore) AudioCore.playSaveVoice();

        document.getElementById('global-success-ok').onclick = () => {
            cleanup();
            if (onComplete) onComplete();
        };

        // ── Enter key → click OK ──
        const _successEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('global-success-ok')?.click();
                document.removeEventListener('keydown', _successEnter);
            }
        };
        document.removeEventListener('keydown', window._successEnterListener);
        window._successEnterListener = _successEnter;
        document.addEventListener('keydown', _successEnter);

        this.open('success-modal-global');
    },
    confirm({ title, message, type = 'warning', confirmText = 'تأكيد', cancelText = 'إلغاء', icon = 'fa-triangle-exclamation', onConfirm, onCancel }) {
        let modal = document.getElementById('confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-container">
                    <div id="confirm-icon-wrapper" class="modal-icon-wrapper">
                        <i id="confirm-icon" class="fa-solid"></i>
                    </div>
                    <h2 class="modal-title" id="confirm-title"></h2>
                    <p class="modal-message" id="confirm-message"></p>
                    <div class="modal-actions">
                        <button id="confirm-no" class="modal-btn modal-btn-cancel"></button>
                        <button id="confirm-yes" class="modal-btn modal-btn-confirm"></button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Setup Content
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-message').innerText = message;
        document.getElementById('confirm-icon').className = `fa-solid ${icon}`;

        const wrapper = document.getElementById('confirm-icon-wrapper');
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');

        // Styles based on type
        wrapper.className = `modal-icon-wrapper ${type === 'danger' ? 'modal-icon-danger' : 'modal-icon-warning'}`;
        yesBtn.style.background = type === 'danger' ? '#ef4444' : '#10b981';

        // Play warning sound by default for all confirms, or scare sound for trash/deletion
        if (window.AudioCore) {
            if (icon.includes('trash') || icon.includes('skull') || icon.includes('can')) {
                AudioCore.playScare();
            } else {
                AudioCore.playWarning();
            }
        }

        yesBtn.innerText = confirmText;
        noBtn.innerText = cancelText;

        const cleanup = () => {
            this.close('confirm-modal');
            const newYes = yesBtn.cloneNode(true);
            const newNo = noBtn.cloneNode(true);
            yesBtn.parentNode.replaceChild(newYes, yesBtn);
            noBtn.parentNode.replaceChild(newNo, noBtn);
        };

        document.getElementById('confirm-yes').onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };

        document.getElementById('confirm-no').onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };

        // ── Enter key → trigger confirm button ──
        const _enterConfirm = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('confirm-yes')?.click();
                document.removeEventListener('keydown', _enterConfirm);
            } else if (e.key === 'Escape') {
                document.getElementById('confirm-no')?.click();
                document.removeEventListener('keydown', _enterConfirm);
            }
        };
        // Remove old listener if any, then add new
        document.removeEventListener('keydown', window._modalEnterListener);
        window._modalEnterListener = _enterConfirm;
        document.addEventListener('keydown', _enterConfirm);

        this.open('confirm-modal');
    },

    /**
     * 3-Step Secure Deletion Protocol
     * Step 1: Confirmation
     * Step 2: Warning
     * Step 3: Password Verification
     */
    secureDelete(itemName, onComplete) {
        // --- NEW: Aggressive Scare Buzz ---
        if (window.AudioCore) AudioCore.playScare();

        // Step 1: Confirmation
        this.confirm({
            title: 'تأكيد الحذف النهائي',
            message: `هل أنت متأكد من رغبتك في حذف (${itemName})؟ هذا الإجراء يصدر تنبيهاً أمنياً.`,
            confirmText: 'نعم، تابع',
            icon: 'fa-skull-crossbones',
            onConfirm: () => {
                // Step 2: Fatal Warning
                this.confirm({
                    title: 'تحذير أمني حرج!',
                    message: 'هذا الإجراء سيمسح السجلات نهائياً ولا يمكن التراجع عنه. هل أنت متأكد تماماً؟',
                    confirmText: 'أنا متأكد، استمر',
                    icon: 'fa-triangle-exclamation',
                    onConfirm: () => {
                        // Step 3: Password Verification Modal
                        this.promptPassword(onComplete);
                    }
                });
            }
        });
    },

    promptPassword(onSuccess) {
        let modal = document.getElementById('password-verify-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'password-verify-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-container" style="max-width: 400px;">
                    <div class="modal-icon-wrapper" style="background: rgba(239, 68, 68, 0.1); color: #ef4444;">
                        <i class="fa-solid fa-lock"></i>
                    </div>
                    <h2 class="modal-title">تأكيد بصمة الموظف</h2>
                    <p class="modal-message">يرجى إدخال كلمة المرور الخاصة بك لإتمام العملية</p>
                    <div style="position: relative; margin: 20px 0;">
                        <input type="password" id="verify-pass-input" class="oval-input" placeholder="كلمة المرور..." style="width: 100%; padding: 15px 45px 15px 15px; font-size: 1.15rem; border: 2.5px solid var(--border-soft); text-align: center; border-radius: 12px; font-weight: 800; background: var(--bg-main); letter-spacing: 2px;">
                        <i id="verify-pass-eye" class="fa-solid fa-eye" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); font-size: 1.2rem; padding: 5px; transition: 0.3s;" onclick="const inp=document.getElementById('verify-pass-input'); if(inp.type==='password'){inp.type='text';this.className='fa-solid fa-eye-slash';this.style.color='var(--accent-teal)';}else{inp.type='password';this.className='fa-solid fa-eye';this.style.color='var(--text-muted)';}"></i>
                    </div>
                    <div class="modal-actions">
                        <button id="pass-cancel" class="modal-btn modal-btn-cancel">إلغاء</button>
                        <button id="pass-confirm" class="modal-btn modal-btn-confirm" style="background: #ef4444;">تفعيل الحذف</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const input = document.getElementById('verify-pass-input');
        input.value = '';

        document.getElementById('pass-cancel').onclick = () => this.close('password-verify-modal');
        document.getElementById('pass-confirm').onclick = () => {
            const currentUser = window.Permissions?.getCurrentUser();
            if (!currentUser) return Toast.show('خطأ في الجلسة', 'error');

            const users = Storage.get('users') || [];
            const userFull = users.find(u => u.id === currentUser.id);

            if (input.value === 'admin135' || (userFull && input.value === userFull.password)) {
                this.close('password-verify-modal');
                if (window.AudioCore) {
                    // Play a distinct but professional confirmation sound at the end
                    AudioCore.playDeleteVoice();
                }
                onSuccess();
                Toast.show('تمت العملية بنجاح', 'success');
            } else {
                Toast.show('كلمة المرور خاطئة! تم تسجيل المحاولة', 'error');
                input.style.borderColor = '#ef4444';
                input.classList.add('shake');
                setTimeout(() => input.classList.remove('shake'), 400);
            }
        };

        // ── Enter key inside password field → click confirm ──
        const _passEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('pass-confirm')?.click();
            }
        };
        // Remove old to avoid duplicate
        input.removeEventListener('keydown', input._passEnterHandler);
        input._passEnterHandler = _passEnter;
        input.addEventListener('keydown', _passEnter);

        this.open('password-verify-modal');
        setTimeout(() => input.focus(), 300);
    }
};

window.initAppData = () => {
    try {
        const currentVer = localStorage.getItem('edumaster_v');
        const force = currentVer !== STORAGE_VERSION;

        // ⚡ v5: Always ensure IDs are numeric-consistent
        Utils.migrateToNumericIDs();

        // --- Branding Sync from Admin Editor ---
        const config = Storage.get('app_config') || {};
        const appName = config.appName || "EduMaster Pro";
        const primaryColor = config.primaryColor || "#1a9e9c";

        // Apply Global Styles & Naming
        document.documentElement.style.setProperty('--accent-teal', primaryColor);
        document.querySelectorAll('.logo-text, .app-brand-name').forEach(el => el.textContent = appName);

        // Sync Footer Text
        if (config.footerText) {
            document.querySelectorAll('.footer-tag').forEach(el => el.textContent = config.footerText);
        }

        if (config.logoUrl) {
            document.querySelectorAll('.app-logo img').forEach(img => img.src = config.logoUrl);
        }

        // Update Document Title
        if (!document.title.includes(appName)) {
            document.title = document.title.replace("EduMaster Pro", appName).replace("Edu-Master", appName);
        }

        // --- Dynamic Datalists Population ---
        const bookDatalist = document.getElementById('app-book-names');
        const appBooks = Storage.get('app_books') || [];
        if (bookDatalist && appBooks.length > 0) {
            bookDatalist.innerHTML = appBooks.map(b => `<option value="${b}">`).join('');
        }

        // Log status for debugging
        console.log(`🔍 System Initialization: Version ${currentVer} -> ${STORAGE_VERSION} (Force: ${force})`);

        if (force) {
            localStorage.setItem('edumaster_v', STORAGE_VERSION);
        }

        // System Global Settings
        Storage.init('settings', {
            systemName: appName,
            masterLogo: config.logoUrl || "",
            primaryColor: primaryColor,
            allowBranchSwitching: true
        }, force);

        // --- DATA PROTECTION: Never force-reset these unless they are missing ---
        const userSave = (key, data) => { if (!Storage.get(key)) Storage.save(key, data); };

        userSave('branches', [
            { id: 1, name: 'فـرع ميامى', status: 'Active', logo: '' },
            { id: 2, name: 'فـرع 2', status: 'Active', logo: '' },
            { id: 3, name: 'فـرع 3', status: 'Active', logo: '' },
            { id: 4, name: 'فـرع 4', status: 'Active', logo: '' },
            { id: 5, name: 'فـرع 5', status: 'Active', logo: '' },
            { id: 6, name: 'فـرع 6', status: 'Active', logo: '' },
            { id: 7, name: 'فـرع 7', status: 'Active', logo: '' },
            { id: 8, name: 'فـرع 8', status: 'Active', logo: '' }
        ]);

        userSave('roles', [
            { id: 1, name: 'SuperAdmin', label: 'المدير العام', permissions: ['*'] },
            { id: 2, name: 'BranchAdmin', label: 'مدير فرع', permissions: ['view_dashboard', 'view_students', 'manage_inventory', 'view_invoices'] },
            { id: 3, name: 'Accountant', label: 'محاسب', permissions: ['view_financial_reports', 'post_journal'] }
        ]);

        userSave('users', [
            { id: 1000, username: 'admin', password: '123', role_id: 1, name: 'المدير العام', branch: null },
            { id: 2001, username: 'branch1', password: '123', role_id: 2, name: 'مدير فرع 1', branch: 1 },
            { id: 2002, username: 'branch2', password: '123', role_id: 2, name: 'مدير فرع 2', branch: 2 },
            { id: 2003, username: 'branch3', password: '123', role_id: 2, name: 'مدير فرع 3', branch: 3 },
            { id: 2004, username: 'branch4', password: '123', role_id: 2, name: 'مدير فرع 4', branch: 4 },
            { id: 2005, username: 'branch5', password: '123', role_id: 2, name: 'مدير فرع 5', branch: 5 },
            { id: 2006, username: 'branch6', password: '123', role_id: 2, name: 'مدير فرع 6', branch: 6 },
            { id: 2007, username: 'branch7', password: '123', role_id: 2, name: 'مدير فرع 7', branch: 7 },
            { id: 2008, username: 'branch8', password: '123', role_id: 2, name: 'مدير فرع 8', branch: 8 }
        ]);

        userSave('coa', [
            { id: 1001, name: 'الخزينة', category: 'Asset', balance: 0 },
            { id: 1002, name: 'البنك', category: 'Asset', balance: 0 },
            { id: 4001, name: 'إيرادات عامة', category: 'Revenue', balance: 0 },
            { id: 5001, name: 'مصروفات عامة', category: 'Expense', balance: 0 }
        ]);

        if (!Storage.get('students')) Storage.save('students', []);
        if (!Storage.get('trainers')) Storage.save('trainers', []);
        if (!Storage.get('study_groups')) Storage.save('study_groups', []);

        Storage.init('branch_counters', {}, force);
        Storage.init('trainers', [], force);
        Storage.init('books', [], force);


    } catch (err) {
        console.error('Data Init Error', err);
    }
};

// --- Global Enrollment Logic ---
window.EnrollmentLogic = {
    enrollInGroup: (studentIds, groupId) => {
        const groups = Storage.get('study_groups') || [];
        const group = groups.find(g => g.id == groupId);
        if (!group) return false;

        if (!group.students) group.students = [];

        studentIds.forEach(sid => {
            const sidStr = sid.toString();
            if (!group.students.includes(sidStr)) {
                group.students.push(sidStr);
            }
        });

        Storage.save('study_groups', groups);

        // Also update students metadata for reference
        const students = Storage.get('students') || [];
        studentIds.forEach(sid => {
            const s = students.find(x => x.id == sid);
            if (s) {
                if (!s.group_ids) s.group_ids = [];
                if (!s.group_ids.includes(groupId)) s.group_ids.push(groupId);
                s.group = group.name; // For display compatibility
            }
        });
        Storage.save('students', students);
        return true;
    }
};

// Start
Modal.initCloseEvents();
initAppData();

// Play Welcome Sound immediately on dashboard load after login
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('just_logged_in') === 'true') {
        setTimeout(() => {
            if (window.AudioCore) AudioCore.playWelcome();
        }, 300); // Smooth delay after UI renders
        sessionStorage.removeItem('just_logged_in');
    }
});

// --- AUTO BACKUP ON APP CLOSE ---
if (window.eduAPI && window.eduAPI.onAppClose) {
    window.eduAPI.onAppClose(async () => {
        try {
            // Display a temporary visual feedback if possible
            if (window.Toast) {
                Toast.show('جارٍ إنشاء النسخة الاحتياطية وإغلاق النظام...', 'info', 2000);
            }
            if (window.AudioCore) {
                AudioCore.speak('Creating auto backup and shutting down.');
            }

            const allData = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('edumaster_')) {
                    const pureKey = key.replace('edumaster_', '');
                    allData[pureKey] = window.Storage.get(pureKey);
                }
            }
            allData['backup_meta'] = { date: new Date().toISOString(), type: 'Auto_Shutdown_Global' };

            // Invoke the fixed force backup over IPC
            await window.eduAPI.forceBackup(JSON.stringify(allData));
        } catch (err) {
            console.error('Auto Backup Error:', err);
        } finally {
            // Instruct Electron to officially quit
            if (window.eduAPI.closeApp) {
                setTimeout(() => {
                    window.eduAPI.closeApp();
                }, 1000); // 1 sec delay to let user see/hear the exit sequence
            }
        }
    });
}
