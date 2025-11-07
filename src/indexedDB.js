import { openDB } from "idb";

const DB_NAME = "FincruxDB";
const STORE_NAME = "cache";

// Initialize IndexedDB
export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

// Save data
export const saveToDB = async (key, data) => {
  const db = await initDB();
  await db.put(STORE_NAME, { data, time: Date.now() }, key);
};

// Get data (with expiry check)
export const getFromDB = async (key, maxAge = 90 * 24 * 60 * 60 * 1000) => {
  const db = await initDB();
  const entry = await db.get(STORE_NAME, key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.time > maxAge;
  return isExpired ? null : entry.data;
};

// Delete data
export const deleteFromDB = async (key) => {
  const db = await initDB();
  await db.delete(STORE_NAME, key);
};

// Clear old/expired cache
export const clearExpiredCache = async (maxAge = 90 * 24 * 60 * 60 * 1000) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  for await (const cursor of tx.store) {
    const { time } = cursor.value;
    if (Date.now() - time > maxAge) {
      await cursor.delete();
    }
  }
};
