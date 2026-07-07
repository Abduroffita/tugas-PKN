// js/sync.js
import { getAllItems, saveItem } from './storage.js';
import { renderDashboard } from './dashboard.js';
import { showToast } from './utils.js';
import { parseReminderDays } from './settings.js';

const normalizeBackupItems = (payload) => {
    const rows = Array.isArray(payload) ? payload : payload?.items;
    if (!Array.isArray(rows)) throw new Error('Format berkas cadangan tidak dikenali.');

    return rows.map((item, index) => {
        if (!item || typeof item !== 'object') throw new Error(`Item ke-${index + 1} tidak valid.`);
        if (!item.id || !item.title || !item.category || !item.expiryDate) {
            throw new Error(`Item ke-${index + 1} tidak memiliki kolom wajib.`);
        }
        if (!dayjs(item.expiryDate).isValid()) throw new Error(`Tanggal item ke-${index + 1} tidak valid.`);

        return {
            id: String(item.id),
            title: String(item.title).slice(0, 160),
            category: String(item.category).slice(0, 80),
            expiryDate: item.expiryDate,
            image: typeof item.image === 'string' ? item.image : null,
            reminderDays: parseReminderDays(item.reminderDays || [90, 30, 7, 1, 0]),
            tags: Array.isArray(item.tags) ? item.tags.map(tag => String(tag).trim()).filter(Boolean).slice(0, 8) : [],
            isFavorite: Boolean(item.isFavorite),
            isArchived: Boolean(item.isArchived),
            createdAt: item.createdAt || new Date().toISOString()
        };
    });
};

export const setupSync = () => {
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');

    // FITUR UNDUH CADANGAN
    btnExport?.addEventListener('click', async () => {
        try {
            const items = await getAllItems();
            if (items.length === 0) return showToast('Belum ada dokumen untuk dicadangkan.', 'warning');
            
            const dataStr = JSON.stringify({
                app: 'AdminKu',
                version: 2,
                exportedAt: new Date().toISOString(),
                items
            }, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `AdminKu_Cadangan_${dayjs().format('YYYYMMDD')}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showToast('Berkas cadangan berhasil diunduh ke perangkat Anda.', 'success');
        } catch (error) {
            showToast('Sistem gagal membuat berkas cadangan.', 'error');
            console.error(error);
        }
    });

    // FITUR PULIHKAN CADANGAN
    btnImport?.addEventListener('click', () => importFile.click());
    
    importFile?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                const validatedItems = normalizeBackupItems(importedData);

                let count = 0;
                for (const item of validatedItems) {
                    await saveItem(item); // Enkripsi akan berjalan otomatis
                    count++;
                }
                
                showToast(`Pemulihan berhasil. ${count} dokumen telah diamankan kembali ke brankas.`, 'success');
                await renderDashboard('app-mount');
            } catch (error) {
                showToast('Gagal memulihkan data. Pastikan berkas yang Anda pilih valid.', 'error');
                console.error(error);
            }
            importFile.value = ''; 
        };
        reader.readAsText(file);
    });
};
