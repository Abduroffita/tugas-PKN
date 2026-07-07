// js/app.js
import { renderDashboard, setupDetailModal } from './dashboard.js';
import { requestNotificationPermission, checkReminders } from './reminder.js';
import { getAllItems } from './storage.js';
import { setupSync } from './sync.js';
import { setupForm } from './form.js'; 
import { setupFAQ } from './faq.js'; 
import { setupAuth } from './auth.js'; 
import { setupThemeToggle } from './theme.js';
import { setupSettings } from './settings.js';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inisialisasi Pustaka Eksternal
    dayjs.locale('id');
    lucide.createIcons();
    setupThemeToggle();

    // 2. Pasang Pendengar Aksi pada Form Pencarian
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    const filterView = document.getElementById('filter-view');

    searchInput?.addEventListener('input', () => renderDashboard('app-mount'));
    filterCategory?.addEventListener('change', () => renderDashboard('app-mount'));
    filterView?.addEventListener('change', () => renderDashboard('app-mount'));

    // 3. Fungsi Inti: Hanya berjalan SETELAH PIN benar / Kunci Dibuka
    const unlockAndRunApp = async () => {
        setupSync(); // Menggantikan setupExport lama
        setupForm(); 
        setupFAQ(); 
        setupDetailModal();
        setupSettings(() => renderDashboard('app-mount'));
        
        // Render antarmuka dengan data yang telah didekripsi
        await renderDashboard('app-mount');

        // Minta izin notifikasi & periksa pengingat di latar belakang
        await requestNotificationPermission();
        const items = await getAllItems();
        checkReminders(items);
    };

    // 4. Jalankan Sistem Proteksi (App Lock)
    // Aplikasi akan tertahan di layar PIN sampai pengguna berhasil login
    setupAuth(unlockAndRunApp);
});
