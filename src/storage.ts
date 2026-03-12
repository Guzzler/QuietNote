const DB_NAME = "quietnote-db";
const DB_VERSION = 2; // Bumped for moods store
const SESSIONS_STORE = "sessions";
const MOODS_STORE = "moods";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;

      // Sessions store (existing)
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
      }

      // Moods store (new)
      if (!db.objectStoreNames.contains(MOODS_STORE)) {
        const moodsStore = db.createObjectStore(MOODS_STORE, { keyPath: "id" });
        moodsStore.createIndex("ts", "ts", { unique: false });
        moodsStore.createIndex("emotion", "emotion", { unique: false });
        moodsStore.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}


// Session operations
export async function putSession(sess: import("./types").Session) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readwrite");
    tx.objectStore(SESSIONS_STORE).put(sess);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSession(id: string) {
  const db = await openDB();
  return new Promise<import("./types").Session | undefined>((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readonly");
    const req = tx.objectStore(SESSIONS_STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listSessions() {
  const db = await openDB();
  return new Promise<import("./types").Session[]>((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readonly");
    const req = tx.objectStore(SESSIONS_STORE).getAll();
    req.onsuccess = () => resolve((req.result as any[])?.sort((a, b) => b.updatedAt - a.updatedAt) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSession(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readwrite");
    tx.objectStore(SESSIONS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Mood operations
export async function putMood(mood: import("./types").MoodEntry) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MOODS_STORE, "readwrite");
    tx.objectStore(MOODS_STORE).put(mood);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMood(id: string) {
  const db = await openDB();
  return new Promise<import("./types").MoodEntry | undefined>((resolve, reject) => {
    const tx = db.transaction(MOODS_STORE, "readonly");
    const req = tx.objectStore(MOODS_STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listMoods() {
  const db = await openDB();
  return new Promise<import("./types").MoodEntry[]>((resolve, reject) => {
    const tx = db.transaction(MOODS_STORE, "readonly");
    const req = tx.objectStore(MOODS_STORE).getAll();
    req.onsuccess = () => resolve((req.result as any[])?.sort((a, b) => b.ts - a.ts) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMood(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(MOODS_STORE, "readwrite");
    tx.objectStore(MOODS_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get moods within a date range
export async function getMoodsByDateRange(startTs: number, endTs: number) {
  const db = await openDB();
  return new Promise<import("./types").MoodEntry[]>((resolve, reject) => {
    const tx = db.transaction(MOODS_STORE, "readonly");
    const store = tx.objectStore(MOODS_STORE);
    const index = store.index("ts");
    const range = IDBKeyRange.bound(startTs, endTs);
    const req = index.getAll(range);
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

// Get storage stats for privacy dashboard
export async function getStorageStats() {
  const db = await openDB();
  return new Promise<{ sessions: number; moods: number; totalBytes: number }>((resolve, reject) => {
    const tx = db.transaction([SESSIONS_STORE, MOODS_STORE], "readonly");

    let sessionsCount = 0;
    let moodsCount = 0;

    const sessReq = tx.objectStore(SESSIONS_STORE).count();
    sessReq.onsuccess = () => {
      sessionsCount = sessReq.result;
    };

    const moodsReq = tx.objectStore(MOODS_STORE).count();
    moodsReq.onsuccess = () => {
      moodsCount = moodsReq.result;
    };

    tx.oncomplete = async () => {
      // Estimate storage usage
      let totalBytes = 0;
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        totalBytes = estimate.usage || 0;
      }
      resolve({ sessions: sessionsCount, moods: moodsCount, totalBytes });
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Clear all data
export async function clearAllData() {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SESSIONS_STORE, MOODS_STORE], "readwrite");
    tx.objectStore(SESSIONS_STORE).clear();
    tx.objectStore(MOODS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}