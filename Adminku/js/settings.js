import { showToast } from './utils.js';

const SETTINGS_KEY = 'adminku_settings';
const DEFAULT_SETTINGS = {
    lockMinutes: 10,
    reminderDays: [90, 30, 7, 1, 0]
};

const normalizeReminderDays = (value) => {
    const source = Array.isArray(value) ? value : String(value || '').split(',');
    const numbers = source
        .map(item => Number.parseInt(String(item).trim(), 10))
        .filter(day => Number.isInteger(day) && day >= 0 && day <= 365);

    return [...new Set(numbers)].sort((a, b) => b - a);
};

export const getSettings = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        const reminderDays = normalizeReminderDays(saved.reminderDays);
        return {
            lockMinutes: Number.isInteger(saved.lockMinutes) ? saved.lockMinutes : DEFAULT_SETTINGS.lockMinutes,
            reminderDays: reminderDays.length ? reminderDays : DEFAULT_SETTINGS.reminderDays
        };
    } catch (error) {
        console.warn('Pengaturan tidak valid, memakai bawaan.', error);
        return DEFAULT_SETTINGS;
    }
};

export const saveSettings = (settings) => {
    const reminderDays = normalizeReminderDays(settings.reminderDays);
    const lockMinutes = Number.parseInt(settings.lockMinutes, 10);

    if (!reminderDays.length) {
        throw new Error('Minimal satu interval pengingat diperlukan.');
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        lockMinutes: [2, 5, 10, 15, 30].includes(lockMinutes) ? lockMinutes : DEFAULT_SETTINGS.lockMinutes,
        reminderDays
    }));
};

export const parseReminderDays = normalizeReminderDays;

export const setupSettings = (onSaved) => {
    const modal = document.getElementById('settings-modal');
    const form = document.getElementById('settings-form');
    const btnOpen = document.getElementById('btn-settings');
    const btnClose = document.getElementById('btn-close-settings');
    const lockInput = document.getElementById('setting-lock-minutes');
    const reminderInput = document.getElementById('setting-reminder-days');

    const hydrate = () => {
        const settings = getSettings();
        if (lockInput) lockInput.value = String(settings.lockMinutes);
        if (reminderInput) reminderInput.value = settings.reminderDays.join(', ');
    };

    btnOpen?.addEventListener('click', () => {
        hydrate();
        modal?.classList.remove('hidden');
    });

    btnClose?.addEventListener('click', () => modal?.classList.add('hidden'));

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        try {
            saveSettings({
                lockMinutes: Number.parseInt(lockInput.value, 10),
                reminderDays: reminderInput.value
            });
            showToast('Pengaturan berhasil disimpan.', 'success');
            modal?.classList.add('hidden');
            onSaved?.();
        } catch (error) {
            showToast(error.message, 'warning');
        }
    });
};
