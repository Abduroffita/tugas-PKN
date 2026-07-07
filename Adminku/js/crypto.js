// js/crypto.js
const ITERATIONS = 100000;

export const generateSalt = () => crypto.getRandomValues(new Uint8Array(16));

// Hash PIN dengan Salt untuk disimpan di LocalStorage
export const hashPIN = async (pin, salt = generateSalt()) => {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
    const hashBuffer = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
        keyMaterial, 256
    );
    return { 
        salt: btoa(String.fromCharCode(...salt)), 
        hash: btoa(String.fromCharCode(...new Uint8Array(hashBuffer))) 
    };
};

// Menghasilkan Kunci AES-GCM dari PIN pengguna
export const deriveAESKey = async (pin, saltBase64) => {
    const enc = new TextEncoder();
    const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
};

// Enkripsi Payload Data
export const encryptData = async (data, key) => {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization Vector
    const enc = new TextEncoder();
    const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)));
    return {
        iv: btoa(String.fromCharCode(...iv)),
        cipher: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
    };
};

// Dekripsi Payload Data
export const decryptData = async (encryptedObj, key) => {
    const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0));
    const cipher = Uint8Array.from(atob(encryptedObj.cipher), c => c.charCodeAt(0));
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    const dec = new TextDecoder();
    return JSON.parse(dec.decode(decryptedBuffer));
};