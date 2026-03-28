/**
 * ⚡ EduMaster Pro - IndexedDB Engine (IDB v2.0)
 * 
 * Drop-in replacement for localStorage-based Storage.
 * Provides UNLIMITED storage (gigabytes) vs the old 5MB localStorage limit.
 * Maintains a synchronous in-memory cache for backwards compatibility
 * with legacy code that calls Storage.get() synchronously.
 * 
 * ────────────────────────────────────────────────────────────
 *  HOW IT WORKS:
 *  1. On app start, ALL data is loaded from IndexedDB into RAM (cache).
 *  2. Storage.get() reads from the in-memory cache → INSTANT (no async wait).
 *  3. Storage.save() writes to cache immediately AND queues a write to IndexedDB.
 *  4. IndexedDB writes happen asynchronously in the background → NO UI blocking.
 * ────────────────────────────────────────────────────────────
 */

window.IDBEngine = (() => {
    const DB_NAME = 'EduMasterProDB';
    const DB_VERSION = 2;
    const STORE_NAME = 'keyvalue';
    const KEY_PREFIX = 'edumaster_';

    let _db = null;
    let _cache = {}; // In-memory cache for synchronous access
    let _ready = false;
    let _readyCallbacks = [];

    // ── Internal: Open / Upgrade the Database ──────────────────
    function _openDB() {
        return new Promise((resolve, reject) => {
            if (_db) return resolve(_db);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // Main key-value store (replaces localStorage)
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
                // Preserve the backup folder handles store from backup-engine.js
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
                console.log('✅ EduMasterProDB upgraded to v' + DB_VERSION);
            };

            request.onsuccess = (event) => {
                _db = event.target.result;
                resolve(_db);
            };

            request.onerror = (event) => {
                console.error('❌ IDBEngine: Failed to open database:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // ── Internal: Write a single key to IndexedDB ──────────────
    async function _writeToDB(key, value) {
        try {
            const db = await _openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put({ key, value });
                tx.oncomplete = () => resolve(true);
                tx.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IDBEngine write error:', e);
        }
    }

    // ── Internal: Delete a key from IndexedDB ──────────────────
    async function _deleteFromDB(key) {
        try {
            const db = await _openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.delete(key);
                tx.oncomplete = () => resolve(true);
                tx.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IDBEngine delete error:', e);
        }
    }

    // ── Internal: Load ALL data into cache at startup ──────────
    async function _loadAllIntoCache() {
        try {
            const db = await _openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const getAllReq = store.getAll();

                getAllReq.onsuccess = () => {
                    const records = getAllReq.result || [];
                    records.forEach(record => {
                        if (record.key) {
                            _cache[record.key] = record.value;
                        }
                    });
                    console.log(`✅ IDBEngine: Loaded ${records.length} records into memory cache.`);
                    resolve(records.length);
                };

                getAllReq.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.error('IDBEngine load error:', e);
            return 0;
        }
    }

    // ── Internal: Migrate old localStorage data to IDB ─────────
    async function _migrateFromLocalStorage() {
        const migrationKey = '__idb_migrated_v2__';
        if (localStorage.getItem(migrationKey)) return 0; // Already migrated

        console.log('🔄 IDBEngine: Starting migration from localStorage...');
        let count = 0;
        const keysToMigrate = Object.keys(localStorage);

        for (const lsKey of keysToMigrate) {
            if (!lsKey.startsWith(KEY_PREFIX)) continue;
            try {
                const rawValue = localStorage.getItem(lsKey);
                const parsedValue = JSON.parse(rawValue);
                _cache[lsKey] = parsedValue;
                await _writeToDB(lsKey, parsedValue);
                count++;
            } catch (e) {
                // Keep raw string if not valid JSON
                const rawValue = localStorage.getItem(lsKey);
                _cache[lsKey] = rawValue;
                await _writeToDB(lsKey, rawValue);
                count++;
            }
        }

        localStorage.setItem(migrationKey, '1');
        console.log(`✅ IDBEngine: Migrated ${count} items from localStorage to IndexedDB.`);
        return count;
    }

    // ── Public: Initialize the engine (call once on app start) ──
    async function init() {
        if (_ready) return true;

        try {
            await _openDB();
            await _migrateFromLocalStorage();
            await _loadAllIntoCache();
            _ready = true;
            _readyCallbacks.forEach(cb => cb());
            _readyCallbacks = [];
            console.log('🚀 IDBEngine: Ready. Synchronous cache active.');
            return true;
        } catch (e) {
            console.error('IDBEngine init failed, falling back to localStorage:', e);
            return false;
        }
    }

    // ── Public: Register a callback for when IDB is ready ───────
    function onReady(cb) {
        if (_ready) return cb();
        _readyCallbacks.push(cb);
    }

    // ── Public: Get data (synchronous, from in-memory cache) ────
    function get(key) {
        const fullKey = key.startsWith(KEY_PREFIX) ? key : KEY_PREFIX + key;
        const value = _cache[fullKey];
        if (value === undefined || value === null) return null;
        return value;
    }

    // ── Public: Save data (sync to cache + async to IDB) ────────
    function save(key, data) {
        const fullKey = key.startsWith(KEY_PREFIX) ? key : KEY_PREFIX + key;
        _cache[fullKey] = data;

        // Also mirror to localStorage as a quick backup / compatibility
        try {
            const serialized = JSON.stringify(data);
            // Only mirror small items (< 50KB) to avoid localStorage quota errors
            if (serialized.length < 50000) {
                localStorage.setItem(fullKey, serialized);
            }
        } catch (e) { /* localStorage quota exceeded – that's fine, IDB has it */ }

        // Async background write to IndexedDB (don't block UI)
        _writeToDB(fullKey, data).catch(e => console.warn('IDB background write failed:', e));
    }

    // ── Public: Init key if not exists ──────────────────────────
    function initKey(key, initialData, force = false) {
        const existing = get(key);
        if (force || existing === null || existing === undefined) {
            save(key, initialData);
        }
    }

    // ── Public: Remove a key ─────────────────────────────────────
    function remove(key) {
        const fullKey = key.startsWith(KEY_PREFIX) ? key : KEY_PREFIX + key;
        delete _cache[fullKey];
        localStorage.removeItem(fullKey);
        _deleteFromDB(fullKey).catch(e => console.warn('IDB delete failed:', e));
    }

    // ── Public: Get ALL keys from cache ─────────────────────────
    function getAllKeys() {
        return Object.keys(_cache).filter(k => k.startsWith(KEY_PREFIX));
    }

    // ── Public: Get entire cache snapshot (for exporting) ────────
    function getAllData() {
        const result = {};
        getAllKeys().forEach(key => { result[key] = _cache[key]; });
        return result;
    }

    // ── Public: Bulk import data (for restoring a backup) ────────
    async function bulkImport(data) {
        const keys = Object.keys(data);
        for (const key of keys) {
            if (key === 'backup_meta') continue;
            const parsedValue = typeof data[key] === 'string' ? (() => {
                try { return JSON.parse(data[key]); } catch { return data[key]; }
            })() : data[key];
            _cache[key] = parsedValue;
            await _writeToDB(key, parsedValue);
            try { localStorage.setItem(key, JSON.stringify(parsedValue)); } catch (e) { }
        }
        console.log(`✅ IDBEngine: Bulk imported ${keys.length} items.`);
    }

    // ── Public: Storage Size Estimate ───────────────────────────
    async function getStorageInfo() {
        const cacheSize = JSON.stringify(_cache).length;
        let quotaInfo = { quota: null, usage: null };

        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                quotaInfo = {
                    quota: (estimate.quota / (1024 * 1024)).toFixed(0) + ' MB',
                    usage: (estimate.usage / (1024 * 1024)).toFixed(2) + ' MB'
                };
            } catch (e) { }
        }

        return {
            cacheItems: Object.keys(_cache).length,
            cacheSize: (cacheSize / 1024).toFixed(1) + ' KB',
            ...quotaInfo
        };
    }

    return {
        init,
        onReady,
        get,
        save,
        initKey,
        remove,
        getAllKeys,
        getAllData,
        bulkImport,
        getStorageInfo,
        get isReady() { return _ready; }
    };
})();
