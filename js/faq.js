// js/faq.js
export const setupFAQ = () => {
    const faqModal = document.getElementById('faq-modal');
    const btnInfo = document.getElementById('btn-info'); 
    const btnCloseFaq = document.getElementById('btn-close-faq');

    btnInfo?.addEventListener('click', () => faqModal.classList.remove('hidden'));
    btnCloseFaq?.addEventListener('click', () => faqModal.classList.add('hidden'));

    // Tutup jika mengeklik area gelap
    faqModal?.addEventListener('click', (e) => {
        if (e.target === faqModal) faqModal.classList.add('hidden');
    });
};