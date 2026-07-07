// js/auth.js
import { showToast } from './utils.js';
import { hashPIN, deriveAESKey } from './crypto.js';
import { getSettings } from './settings.js';

// Kunci Enkripsi Sesi Aktif (Hanya hidup di RAM selama aplikasi terbuka)
export let sessionAESKey = null; 
let idleTimer;

const readSavedAuthData = () => {
    try {
        const rawAuthData = localStorage.getItem('adminku_auth');
        if (!rawAuthData) return null;

        const parsedAuthData = JSON.parse(rawAuthData);
        if (!parsedAuthData?.salt || !parsedAuthData?.hash) {
            throw new Error('Struktur data autentikasi tidak valid.');
        }

        return parsedAuthData;
    } catch (error) {
        console.warn('Data autentikasi lama rusak dan akan direset.', error);
        localStorage.removeItem('adminku_auth');
        localStorage.removeItem('pin_attempts');
        localStorage.removeItem('pin_lockout');
        return null;
    }
};

const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    if (sessionAESKey) {
        const idleTimeoutMs = getSettings().lockMinutes * 60 * 1000;
        idleTimer = setTimeout(() => {
            sessionAESKey = null; // Hancurkan kunci dari memori secara permanen
            document.getElementById('auth-screen').classList.remove('hidden');
            document.getElementById('auth-pin').value = '';
            
            // UX Writing: Bahasa sistem yang resmi
            alert("Pemberitahuan Sistem: Sesi Anda telah berakhir otomatis karena tidak ada aktivitas. Silakan masukkan PIN kembali demi keamanan data.");
            window.location.reload(); 
        }, IDLE_TIMEOUT_MS);
    }
};

export const setupAuth = async (onUnlock) => {
    const authScreen = document.getElementById('auth-screen');
    const authForm = document.getElementById('auth-form');
    const pinInput = document.getElementById('auth-pin');
    const authTitle = document.getElementById('auth-title');
    const authDesc = document.getElementById('auth-desc');
    const btnSubmit = document.getElementById('btn-auth-submit');
    
    const savedAuthData = readSavedAuthData();
    const isSetupMode = !savedAuthData;
    let isSubmitting = false;

    // UX Writing: Penyesuaian identitas antarmuka layar kunci
    if (isSetupMode) {
        if (authTitle) authTitle.innerText = 'Registrasi Keamanan';
        if (authDesc) authDesc.innerText = 'Buat PIN baru (minimal 4 angka) untuk mengenkripsi data Anda.';
        if (btnSubmit) btnSubmit.innerText = 'Aktifkan Keamanan';
    } else {
        if (authTitle) authTitle.innerText = 'Autentikasi Diperlukan';
        if (authDesc) authDesc.innerText = 'Silakan masukkan PIN Anda untuk mengakses dokumen.';
        if (btnSubmit) btnSubmit.innerText = 'Buka Akses';
    }

    // Melacak interaksi fisik pengguna untuk manajemen Auto-Lock
    ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => 
        document.addEventListener(evt, resetIdleTimer, { passive: true })
    );

    authForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        const inputPin = pinInput.value.trim();
        isSubmitting = true;
        if (btnSubmit) btnSubmit.disabled = true;

        try {
            // Proteksi Sistem Anti Brute-Force
            let attempts = parseInt(localStorage.getItem('pin_attempts') || '0');
            let lockoutUntil = parseInt(localStorage.getItem('pin_lockout') || '0');

            if (Date.now() < lockoutUntil) {
                const waitTime = Math.ceil((lockoutUntil - Date.now()) / 60000);
                showToast(`Akses diblokir sementara. Silakan coba lagi dalam ${waitTime} menit.`, 'error');
                return;
            }

            if (isSetupMode) {
                if (inputPin.length < 4) {
                    showToast('PIN keamanan harus terdiri dari minimal 4 angka.', 'warning');
                    return;
                }
                
                try {
                    const authData = await hashPIN(inputPin);
                    localStorage.setItem('adminku_auth', JSON.stringify(authData));
                    sessionAESKey = await deriveAESKey(inputPin, authData.salt);
                    
                    localStorage.removeItem('pin_attempts');
                    localStorage.removeItem('pin_lockout');

                    await onUnlock();
                    showToast('Sistem keamanan aktif. Kunci enkripsi berhasil dibuat.', 'success');
                    authScreen.classList.add('hidden');
                    resetIdleTimer();
                } catch (error) {
                    showToast('Sistem gagal menginisialisasi modul keamanan.', 'error');
                    console.error(error);
                }
            } else {
                try {
                    // Mengambil salt lama untuk komparasi hash PIN
                    const saltBytes = Uint8Array.from(atob(savedAuthData.salt), c => c.charCodeAt(0));
                    const checkHash = await hashPIN(inputPin, saltBytes);
                    
                    if (checkHash.hash === savedAuthData.hash) {
                        // Autentikasi Berhasil
                        localStorage.removeItem('pin_attempts');
                        localStorage.removeItem('pin_lockout');
                        sessionAESKey = await deriveAESKey(inputPin, savedAuthData.salt);
                        
                        await onUnlock();
                        authScreen.classList.add('hidden');
                        resetIdleTimer();
                    } else {
                        // Autentikasi Gagal -> Jalankan Counter Penalti
                        attempts++;
                        if (attempts >= 5) {
                            const nextFiveMinutes = Date.now() + (5 * 60 * 1000);
                            localStorage.setItem('pin_lockout', nextFiveMinutes.toString());
                            localStorage.setItem('pin_attempts', '0');
                            showToast('Akses diblokir akibat terlalu banyak percobaan. Terkunci 5 menit.', 'error');
                        } else {
                            localStorage.setItem('pin_attempts', attempts.toString());
                            showToast(`PIN tidak sesuai. Sisa percobaan akses: ${5 - attempts}`, 'warning');
                        }
                        pinInput.value = '';
                    }
                } catch (error) {
                    showToast('Terjadi gangguan pada sistem verifikasi.', 'error');
                    console.error(error);
                }
            }
        } finally {
            isSubmitting = false;
            if (btnSubmit) btnSubmit.disabled = false;
        }
    });
};
