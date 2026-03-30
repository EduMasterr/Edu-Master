/**
 * Firebase Config - Super Fast Edition (v11.0)
 * العودة للنظام البسيط السريع - RTDB Only
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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.Cloud = {
    // إرسال البيانات (في أقل من ثانية)
    pushScan: async (branchId, scanData) => {
        const timestamp = Date.now();
        return firebase.database().ref(`edumaster/all_scans`).push().set({ 
            ...scanData, branchId, timestamp, serverTimestamp: firebase.database.ServerValue.TIMESTAMP 
        });
    },

    // المزامنة الشاملة (النظام القديم البسيط)
    pushAllRecords: async (allData) => {
        return firebase.database().ref('edumaster/full_sync').set(allData);
    },

    pullAllRecords: async () => {
        const snap = await firebase.database().ref('edumaster/full_sync').once('value');
        return snap.val();
    },

    // تحديث السحابة يدوياً (Pull Manual)
    pullTodayScans: async () => {
        try {
            console.log("📥 Cloud: Manual Pulling last 100 scans...");
            const snap = await firebase.database().ref('edumaster/all_scans').limitToLast(100).once('value');
            if (snap.val()) {
                const results = Object.values(snap.val());
                console.log(`✅ Cloud: Recovered ${results.length} scans from cloud history.`);
                return results;
            }
        } catch (e) {
            console.error("❌ Cloud Pull Error:", e);
        }
        return [];
    },

    // مستقبل الإشارات (السرعة القصوى للكمبيوتر)
    onScanReceived: (branchId, callback) => {
        const startTime = Date.now() - 60000; // السماح بآخر دقيقة
        if (window.firebase && firebase.database) {
            console.log("📡 Cloud: Listener Started for branch:", branchId);
            return firebase.database().ref('edumaster/all_scans').limitToLast(10).on('child_added', snapshot => {
                const data = snapshot.val();
                if (!data) return;

                const ts = data.serverTimestamp || data.timestamp || 0;
                if (ts < startTime) return;

                // 🛡️ v11.3: Smart Branch Check
                const incomingBranch = data.branchId || data.branch || 'miami';
                if (!branchId || branchId === 'all' || String(incomingBranch) === String(branchId)) {
                    callback(data);
                }
            });
        }
    },

    startScanBackgroundSync: (branchId, onSyncCallback) => {
        return window.Cloud.onScanReceived(branchId, (scan) => {
            window.Cloud._handleCloudScan(scan, onSyncCallback);
        });
    },

    _handleCloudScan: async (scan, onSyncCallback) => {
        if (!scan || !scan.id) return;
        const ts = scan.timestamp || Date.now();
        const dateObj = new Date(ts);
        const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth()+1).padStart(2,'0')}-${String(dateObj.getDate()).padStart(2,'0')}`;
        
        const listKey = scan.type === 'STUDENT' ? 'attendance' : (scan.type === 'TRAINER' ? 'trainer_logs' : 'employee_logs');
        if (typeof Storage !== 'undefined') {
            const data = Storage.get(listKey) || {};
            const itemKey = scan.type === 'STUDENT' ? `${dateKey}_global` : dateKey;
            
            if (!data[itemKey]) data[itemKey] = {};
            if (!data[itemKey][scan.id]) data[itemKey][scan.id] = {};
            
            const entry = data[itemKey][scan.id];
            // 🛡️ v11.4: Accurate State Matching (Prevent Auto-Departure Bug)
            const isOutEvent = scan.status === 'OUT' || scan.isOut === true;

            if (scan.type === 'STUDENT') {
                if (isOutEvent) {
                    entry.out = scan.time;
                } else {
                    if (!entry.time) entry.time = scan.time;
                    // If it's an IN scan but we already have time, don't overwrite OUT
                }
            } else {
                entry.name = scan.name || entry.name;
                entry.type = scan.type;
                if (isOutEvent) {
                    entry.out = scan.time;
                } else {
                    if (!entry.in) entry.in = scan.time;
                }
            }
            await Storage.save(listKey, data);
        }
        if (onSyncCallback) onSyncCallback(scan);
    }
};
