/**
 * Firebase Config & Bridge v1.0
 * ⚠️ REPLACE WITH YOUR REAL FIREBASE API KEY FROM CONSOLE.FIREBASE.GOOGLE.COM
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

// Initialize Firebase only if config is valid
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized - Cloud Sync Ready!");
} else {
    console.warn("⚠️ Firebase NOT initialized. Please set your credentials in js/firebase-config.js");
}

/**
 * 🔗 Bridge Functions:
 * Use these to talk to the cloud from both apps.
 */
window.Cloud = {
    // Send a scan request from mobile
    pushScan: (branchId, scanData) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const payload = { ...scanData, serverTimestamp: timestamp, branchId };
        
        // 1. Push to Branch Specific node
        db.ref(`edumaster/scans/${branchId}`).push().set(payload);
        
        // 2. Mirror to Universal node (v7.1 - For easier PC monitoring)
        return db.ref(`edumaster/all_scans`).push().set(payload);
    },

    // 🎓 Student Registration Cloud Sync (v2.0)
    pushStudent: (branchId, studentData) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const ref = db.ref(`edumaster/registrations/${branchId}`).push();
        return ref.set({
            ...studentData,
            serverTimestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 💰 Financial Pulse (Ledger) Sync (v2.0)
    pushFinancialRecord: (branchId, record) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const ref = db.ref(`edumaster/finances/${branchId}`).push();
        return ref.set({
            ...record,
            serverTimestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 📢 Follow-up/Lead Pulse (v2.0)
    pushFollowUp: (branchId, leadData) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const ref = db.ref(`edumaster/leads/${branchId}`).push();
        return ref.set({
            ...leadData,
            serverTimestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // Listen for scans on the console
    onScanReceived: (branchId, callback, listenerId = null) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const branchStr = branchId || 'all_scans';
        const targetPath = (branchId === 'all' || !branchId) ? 'edumaster/all_scans' : `edumaster/scans/${branchId}`;
        const scansRef = db.ref(targetPath).limitToLast(5); // Increased sweep to 5 records for reliability

        const lid = listenerId || window.location.pathname.split('/').pop() || 'live_sync';
        console.log(`📡 [Cloud] Tuning into: ${targetPath} | Key: ${lid}`);

        scansRef.on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            const now = Date.now();
            const serverTs = data.serverTimestamp || data.timestamp || 0;
            const msgTs = typeof serverTs === 'string' ? new Date(serverTs).getTime() : serverTs;

            // ⚡ LIVE ONLY FILTER (Expert Security v8.0)
            // Only process scans from the last 10 seconds (Prevents photo sharing tricks)
            if (Math.abs(now - msgTs) > 10000) {
                console.warn(`🛡️ Security: Blocked old signal (Likely Photo) - Age: ${Math.round((now - msgTs)/1000)}s`);
                return; // Too old
            }

            console.log(`📡 [${lid}] Live Signal:`, data.name || data.id);
            callback(data);
        });
    },

    // 🖥️ Global Sync Listener for Admin Dashboard
    onDataUpdated: (path, callback) => {
        if (!window.firebase) return;
        const db = firebase.database();
        db.ref(`edumaster/${path}`).limitToLast(1).on('child_added', (snapshot) => {
            const data = snapshot.val();
            const now = Date.now();
            // RELAXED check
            if (data.serverTimestamp && (Math.abs(now - data.serverTimestamp) < 3600000)) {
                callback(data);
            } else if (!data.serverTimestamp) {
                callback(data); // If no timestamp, assume new (e.g. from local edit)
            }
        });
    },

    // 🤖 REAL-TIME SCAN SYNC (v7.1 - Flat Channel)
    startScanBackgroundSync: (branchId, onSyncCallback) => {
        if (!window.firebase) return;
        const db = firebase.database();
        // 🌍 v7.1: FLAT CHANNEL - Listens to all scans everywhere for maximum speed
        const scansRef = db.ref(`edumaster/all_scans`).limitToLast(1);

        // Per-page deduplication to allow all tabs to sync independently
        const lid = window.location.pathname.split('/').pop() || 'bg_sync';
        const dedupKey = `last_bg_scan_id_${lid}`;

        scansRef.on('child_added', (snapshot) => {
            const scan = snapshot.val();
            if (!scan || !scan.id) return;
            
            const key = snapshot.key;
            const lastProcessed = localStorage.getItem(dedupKey);
            if (key === lastProcessed) return;
            localStorage.setItem(dedupKey, key);

            // Security: Prevent infinite loop if something goes wrong
            console.log(`📡 [Universal Sync] Received [${lid}]:`, scan.name || scan.id);
            // 🏷️ v7.2 Fix: Use window.Cloud explicitly (instead of lexically bound 'this')
            window.Cloud._handleCloudScan(scan, onSyncCallback);
        });
    },

    // Internal helper to reuse logic
    _handleCloudScan: (scan, onSyncCallback) => {
        if (!scan) return;
        
        let targetId = scan.id;
        
        // Find actual local ID if code is provided to fix cross-device sync mismatch
        if (scan.code && typeof Storage !== 'undefined') {
            const listKey = scan.type === 'STUDENT' ? 'students' : (scan.type === 'TRAINER' ? 'trainers' : 'users');
            const list = Storage.get(listKey) || [];
            
            const cleanCode = String(scan.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            const matchedUser = list.find(u => {
                return (u.code && String(u.code).toUpperCase() === cleanCode) || 
                       (u.serial_id && String(u.serial_id).toUpperCase() === cleanCode) ||
                       (u.trainerCode && String(u.trainerCode).toUpperCase() === cleanCode) ||
                       (u.user_code && String(u.user_code).toUpperCase() === cleanCode) ||
                       (u.id && String(u.id) === String(scan.id));
            });
            if (matchedUser) {
                targetId = matchedUser.id;
                scan.name = matchedUser.name; // Enrich name if missing
            }
        }

        if (!targetId) return;

        const now = new Date(scan.timestamp || Date.now());
        const dateKey = now.toLocaleDateString('en-CA');
        let logKey = (scan.type === 'STUDENT' ? 'student_attendance' : (scan.type === 'TRAINER' ? 'trainer_logs' : 'employee_logs'));

        if (scan.type === 'STUDENT') {
            const att = (typeof Storage !== 'undefined') ? (Storage.get('attendance') || {}) : {};
            const nKey = `${dateKey}_global`;
            if (!att[nKey]) att[nKey] = {};
            if (!att[nKey][targetId]) att[nKey][targetId] = {};
            att[nKey][targetId].time = scan.time;
            if (typeof Storage !== 'undefined') Storage.save('attendance', att);
        } else {
            const logs = (typeof Storage !== 'undefined') ? (Storage.get(logKey) || {}) : {};
            if (!logs[dateKey]) logs[dateKey] = {};
            if (!logs[dateKey][targetId]) logs[dateKey][targetId] = {};
            const uLog = logs[dateKey][targetId];
            uLog.name = scan.name;
            uLog.type = scan.type;
            if (!uLog.in) uLog.in = scan.time; else uLog.out = scan.time;
            if (typeof Storage !== 'undefined') Storage.save(logKey, logs);
        }
        if (onSyncCallback) onSyncCallback(scan);
    },

    // 📤 FULL DATABASE PUSH (Hyper-Granular v8.0)
    pushAllRecords: async (allData) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const rootRef = db.ref('edumaster/full_sync');

        console.log("☁️ Cloud: Starting Hyper-Granular push...");
        
        // Use a single update object to minimize round-trips while maintaining node independence
        const updates = {};
        const timestamp = firebase.database.ServerValue.TIMESTAMP;

        for (const [key, value] of Object.entries(allData)) {
            if (!value) continue;

            // 🕒 Micro-Partitioning for Large Log Engines (split by date)
            if (['attendance', 'trainer_logs', 'employee_logs'].includes(key) && typeof value === 'object') {
                for (const [dateKey, dateData] of Object.entries(value)) {
                    updates[`${key}/${dateKey}`] = dateData;
                }
            } 
            // 👤 Atomic Partitioning for Entities (split by ID)
            else if (['students', 'trainers', 'users', 'ledger', 'invoices'].includes(key) && Array.isArray(value)) {
                console.log(`👤 Atomic sync for ${key}: ${value.length} items...`);
                value.forEach(item => {
                    if (item && item.id) {
                        updates[`${key}/${item.id}`] = item;
                    }
                });
            }
            else {
                // 📂 Small settings/meta
                updates[key] = value;
            }
        }

        updates['sync_meta/syncAt'] = timestamp;

        try {
            // .update() at root handles each key as a separate node write
            await rootRef.update(updates);
            console.log("✅ Cloud Sync: Hyper-Granular upload complete.");
        } catch (err) {
            console.error("❌ Cloud Sync Failed:", err);
            // Fallback: If total update object is too large, try individual sets (slower but safer)
            if (err.message.includes('too large')) {
                console.warn("⚠️ Update too large, switching to individual node sets...");
                for (const [path, data] of Object.entries(updates)) {
                    await rootRef.child(path).set(data);
                }
            }
        }
    },

    // 📥 FULL DATABASE PULL (Hyper-Granular Re-consolidation v8.0)
    pullAllRecords: async () => {
        if (!window.firebase) return null;
        const db = firebase.database();
        const snapshot = await db.ref('edumaster/full_sync').once('value');
        const data = snapshot.val();
        if (!data) return null;

        // Re-consolidate atomic objects back into arrays for the local storage engine
        ['students', 'trainers', 'users', 'ledger', 'invoices'].forEach(key => {
            if (data[key] && typeof data[key] === 'object' && !Array.isArray(data[key])) {
                console.log(`📦 Re-consolidating atomic list: ${key}...`);
                data[key] = Object.values(data[key]);
            }
        });

        return data;
    }
};
