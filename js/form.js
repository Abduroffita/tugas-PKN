// js/form.js
import { saveItem, getItem, deleteItem } from './storage.js';
import { generateUUID, showToast } from './utils.js';
import { renderDashboard } from './dashboard.js';
import { getSettings, parseReminderDays } from './settings.js';

let currentImageBase64 = null; 

const parseTags = (value) => {
    return [...new Set(String(value || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .slice(0, 8))];
};

// Kompresi Gambar untuk keamanan memori IndexedDB
const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality)); 
            };
        };
    });
};

export const setupForm = () => {
    const modal = document.getElementById('form-modal');
    const btnAdd = document.getElementById('btn-add-real');
    const btnClose = document.getElementById('btn-close-modal');
    const form = document.getElementById('real-form');
    const imageInput = document.getElementById('document-image');
    const imagePreview = document.getElementById('image-preview');
    const btnDelete = document.getElementById('btn-delete-modal');
    
    // Reset Form ke kondisi awal (Mode Tambah Baru)
    const resetForm = () => {
        form.reset();
        document.getElementById('item-id').value = '';
        document.getElementById('modal-title').innerText = 'Registrasi Dokumen';
        currentImageBase64 = null;
        document.getElementById('reminder-days').value = getSettings().reminderDays.join(', ');
        document.getElementById('is-favorite').checked = false;
        document.getElementById('is-archived').checked = false;
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
        btnDelete?.classList.add('hidden'); // Sembunyikan tombol hapus
    };

    imageInput?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            currentImageBase64 = await compressImage(file);
            imagePreview.src = currentImageBase64;
            imagePreview.classList.remove('hidden');
        }
    });

    btnAdd?.addEventListener('click', () => { resetForm(); modal.classList.remove('hidden'); });
    btnClose?.addEventListener('click', () => { modal.classList.add('hidden'); resetForm(); });

    // Submit Formulir
    form?.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const existingId = document.getElementById('item-id').value;
        const isEditMode = existingId !== '';
        const documentTitle = document.getElementById('title').value; 

        const reminderDays = parseReminderDays(document.getElementById('reminder-days').value);
        if (!reminderDays.length) {
            showToast('Isi minimal satu interval pengingat yang valid.', 'warning');
            return;
        }

        const item = {
            id: isEditMode ? existingId : generateUUID(),
            title: documentTitle,
            category: document.getElementById('category').value,
            expiryDate: document.getElementById('expiry').value,
            image: currentImageBase64,
            reminderDays,
            tags: parseTags(document.getElementById('tags').value),
            isFavorite: document.getElementById('is-favorite').checked,
            isArchived: document.getElementById('is-archived').checked,
            createdAt: isEditMode ? undefined : new Date().toISOString() 
        };

        try {
            await saveItem(item); 
            
            if (isEditMode) {
                showToast(`Pembaruan informasi ${documentTitle} telah diamankan.`, 'success');
            } else {
                showToast(`${documentTitle} tersimpan. Kami akan mengingatkan Anda sebelum masa berlakunya habis.`, 'success');
            }
            
            modal.classList.add('hidden');
            resetForm(); 
            await renderDashboard('app-mount'); 
        } catch (error) {
            showToast('Terjadi kesalahan saat mengamankan dokumen.', 'error');
            console.error(error);
        }
    });
};

// Buka Mode Edit & Detail
export const openEditModal = async (id) => {
    const item = await getItem(id);
    if(!item) return;

    document.getElementById('item-id').value = item.id;
    document.getElementById('title').value = item.title;
    document.getElementById('category').value = item.category;
    document.getElementById('expiry').value = item.expiryDate;
    document.getElementById('tags').value = (item.tags || []).join(', ');
    document.getElementById('reminder-days').value = (item.reminderDays || getSettings().reminderDays).join(', ');
    document.getElementById('is-favorite').checked = Boolean(item.isFavorite);
    document.getElementById('is-archived').checked = Boolean(item.isArchived);
    
    const imagePreview = document.getElementById('image-preview');
    if (item.image) {
        currentImageBase64 = item.image;
        imagePreview.src = item.image;
        imagePreview.classList.remove('hidden');
    } else {
        currentImageBase64 = null;
        imagePreview.src = '';
        imagePreview.classList.add('hidden');
    }

    document.getElementById('modal-title').innerText = 'Detail & Perbarui Dokumen';
    
    // Munculkan dan pasang logika Tombol Hapus
    const btnDelete = document.getElementById('btn-delete-modal');
    if(btnDelete) {
        btnDelete.classList.remove('hidden');
        btnDelete.onclick = async () => {
            if(confirm(`Tindakan ini tidak dapat dibatalkan. Yakin ingin memusnahkan ${item.title} dari memori perangkat?`)) {
                await deleteItem(id);
                showToast(`Dokumen ${item.title} telah dihapus permanen.`, 'info');
                document.getElementById('form-modal').classList.add('hidden');
                await renderDashboard('app-mount');
            }
        };
    }

    document.getElementById('form-modal').classList.remove('hidden');
};
