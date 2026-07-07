// js/storage.js
import { encryptData, decryptData } from './crypto.js';
import { sessionAESKey } from './auth.js'; 

const DB_NAME = 'AdminKuDB';
const STORE_NAME = 'items';
const DB_VERSION = 2; // Skema V2 (Dengan Index & Enkripsi)

const openDB = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    
    req.onupgradeneeded = (e) => { 
        const db = e.target.result;
        const oldVersion = e.oldVersion;

        // Migrasi Skema yang Benar tanpa menghapus data yang sudah ada
        if (oldVersion < 1) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('expiryDate', 'expiryDate', { unique: false });
            store.createIndex('category', 'category', { unique: false });
        } else if (oldVersion === 1) {
            const transaction = e.target.transaction;
            const store = transaction.objectStore(STORE_NAME);
            
            if (!store.indexNames.contains('expiryDate')) {
                store.createIndex('expiryDate', 'expiryDate', { unique: false });
            }
            if (!store.indexNames.contains('category')) {
                store.createIndex('category', 'category', { unique: false });
            }
        }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
});

export const saveItem = async (item) => {
    if (!sessionAESKey) throw new Error("Akses ditolak: Kunci enkripsi tidak tersedia.");

    const existingItem = item.id ? await getItem(item.id) : null;
    const mergedItem = { ...existingItem, ...item };
    
    // Enkripsi payload data sensitif sebelum disimpan ke IndexedDB
    const sensitivePayload = {
        title: mergedItem.title,
        image: mergedItem.image || null,
        reminderDays: Array.isArray(mergedItem.reminderDays) ? mergedItem.reminderDays : [90, 30, 7, 1, 0],
        tags: Array.isArray(mergedItem.tags) ? mergedItem.tags : [],
        isFavorite: Boolean(mergedItem.isFavorite),
        isArchived: Boolean(mergedItem.isArchived)
    };
    const encryptedPayload = await encryptData(sensitivePayload, sessionAESKey);
    
    // Metadata non-sensitif dibiarkan plaintext sebagai landasan Index pencarian lokal
    const secureItem = {
        id: mergedItem.id,
        category: mergedItem.category,
        expiryDate: mergedItem.expiryDate,
        createdAt: mergedItem.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _securePayload: encryptedPayload
    };

    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.put(secureItem);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

export const getAllItems = async () => {
    if (!sessionAESKey) return [];
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.getAll();
        
        req.onsuccess = async () => {
            try {
                // Proses dekripsi massal secara asinkronus
                const decryptedItems = await Promise.all(req.result.map(async (row) => {
                    if (row._securePayload) {
                        const decrypted = await decryptData(row._securePayload, sessionAESKey);
                        return { ...row, ...decrypted };
                    }
                    return row; 
                }));
                resolve(decryptedItems);
            } catch (err) {
                // Integrity check
                console.error("Integritas data terkompromi atau kunci salah.", err);
                alert("Pemberitahuan Sistem: Integritas data terganggu atau PIN keamanan yang dimasukkan tidak sesuai.");
                resolve([]); 
            }
        };
        req.onerror = () => reject(req.error);
    });
};

export const getItem = async (id) => {
    if (!sessionAESKey) return null;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.get(id);
        
        req.onsuccess = async () => {
            const row = req.result;
            if (row && row._securePayload) {
                try {
                    const decrypted = await decryptData(row._securePayload, sessionAESKey);
                    resolve({ ...row, ...decrypted });
                } catch (err) {
                    console.error("Gagal mendekripsi item spesifik.", err);
                    resolve(null);
                }
            } else {
                resolve(row);
            }
        };
        req.onerror = () => reject(req.error);
    });
};

export const deleteItem = async (id) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error);
    });
};
