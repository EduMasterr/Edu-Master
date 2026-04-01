/**
 * Firebase Config - Attendance System (مشروع مستقل تماماً)
 * ⚠️ هذا الملف خاص بمشروع Attendance فقط
 * ⚠️ لا علاقة له بمشروع Edu-Master - بيانات منفصلة 100%
 * projectId: attendance-f6fdc
 */

const firebaseConfig = {
  apiKey: "AIzaSyBXc-L71Dqz-UwOXADcboJHAoXvshntHVg",
  authDomain: "attendance-f6fdc.firebaseapp.com",
  projectId: "attendance-f6fdc",
  storageBucket: "attendance-f6fdc.firebasestorage.app",
  messagingSenderId: "809905569514",
  appId: "1:809905569514:web:a2eaebfbc4cab15962a193",
  measurementId: "G-EWDTJR6B22"
};

// ✅ Safe Initialization (prevents duplicate init errors)
if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 [Attendance] Firebase Initialized - مشروع مستقل جديد جاهز!");
} else {
    console.warn("⚠️ [Attendance] Firebase already initialized - skipping.");
}

// 🌩️ Firestore Engine (Primary Storage)
const _db = firebase.firestore();

// ✅ Enable Offline Persistence (يعمل حتى بدون إنترنت)
_db.enablePersistence({ synchronizeTabs: true })
   .catch(err => {
       if (err.code === 'failed-precondition') {
           console.warn('⚠️ Offline persistence: multiple tabs open');
       } else if (err.code === 'unimplemented') {
           console.warn('⚠️ Offline persistence: not supported in this browser');
       }
   });

// 🛡️ Fragmented Sync Engine (تجاوز حد الـ 1MB)
window.FirestoreEngine = {
    db: _db,
    CHUNK_SIZE: 250,

    /** 📤 حفظ مجزأ للمصفوفات الكبيرة */
    async saveFragmented(path, data) {
        if (!this.db || !Array.isArray(data)) return;
        const colRef = this.db.collection('fragments').doc(path).collection('chunks');

        // حذف القطع القديمة
        const oldChunks = await colRef.get();
        const deleteBatch = this.db.batch();
        oldChunks.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();

        // تقسيم البيانات وحفظها
        const saveBatch = this.db.batch();
        const manifestRef = this.db.collection('fragments').doc(path);
        let chunkIndex = 0;

        for (let i = 0; i < data.length; i += this.CHUNK_SIZE) {
            const chunk = data.slice(i, i + this.CHUNK_SIZE);
            const docRef = colRef.doc(`part_${String(chunkIndex).padStart(3, '0')}`);
            saveBatch.set(docRef, {
                data: chunk,
                index: chunkIndex,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            chunkIndex++;
        }

        saveBatch.set(manifestRef, {
            count: chunkIndex,
            totalItems: data.length,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await saveBatch.commit();
        console.log(`✅ [Fragmented] Saved ${data.length} items in ${chunkIndex} chunks for: ${path}`);
    },

    /** 📥 تحميل وإعادة تجميع البيانات المجزأة */
    async loadFragmented(path) {
        if (!this.db) return null;
        const colRef = this.db.collection('fragments').doc(path).collection('chunks');
        const snapshot = await colRef.orderBy('index').get();
        const allItems = [];
        snapshot.forEach(doc => allItems.push(...doc.data().data));
        return allItems.length > 0 ? allItems : null;
    }
};

// 🔗 Cloud Bridge Functions
window.Cloud = {

    /** ⏱️ مساعد Timeout لمنع التعليق */
    runWithTimeout(promise, ms = 3000) {
        let timeoutId;
        const timeout = new Promise((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error("CLOUD_TIMEOUT")), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
    },

    /** 📤 إرسال حضور جديد */
    pushScan: async (branchId, scanData) => {
        const timestamp = Date.now();
        const fingerprint = `${scanData.id}_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
        const payload = { ...scanData, timestamp, branchId, fingerprint };

        // Firestore يعمل في الخلفية ولا يعلق الواجهة
        window.Cloud.runWithTimeout(
            _db.collection('scans').add({
                ...payload,
                serverTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            }),
            2500
        ).catch(e => console.warn("⚠️ Firestore pushScan background:", e.message));

        return Promise.resolve(); // يعود فوراً للواجهة
    },

    /** 📤 حفظ نسخة احتياطية شاملة (مجزأة) */
    pushAllRecords: async (allData) => {
        try {
            console.log("📤 [Attendance] Starting pushAllRecords...");
            await window.Cloud.runWithTimeout((async () => {
                const keysToFragment = ['students', 'trainers', 'users', 'ledger', 'invoices'];
                for (const key of keysToFragment) {
                    // 🛡️ Check both prefixed and non-prefixed versions
                    const prefixedKey = `edumaster_${key}`;
                    const sourceData = allData[key] || allData[prefixedKey];

                    if (sourceData && Array.isArray(sourceData)) {
                        await window.FirestoreEngine.saveFragmented(key, sourceData);
                    }
                }
                
                // حفظ الإعدادات العامة
                const config = allData.app_config || allData.edumaster_app_config || {};
                await _db.collection('full_sync').doc('settings').set({
                    app_config: config,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            })(), 12000); // Increased timeout to 12s for heavy pushes
            console.log("✅ [Attendance] Full sync to Firestore complete!");
        } catch (e) {
            console.warn("⚠️ pushAllRecords timed out or failed:", e.message);
        }
    },

    /** 📥 تحميل جميع البيانات */
    pullAllRecords: async () => {
        try {
            const fsPromise = (async () => {
                const keys = ['students', 'trainers', 'users', 'ledger', 'invoices'];
                const data = {};
                const tasks = keys.map(async k => {
                    const frag = await window.FirestoreEngine.loadFragmented(k);
                    if (frag) {
                        data[k] = frag;
                        // Also provide prefixed version for compatibility with portal expectations
                        data[`edumaster_${k}`] = frag;
                    }
                });
                await Promise.all(tasks);
                const settings = await _db.collection('full_sync').doc('settings').get();
                if (settings.exists) {
                    const config = settings.data().app_config;
                    data.app_config = config;
                    data.edumaster_app_config = config;
                }
                // Return data if we found at least students or trainers
                return (data.students || data.trainers) ? data : null;
            })();

            const data = await window.Cloud.runWithTimeout(fsPromise, 5000);
            if (data) return data;
        } catch (e) {
            console.warn("⚠️ pullAllRecords failed/timeout:", e.message);
        }
        return null;
    },

    /** 📡 الاستماع للحضور الجديد فور وصوله */
    onScanReceived: (branchId, callback) => {
        const startTime = firebase.firestore.Timestamp.fromDate(new Date(Date.now() - 5000));
        console.log("📡 [Attendance] Firestore Listener started for branch:", branchId);

        return _db.collection('scans')
            .where('serverTimestamp', '>=', startTime)
            .orderBy('serverTimestamp', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                snapshot.docChanges().forEach(change => {
                    if (change.type === "added") {
                        const data = change.doc.data();
                        const fingerprint = data.fingerprint || change.doc.id;

                        if (!window._processedFPs) window._processedFPs = new Set();
                        if (window._processedFPs.has(fingerprint)) return;
                        window._processedFPs.add(fingerprint);
                        if (window._processedFPs.size > 100) {
                            window._processedFPs.delete(Array.from(window._processedFPs)[0]);
                        }

                        const incomingBranch = data.branchId || data.branch || 'miami';
                        if (!branchId || branchId === 'all' || String(incomingBranch) === String(branchId)) {
                            callback({ ...data, id: change.doc.id });
                        }
                    }
                });
            }, err => {
                console.error("❌ Firestore Listener Error:", err);
            });
    },

    startScanBackgroundSync: (branchId, onSyncCallback) => {
        return window.Cloud.onScanReceived(branchId, (scan) => {
            window.Cloud._handleCloudScan(scan, onSyncCallback);
        });
    },

    _handleCloudScan: async (scan, onSyncCallback) => {
        if (!scan || !scan.id) return;
        const ts = (scan.serverTimestamp && scan.serverTimestamp.toMillis)
            ? scan.serverTimestamp.toMillis()
            : (scan.timestamp || Date.now());
        const dateObj = new Date(ts);
        const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;

        if (typeof Storage !== 'undefined') {
            const listKey = scan.type === 'STUDENT' ? 'attendance' : (scan.type === 'TRAINER' ? 'trainer_logs' : 'employee_logs');
            const data = Storage.get(listKey) || {};
            const itemKey = scan.type === 'STUDENT' ? `${dateKey}_global` : dateKey;
            if (!data[itemKey]) data[itemKey] = {};
            if (!data[itemKey][scan.id]) data[itemKey][scan.id] = {};
            const entry = data[itemKey][scan.id];
            const isOutEvent = scan.status === 'OUT' || scan.isOut === true;

            if (scan.type === 'STUDENT') {
                if (isOutEvent) { entry.out = scan.time; }
                else { if (!entry.time) entry.time = scan.time; }
            } else {
                entry.name = scan.name || entry.name;
                entry.type = scan.type;
                if (isOutEvent) { entry.out = scan.time; }
                else { if (!entry.in) entry.in = scan.time; }
            }
            await Storage.save(listKey, data);
        }
        if (onSyncCallback) onSyncCallback(scan);
    }
};
