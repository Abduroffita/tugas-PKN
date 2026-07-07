// js/utils.js

// Pembuat ID Unik
export const generateUUID = () => {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
};

// Format Tanggal ala Indonesia (Contoh: 17 Agustus 2026)
export const formatDate = (dateString) => {
    return dayjs(dateString).format('DD MMMM YYYY');
};

export const escapeHTML = (value) => {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
};

// Kalkulator Status Dokumen Berdasarkan Hari
export const calculateStatus = (expiryDate) => {
    const today = dayjs().startOf('day');
    const target = dayjs(expiryDate).startOf('day');
    const diffDays = target.diff(today, 'day');

    if (diffDays < 0) return { status: 'Kedaluwarsa', colorVar: 'var(--danger-color)' };
    if (diffDays <= 30) return { status: 'Mendesak', colorVar: 'var(--danger-color)' };
    if (diffDays <= 90) return { status: 'Perhatian', colorVar: 'var(--warning-color)' };
    return { status: 'Aman', colorVar: 'var(--success-color)' };
};

// Umpan Balik Visual (Toast Notification) berstandar Aksesibilitas
export const showToast = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    // Styling bawaan JS agar Anda tidak pusing mencari letak CSS-nya
    toast.style.cssText = `
        display: flex; align-items: center; gap: 0.75rem;
        background: var(--surface-main); color: var(--text-strong);
        padding: 1rem 1.25rem; border-radius: 8px; font-weight: 500;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
        border-left: 4px solid ${type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--warning-color)'};
        margin-top: 0.5rem; font-size: 0.95rem; animation: slideIn 0.3s ease forwards;
    `;
    
    let icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-octagon' : 'info';
    let iconColor = type === 'success' ? 'var(--success-color)' : type === 'error' ? 'var(--danger-color)' : 'var(--warning-color)';

    toast.innerHTML = `
        <i data-lucide="${icon}" style="color: ${iconColor};" aria-hidden="true"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons({ root: toast });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
};
