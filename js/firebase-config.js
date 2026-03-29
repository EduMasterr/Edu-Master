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

// ✅ v9.0: Safe Init - Prevents 'duplicate app' error if script is loaded more than once
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("🔥 Firebase Initialized - Cloud Sync Ready!");
    } else {
        console.log("🔥 Firebase already active - reusing existing instance.");
    }
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
        const payload = { 
            ...scanData, 
            serverTimestamp: timestamp, 
            branchId,
            fingerprint: `${scanData.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        };
        
        // v9.1: Single-source strategy. Mirroring caused double-triggering (In/Out same second).
        // Listeners should now only tune into 'all_scans' or filter by branchId in their callback.
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

    // 👨‍🏫 Trainer Registration Cloud Sync (v2.0)
    pushTrainer: (branchId, trainerData) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const ref = db.ref(`edumaster/full_sync/trainers/${trainerData.id}`);
        return ref.set({
            ...trainerData,
            serverTimestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },

    // 👷 Employee Registration Cloud Sync (v2.0)
    pushUser: (branchId, userData) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const ref = db.ref(`edumaster/full_sync/users/${userData.id}`);
        return ref.set({
            ...userData,
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
        const targetPath = 'edumaster/all_scans';
        const scansRef = db.ref(targetPath).limitToLast(5); 
        const startTime = Date.now(); // 🕒 Capture exactly when we tuned in

        const lid = listenerId || window.location.pathname.split('/').pop() || 'live_sync';
        console.log(`📡 [Cloud] Tuning into: ${targetPath} | Start: ${startTime}`);

        const seenFingerprints = new Set();

        scansRef.on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (!data || !data.id) return;

            // 🛑 v9.2: GHOST SCAN PREVENTION 
            // Firebase .on('child_added') triggers for existing items in the limit.
            // We ignore any scan that was created BEFORE we opened this page.
            const serverTs = data.serverTimestamp || data.timestamp || 0;
            const msgTs = typeof serverTs === 'string' ? new Date(serverTs).getTime() : serverTs;
            
            if (msgTs < (startTime - 2000)) { // Allow 2s margin for server delay
                 console.log(`⏭️ [${lid}] Skipping historical scan:`, data.name || data.id);
                 return;
            }

            // 🔍 v9.1: Branch Filter... (keeps rest of logic)
            if (branchId && branchId !== 'all' && data.branchId && data.branchId !== branchId) {
                return;
            }

            const fingerprint = data.fingerprint || `${data.id}_${serverTs}`;
            if (seenFingerprints.has(fingerprint)) return;
            seenFingerprints.add(fingerprint);
            
            if (seenFingerprints.size > 20) seenFingerprints.delete(Array.from(seenFingerprints)[0]);

            const now = Date.now();
            if (Math.abs(now - msgTs) > 300000) return;

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

    // 🤖 REAL-TIME SCAN SYNC (v9.3 - Final Ghost-Scan Shield)
    startScanBackgroundSync: (branchId, onSyncCallback) => {
        if (!window.firebase) return;
        const db = firebase.database();
        const scansRef = db.ref(`edumaster/all_scans`).limitToLast(5); 

        const lid = window.location.pathname.split('/').pop() || 'bg_sync';
        const dedupKey = `last_bg_scan_id_${lid}`;
        const startTime = Date.now(); // 🕒 Ignore what happened before we arrived

        scansRef.on('child_added', (snapshot) => {
            const scan = snapshot.val();
            if (!scan || !scan.id) return;

            // 🛡️ v9.3: SKIP INITIAL SWEEP
            const serverTs = scan.serverTimestamp || scan.timestamp || 0;
            const msgTs = typeof serverTs === 'string' ? new Date(serverTs).getTime() : serverTs;
            if (msgTs < (startTime - 2000)) return; // Skip old items
            
            const key = snapshot.key;
            if (localStorage.getItem(dedupKey) === key) return;
            localStorage.setItem(dedupKey, key);

            console.log(`📡 [Universal Sync] Received [${lid}]:`, scan.name || scan.id);
            window.Cloud._handleCloudScan(scan, onSyncCallback);
        });
    },

    // ... (keeping other methods)

    // Internal helper to reuse logic
    _handleCloudScan: async (scan, onSyncCallback) => {
        if (!scan) return;
        
        let targetId = scan.id;
        
        // Find actual local ID if code is provided to fix cross-device sync mismatch
        if (scan.code && typeof Storage !== 'undefined') {
            const listKey = scan.type === 'STUDENT' ? 'students' : (scan.type === 'TRAINER' ? 'trainers' : 'users');
            const list = Storage.get(listKey) || [];
            
            const cleanCode = String(scan.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
            const matchedUser = list.find(u => {
                const uCode = (u.code || u.serial_id || u.trainerCode || u.user_code || "");
                return (String(uCode).toUpperCase() === cleanCode) || 
                       (u.id && String(u.id) === String(scan.id));
            });
            if (matchedUser) {
                targetId = matchedUser.id;
                if (!scan.name) scan.name = matchedUser.name;
            }
        }

        if (!targetId) return;

        const timestamp = scan.serverTimestamp || scan.timestamp || Date.now();
        const now = new Date(timestamp);
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        // 🔄 v9.0: Cross-type correction...
        if (typeof Storage !== 'undefined') {
            const students = Storage.get('students') || [];
            const trainers = Storage.get('trainers') || [];
            const users = Storage.get('users') || [];

            const findInList = (list) => list.find(u => String(u.id) === String(targetId));
            const inStudents = findInList(students);
            const inTrainers = findInList(trainers);
            const inUsers    = findInList(users);

            const resolvedUser = inStudents || inTrainers || inUsers;
            if (resolvedUser && !scan.name) scan.name = resolvedUser.name;

            if (!inStudents && scan.type === 'STUDENT') {
                if (inTrainers) scan.type = 'TRAINER';
                else if (inUsers) scan.type = 'EMPLOYEE';
            }
        }

        try {
            if (scan.type === 'STUDENT') {
                const att = Storage.get('attendance') || {};
                const nKey = `${dateKey}_global`;
                if (!att[nKey]) att[nKey] = {};
                if (!att[nKey][targetId]) att[nKey][targetId] = {};
                
                // 🛡️ v9.3: IDEMPOTENCY CHECK - Don't record OUT if it matches existing IN time
                if (att[nKey][targetId].time === scan.time) return; // Already recorded as IN

                if (!att[nKey][targetId].time) {
                    att[nKey][targetId].time = scan.time;
                } else if (att[nKey][targetId].out !== scan.time) {
                    att[nKey][targetId].out = scan.time;
                }
                
                await Storage.save('attendance', att);
            } else {
                const logKey = (scan.type === 'TRAINER' ? 'trainer_logs' : 'employee_logs');
                const logs = Storage.get(logKey) || {};
                if (!logs[dateKey]) logs[dateKey] = {};
                if (!logs[dateKey][targetId]) logs[dateKey][targetId] = {};
                
                const uLog = logs[dateKey][targetId];
                uLog.name = scan.name || uLog.name;
                uLog.type = scan.type;
                if (scan.gps) {
                    if (!uLog.in) uLog.gpsIn = scan.gps; else uLog.gpsOut = scan.gps;
                }
                
                // 🛡️ v9.3: IDEMPOTENCY CHECK
                if (uLog.in === scan.time) return; // Already recorded as IN

                if (!uLog.in) uLog.in = scan.time; 
                else if (uLog.out !== scan.time) uLog.out = scan.time;
                
                await Storage.save(logKey, logs);
            }
            
            if (onSyncCallback) onSyncCallback(scan);
            
            if (window.BroadcastChannel) {
                new BroadcastChannel('edumaster_sync').postMessage({ type: 'CLOUD_SCAN_RECEIVED', scan });
            }
        } catch (e) {
            console.error("❌ Cloud Sync Save Error:", e);
        }
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
