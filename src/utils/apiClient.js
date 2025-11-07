import axios from "axios";
import { openDB } from "idb";

/* ------------------- API CONFIG ------------------- */
export const API_KEY = "HUPkjAqgRSgJa4up6CTUxu";
export const BASE_URL = "https://api.fincrux.org/api";

/* ------------------- INDEXED DB SETUP ------------------- */
const DB_NAME = "FincruxDB";
const STORE_NAME = "cache";

const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
};

const saveToDB = async (key, data) => {
  const db = await initDB();
  await db.put(STORE_NAME, { data, time: Date.now() }, key);
};

const getFromDB = async (key, maxAge) => {
  const db = await initDB();
  const entry = await db.get(STORE_NAME, key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.time > maxAge;
  return isExpired ? null : entry.data;
};

/* ------------------- RATE LIMIT SYSTEM ------------------- */
const inMemoryState = {
  companies: { count: 0, resetAt: 0 },
  details: { count: 0, resetAt: 0 },
  history: { count: 0, resetAt: 0 },
};

/* ------------------- MAIN FETCH FUNCTION ------------------- */
export const rateLimitedFetch = async (url, cacheKey = null, type = "companies") => {
  const now = Date.now();
  const limit = 2; // max 2 calls/min
  const windowMs = 60000; // 1 minute

  const state = inMemoryState[type];

  // Set cache lifetimes per data type
  const cacheDurations = {
    companies: 30 * 24 * 60 * 60 * 1000, // 30 days
    details: 35 * 24 * 60 * 60 * 1000, // 35 days
    history: 90 * 24 * 60 * 60 * 1000, // 90 days
  };
  const maxAge = cacheDurations[type] || 30 * 24 * 60 * 60 * 1000;

  // Reset counter
  if (now > state.resetAt) {
    state.count = 0;
    state.resetAt = now + windowMs;
  }

  // Load persisted rate state
  const storedCount = parseInt(localStorage.getItem(`${type}_count`) || "0", 10);
  const storedReset = parseInt(localStorage.getItem(`${type}_resetAt`) || "0", 10);
  if (now > storedReset) {
    localStorage.setItem(`${type}_count`, "0");
    localStorage.setItem(`${type}_resetAt`, (now + windowMs).toString());
  }

  const totalCount = Math.max(state.count, storedCount);

  // ✅ Rate limit check
  if (totalCount >= limit) {
    console.log(`⚠️ ${type.toUpperCase()} rate limit hit. Using cached data.`);
    const cached = await getFromDB(cacheKey, maxAge);
    if (cached) return cached;

    const fallback = localStorage.getItem(cacheKey);
    if (fallback) return JSON.parse(fallback);

    return { error: true, message: `${type} rate limit reached.` };
  }

  try {
    // Increment counter
    state.count++;
    localStorage.setItem(`${type}_count`, state.count.toString());

    // Try cache before calling API
    const cachedData = await getFromDB(cacheKey, maxAge);
    if (cachedData) {
      console.log(`⚡ Using fresh IndexedDB cache for ${cacheKey}`);
      return cachedData;
    }

    // 🛰️ Fetch new data
    const response = await axios.get(url);
    const data = response.data;

    // Save both in IndexedDB + LocalStorage (backup)
    if (cacheKey) {
      await saveToDB(cacheKey, data);
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(`${cacheKey}_time`, now.toString());
    }

    return data;
  } catch (err) {
    console.warn("API error:", err.message);

    // Try IndexedDB fallback
    const cached = await getFromDB(cacheKey, Infinity);
    if (cached) {
      console.log("⚡ Using IndexedDB cache after API error.");
      return cached;
    }

    // Try LocalStorage fallback
    const fallback = localStorage.getItem(cacheKey);
    if (fallback) {
      console.log("⚡ Using LocalStorage cache after API error.");
      return JSON.parse(fallback);
    }

    return { error: true, message: err.message };
  }
};

/* ------------------- CLEANUP UTILITY ------------------- */
export const clearExpiredCache = async (maxAge = 120 * 24 * 60 * 60 * 1000) => {
  // delete anything older than 120 days (4 months)
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, "readwrite");

  for await (const cursor of tx.store) {
    const { time } = cursor.value;
    if (Date.now() - time > maxAge) {
      await cursor.delete();
    }
  }
  console.log("🧹 Cleared expired cache entries.");
};
