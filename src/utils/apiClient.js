// src/utils/apiClient.js
import axios from "axios";
import { openDB } from "idb";

/* ------------------- CONFIG ------------------- */
export const API_KEY = "HUPkjAqgRSgJa4up6CTUxu"; // keep safe
export const BASE_URL = "https://api.fincrux.org/api";
const DB_NAME = "FincruxDB";
const STORE_NAME = "cache";
const DEBUG = false;

/* ------------------- INIT INDEXEDDB ------------------- */
const initDB = async () => {
  try {
    return await openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  } catch (err) {
    if (DEBUG) console.warn("⚠️ IndexedDB unavailable, fallback to localStorage", err);
    return null;
  }
};

/* ------------------- CACHE HELPERS ------------------- */
const saveToCache = async (key, data) => {
  const db = await initDB();
  const payload = { data, time: Date.now() };

  if (db) {
    try {
      await db.put(STORE_NAME, payload, key);
      if (DEBUG) console.log(`💾 Saved to IndexedDB: ${key}`);
      return;
    } catch {
      if (DEBUG) console.warn("⚠️ Failed saving to IndexedDB, fallback to localStorage");
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(payload));
    if (DEBUG) console.log(`💾 Saved to localStorage: ${key}`);
  } catch (err) {
    if (DEBUG) console.error("❌ Failed saving to localStorage", err);
  }
};

const getFromCache = async (key, maxAge = 7 * 24 * 60 * 60 * 1000) => {
  const now = Date.now();
  const db = await initDB();

  // IndexedDB
  if (db) {
    try {
      const entry = await db.get(STORE_NAME, key);
      if (entry && now - entry.time <= maxAge) {
        if (DEBUG) console.log(`⚡ Retrieved from IndexedDB: ${key}`);
        return entry.data;
      }
    } catch {
      if (DEBUG) console.warn("⚠️ Failed reading from IndexedDB, fallback to localStorage");
    }
  }

  // localStorage fallback
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const entry = JSON.parse(item);
    if (now - entry.time <= maxAge) {
      if (DEBUG) console.log(`⚡ Retrieved from localStorage: ${key}`);
      return entry.data;
    }
  } catch {
    if (DEBUG) console.error("❌ Failed reading from localStorage");
  }

  return null;
};

/* ------------------- RATE LIMIT ------------------- */
const inMemoryState = {
  companies: { count: 0, resetAt: 0 },
  details: { count: 0, resetAt: 0 },
  history: { count: 0, resetAt: 0 },
};
const RATE_LIMIT = 2; // calls per minute
const WINDOW_MS = 60000;

let retryTimer = null;
export const startRetryTimer = (seconds = 60) => {
  if (retryTimer) return;
  let remaining = seconds;
  retryTimer = setInterval(() => {
    remaining -= 1;
    localStorage.setItem("retry_remaining", remaining);
    if (remaining <= 0) {
      clearInterval(retryTimer);
      localStorage.removeItem("retry_remaining");
      retryTimer = null;
    }
  }, 1000);
};

/* ------------------- FETCH FROM API ------------------- */
const fetchFromAPI = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (err) {
    if (err.response?.status === 429) {
      const retryAfter = parseInt(err.response?.headers["retry-after"]) || 60;
      startRetryTimer(retryAfter);
      return { error: true, code: 429, message: "Too many requests. Try again later." };
    }
    throw err;
  }
};

/* ------------------- MAIN RATE-LIMITED FETCH ------------------- */
export const rateLimitedFetch = async (url, cacheKey = null, type = "companies") => {
  const now = Date.now();
  const state = inMemoryState[type];

  const cacheDurations = {
    companies: 7 * 24 * 60 * 60 * 1000, // 7 days
    details: 7 * 24 * 60 * 60 * 1000,
    history: 7 * 24 * 60 * 60 * 1000,
  };
  const maxAge = cacheDurations[type] || 7 * 24 * 60 * 60 * 1000;

  // reset window
  if (now > state.resetAt) {
    state.count = 0;
    state.resetAt = now + WINDOW_MS;
  }

  const storedCount = parseInt(localStorage.getItem(`${type}_count`) || "0", 10);
  const storedReset = parseInt(localStorage.getItem(`${type}_resetAt`) || "0", 10);
  if (now > storedReset) {
    localStorage.setItem(`${type}_count`, "0");
    localStorage.setItem(`${type}_resetAt`, (now + WINDOW_MS).toString());
  }

  const totalCount = Math.max(state.count, storedCount);
  if (totalCount >= RATE_LIMIT) {
    if (DEBUG) console.log(`⚠️ ${type.toUpperCase()} rate limit reached`);
    const cached = await getFromCache(cacheKey, maxAge);
    if (cached) return cached;
    return { error: true, code: 429, message: `${type} rate limit reached.` };
  }

  // use cache if valid
  const cachedData = await getFromCache(cacheKey, maxAge);
  if (cachedData) return cachedData;

  try {
    state.count++;
    localStorage.setItem(`${type}_count`, state.count.toString());

    const response = await fetchFromAPI(url);
    if (response?.error) throw new Error(response.message);

    await saveToCache(cacheKey, response);
    return response;
  } catch (err) {
    const cached = await getFromCache(cacheKey, Infinity);
    if (cached) return cached;

    const fallback = localStorage.getItem(cacheKey);
    if (fallback) return JSON.parse(fallback);

    return { error: true, message: err.message };
  }
};

/* ------------------- COMPANIES LIST ------------------- */
export const fetchAllCompanies = async () => {
  const cacheKey = "all_companies";
  const cached = await getFromCache(cacheKey, 7 * 24 * 60 * 60 * 1000); // 7 days
  if (cached) return cached;

  const url = `${BASE_URL}/companies?api_key=${API_KEY}`;
  return rateLimitedFetch(url, cacheKey, "companies");
};

/* ------------------- HISTORICAL DATA ------------------- */
export const fetchHistoricalData = async (symbol) => {
  const url = `${BASE_URL}/historicals/${symbol}?api_key=${API_KEY}`;
  const cacheKey = `historical_${symbol}`;
  return rateLimitedFetch(url, cacheKey, "history");
};

/* ------------------- CACHE CLEANUP ------------------- */
export const clearExpiredCache = async (maxAge = 7 * 24 * 60 * 60 * 1000) => {
  const db = await initDB();
  if (db) {
    const tx = db.transaction(STORE_NAME, "readwrite");
    for await (const cursor of tx.store) {
      const { time } = cursor.value;
      if (Date.now() - time > maxAge) await cursor.delete();
    }
  }

  Object.keys(localStorage).forEach((key) => {
    try {
      const itemTime = parseInt(localStorage.getItem(`${key}_time`) || "0", 10);
      if (Date.now() - itemTime > maxAge) localStorage.removeItem(key);
    } catch {}
  });

  if (DEBUG) console.log("🧹 Cleared expired cache entries");
};

export const clearAllCache = async () => {
  const db = await initDB();
  if (db) await db.clear(STORE_NAME);

  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith("historical_") || k.startsWith("companies") || k.startsWith("details"))
      localStorage.removeItem(k);
  });

  if (DEBUG) console.log("🧨 Cleared all caches manually");
};
