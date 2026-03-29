/**
 * Firebase Config & Bridge v10.1 (Final Resilient Edition)
 */

const firebaseConfig = {
  apiKey: "AIzaSyDlcUHhkwMw1iCavcMmPkqxYBoW6WLGZhI",
  authDomain: "edu-master-21147.firebaseapp.com",
  databaseURL: "https://edu-master-21147-default-rtdb.firebaseio.com",
  projectId: "edu-master-21147",
  storageBucket: "edu-master-21147.firebasestorage.app",
  messagingSenderId: "771070677548",
  appId: "1:771070677548:web:0e8dfa6b2668d08b303789"
};

// ✅ v10.1: Safe Multi-Engine Initialization
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized - Multi-Engine (RTDB + Firestore) Ready!");
}

// 🛡️ [NEW] CLOUD FIRESTORE FRAGMENTED ENGINE
window.FirestoreEngine = {
    db: (window.firebase && firebase.firestore) ? firebase.firestore() : null,
    
    // Config: Size of each data fragment (items)
    CHUNK_SIZE: 250,

    /** 📤 Fragmented Save: Splits large arrays into separate documents */
    async saveFragmented(path, data) {
        if (!this.db) return;
        const colRef = this.db.collection('fragments').doc(path).collection('chunks');
        const oldChunks = await colRef.get();
        const batch = this.db.batch();
        oldChunks.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        const chunks = [];
        for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
            chunks.push(data.slice(i, i + this.CHUNK_SIZE));
        }

        const saveBatch = this.db.batch();
        const manifestRef = this.db.collection('fragments').doc(path);
        chunks.forEach((chunk, index) => {
            const docRef = colRef.doc(`part_${String(index).padStart(3, '0')}`);
            saveBatch.set(docRef, { data: chunk, index, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
        });
        saveBatch.set(manifestRef, { count: chunks.length, totalItems: data.length, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        await saveBatch.commit();
    },

    /** 📥 Fragmented Load: Re-assembles fragments into a single array */
    async loadFragmented(path) {
        if (!this.db) return null;
        const colRef = this.db.collection('fragments').doc(path).collection('chunks');
        const snapshot = await colRef.orderBy('index').get();
        const allItems = [];
        snapshot.forEach(doc => { allItems.push(...doc.data().data); });
        return allItems.length > 0 ? allItems : null;
    }
};

/**
 * 🔗 Bridge Functions (v10.1 - Resilient Transition Layer)
 */
window.Cloud = {
    pushScan: async (branchId, scanData) => {
        const timestamp = Date.now();
        const fingerprint = `${scanData.id}_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
        const payload = { ...scanData, timestamp, branchId, fingerprint };

        if (window.firebase && firebase.database) {
             firebase.database().ref(`edumaster/all_scans`).push().set({ 
                 ...payload, serverTimestamp: firebase.database.ServerValue.TIMESTAMP 
             });
        }
        if (window.FirestoreEngine?.db) {
            await window.FirestoreEngine.db.collection('scans').add({
                ...payload, timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    },

    pushStudent: (branchId, studentData) => {
        if (!window.firebase) return;
        return firebase.database().ref(`edumaster/registrations/${branchId}`).push().set({
            ...studentData, serverTimestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },

    pushAllRecords: async (allData) => {
        if (window.firebase && firebase.database) {
            const rootRef = firebase.database().ref('edumaster/full_sync');
            const updates = {};
            for (const [key, value] of Object.entries(allData)) {
                if (!value) continue;
                if (['attendance', 'trainer_logs', 'employee_logs'].includes(key)) {
                    for (const [dk, dv] of Object.entries(value)) updates[`${key}/${dk}`] = dv;
                } else if (['students', 'trainers', 'users'].includes(key)) {
                    value.forEach(item => { if(item.id) updates[`${key}/${item.id}`] = item; });
                } else updates[key] = value;
            }
            updates['sync_meta/syncAt'] = firebase.database.Value ? firebase.database.ServerValue.TIMESTAMP : Date.now();
            await rootRef.update(updates).catch(e => console.warn("RTDB Part failed", e));
        }

        if (window.FirestoreEngine?.db) {
            const keysToFragment = ['students', 'trainers', 'users', 'ledger', 'invoices'];
            for (const key of keysToFragment) {
                if (allData[key] && Array.isArray(allData[key])) {
                    await window.FirestoreEngine.saveFragmented(key, allData[key]);
                }
            }
            await window.FirestoreEngine.db.collection('full_sync').doc('settings').set({
                app_config: allData.app_config || {},
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    },

    pullAllRecords: async () => {
        if (window.FirestoreEngine?.db) {
            try {
                // Timeout check: If Firestore doesn't respond in 2.5s, fallback to RTDB instantly
                const fsPromise = (async () => {
                    const keys = ['students', 'trainers', 'users', 'ledger', 'invoices'];
                    const data = {};
                    const tasks = keys.map(async k => {
                        const frag = await window.FirestoreEngine.loadFragmented(k);
                        if(frag) data[k] = frag;
                    });
                    await Promise.all(tasks);
                    const settings = await window.FirestoreEngine.db.collection('full_sync').doc('settings').get();
                    if (settings.exists) data.app_config = settings.data().app_config;
                    return (data.students || data.trainers) ? data : null;
                })();

                const timeout = new Promise((_, reject) => setTimeout(() => reject("FS_TIMEOUT"), 2500));
                const fastData = await Promise.race([fsPromise, timeout]);
                if (fastData) return fastData;
            } catch (e) { console.warn("Firestore Pull failed (Timeout/Error), using RTDB fallback.", e); }
        }

        if (window.firebase && firebase.database) {
            const snapshot = await firebase.database().ref('edumaster/full_sync').once('value');
            const data = snapshot.val();
            if (data) {
                ['students', 'trainers', 'users', 'ledger', 'invoices'].forEach(key => {
                    if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
                        data[key] = Object.values(data[key]);
                    }
                });
                return data;
            }
        }
        return null;
    },

    onScanReceived: (branchId, callback, listenerId = null) => {
        if (!window.FirestoreEngine?.db) {
            if (window.firebase && firebase.database) {
                const startTime = Date.now();
                return firebase.database().ref('edumaster/all_scans').limitToLast(5).on('child_added', snapshot => {
                    const data = snapshot.val();
                    if ((data.serverTimestamp || data.timestamp || 0) < (startTime - 2000)) return;
                    if (branchId && branchId !== 'all' && data.branchId !== branchId) return;
                    callback(data);
                });
            }
            return;
        }

        const startTime = firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 3000));
        return window.FirestoreEngine.db.collection('scans')
            .where('timestamp', '>=', startTime)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === "added") {
                        const data = change.doc.data();
                        const fingerprint = data.fingerprint || change.doc.id;
                        if (!window._processedFPs) window._processedFPs = new Set();
                        if (window._processedFPs.has(fingerprint)) return;
                        window._processedFPs.add(fingerprint);
                        if (window._processedFPs.size > 50) window._processedFPs.delete(Array.from(window._processedFPs)[0]);

                        if (!branchId || branchId === 'all' || data.branchId === branchId) {
                            callback({ ...data, id: change.doc.id });
                        }
                    }
                });
            }, err => console.error("Firestore Listen Error:", err));
    },

    startScanBackgroundSync: (branchId, onSyncCallback) => {
        return window.Cloud.onScanReceived(branchId, (scan) => {
            window.Cloud._handleCloudScan(scan, onSyncCallback);
        }, 'background-sync');
    },

    _handleCloudScan: async (scan, onSyncCallback) => {
        if (!scan || !scan.id) return;
        const ts = (scan.timestamp && scan.timestamp.toMillis) ? scan.timestamp.toMillis() : (scan.timestamp || Date.now());
        const dateObj = new Date(ts);
        const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
        
        if (typeof Storage !== 'undefined') {
            const listKey = scan.type === 'STUDENT' ? 'attendance' : (scan.type === 'TRAINER' ? 'trainer_logs' : 'employee_logs');
            const data = Storage.get(listKey) || {};
            const itemKey = scan.type === 'STUDENT' ? `${dateKey}_global` : dateKey;
            if (!data[itemKey]) data[itemKey] = {};
            if (!data[itemKey][scan.id]) data[itemKey][scan.id] = {};
            const entry = data[itemKey][scan.id];

            if (entry.time === scan.time || entry.in === scan.time || entry.out === scan.time) return; 

            if (scan.type === 'STUDENT') {
                if (!entry.time) entry.time = scan.time; else entry.out = scan.time;
            } else {
                entry.name = scan.name || entry.name;
                entry.type = scan.type;
                if (!entry.in) entry.in = scan.time; else entry.out = scan.time;
            }
            await Storage.save(listKey, data);
        }
        if (onSyncCallback) onSyncCallback(scan);
    }
};
