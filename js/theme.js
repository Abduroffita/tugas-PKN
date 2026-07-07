const STORAGE_KEY = 'adminku-theme';
const THEMES = {
    light: {
        icon: 'moon',
        label: 'Aktifkan mode gelap',
        themeColor: '#1e3a8a',
        pressed: 'false'
    },
    dark: {
        icon: 'sun',
        label: 'Aktifkan mode terang',
        themeColor: '#020617',
        pressed: 'true'
    }
};

const getPreferredTheme = () => {
    let savedTheme = null;
    try {
        savedTheme = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        savedTheme = null;
    }

    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme) => {
    const selectedTheme = THEMES[theme] ? theme : 'light';
    const config = THEMES[selectedTheme];
    const themeButton = document.getElementById('btn-theme');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    document.documentElement.dataset.theme = selectedTheme;
    try {
        localStorage.setItem(STORAGE_KEY, selectedTheme);
    } catch (error) {
        // Tema tetap diterapkan di sesi berjalan meski penyimpanan browser dibatasi.
    }

    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', config.themeColor);
    }

    if (themeButton) {
        themeButton.setAttribute('aria-label', config.label);
        themeButton.setAttribute('aria-pressed', config.pressed);
        themeButton.setAttribute('title', config.label);
        themeButton.innerHTML = `<i data-lucide="${config.icon}"></i>`;
        lucide.createIcons();
    }
};

export const setupThemeToggle = () => {
    const themeButton = document.getElementById('btn-theme');
    applyTheme(getPreferredTheme());

    themeButton?.addEventListener('click', () => {
        const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
};
