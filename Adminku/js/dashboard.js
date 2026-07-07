import { getAllItems, getItem, saveItem } from './storage.js';
import { calculateStatus, escapeHTML, formatDate } from './utils.js';
import { openEditModal } from './form.js'; 

const getStatusClass = (status) => {
    if (status === 'Perhatian') return ['status-warning', 'badge-warning'];
    if (status === 'Mendesak' || status === 'Kedaluwarsa') return ['status-urgent', 'badge-urgent'];
    return ['status-safe', 'badge-safe'];
};

const getFilteredItems = (items) => {
    const searchQuery = document.getElementById('search-input')?.value.toLowerCase() || '';
    const filterCategory = document.getElementById('filter-category')?.value || 'All';
    const filterView = document.getElementById('filter-view')?.value || 'active';

    return items.filter(item => {
        const haystack = [item.title, item.category, ...(item.tags || [])].join(' ').toLowerCase();
        const matchesSearch = haystack.includes(searchQuery);
        const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
        const matchesView = filterView === 'all'
            || (filterView === 'favorites' && item.isFavorite)
            || (filterView === 'archived' && item.isArchived)
            || (filterView === 'active' && !item.isArchived);

        return matchesSearch && matchesCategory && matchesView;
    });
};

const renderTimeline = (items) => {
    const upcoming = [...items]
        .filter(item => !item.isArchived)
        .sort((a, b) => dayjs(a.expiryDate).valueOf() - dayjs(b.expiryDate).valueOf())
        .slice(0, 4);

    if (!upcoming.length) return '';

    return `
        <section class="timeline-panel" aria-labelledby="timeline-title">
            <h3 id="timeline-title">Linimasa aktivitas</h3>
            <div class="timeline-list">
                ${upcoming.map(item => {
                    const diff = dayjs(item.expiryDate).startOf('day').diff(dayjs().startOf('day'), 'day');
                    const copy = diff < 0 ? `Lewat ${Math.abs(diff)} hari` : diff === 0 ? 'Jatuh tempo hari ini' : `${diff} hari lagi`;
                    return `
                        <div class="timeline-item">
                            <span class="timeline-dot" aria-hidden="true"></span>
                            <div>
                                <p class="timeline-title">${escapeHTML(item.title)}</p>
                                <p class="timeline-copy">${copy} - ${formatDate(item.expiryDate)}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </section>
    `;
};

const renderDetail = async (id) => {
    const item = await getItem(id);
    if (!item) return;

    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('detail-content');
    const title = document.getElementById('detail-title');
    const category = document.getElementById('detail-category');
    const btnFavorite = document.getElementById('btn-detail-favorite');
    const btnArchive = document.getElementById('btn-detail-archive');
    const btnEdit = document.getElementById('btn-detail-edit');
    const { status } = calculateStatus(item.expiryDate);
    const tags = item.tags || [];

    if (title) title.innerText = item.title;
    if (category) category.innerText = item.category;
    if (content) {
        content.innerHTML = `
            ${item.image ? `<img src="${item.image}" class="detail-image" alt="Lampiran ${escapeHTML(item.title)}">` : ''}
            <div class="detail-grid">
                <div class="detail-field"><span>Status</span><strong>${status}</strong></div>
                <div class="detail-field"><span>Masa Berlaku</span><strong>${formatDate(item.expiryDate)}</strong></div>
                <div class="detail-field"><span>Pengingat</span><strong>${(item.reminderDays || []).join(', ')} hari</strong></div>
                <div class="detail-field"><span>Disimpan</span><strong>${formatDate(item.createdAt)}</strong></div>
            </div>
            <div class="detail-field">
                <span>Tag</span>
                <strong>${tags.length ? tags.map(tag => `#${escapeHTML(tag)}`).join(' ') : 'Belum ada tag'}</strong>
            </div>
        `;
    }

    if (btnFavorite) {
        btnFavorite.innerHTML = `<i data-lucide="star"></i> ${item.isFavorite ? 'Hapus Favorit' : 'Jadikan Favorit'}`;
        btnFavorite.onclick = async () => {
            await saveItem({ ...item, isFavorite: !item.isFavorite });
            modal?.classList.add('hidden');
            await renderDashboard('app-mount');
        };
    }

    if (btnArchive) {
        btnArchive.innerHTML = `<i data-lucide="archive"></i> ${item.isArchived ? 'Aktifkan Lagi' : 'Arsipkan'}`;
        btnArchive.onclick = async () => {
            await saveItem({ ...item, isArchived: !item.isArchived });
            modal?.classList.add('hidden');
            await renderDashboard('app-mount');
        };
    }

    if (btnEdit) {
        btnEdit.onclick = () => {
            modal?.classList.add('hidden');
            openEditModal(id);
        };
    }

    modal?.classList.remove('hidden');
    lucide.createIcons();
};

export const setupDetailModal = () => {
    document.getElementById('btn-close-detail')?.addEventListener('click', () => {
        document.getElementById('detail-modal')?.classList.add('hidden');
    });
};

export const renderDashboard = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const allItems = await getAllItems();
    const activeItems = allItems.filter(item => !item.isArchived);
    
    const userGreeting = document.getElementById('user-greeting');
    const assistantSummary = document.getElementById('assistant-summary');
    const summaryWidgets = document.getElementById('summary-widgets');
    const controlsBar = document.getElementById('controls-bar');

    if (allItems.length === 0) {
        summaryWidgets?.classList.add('hidden');
        controlsBar?.classList.add('hidden');
        if (userGreeting) userGreeting.innerText = 'Ruang Penyimpanan Kosong';
        if (assistantSummary) assistantSummary.innerText = 'Tambahkan dokumen pertama Anda agar sistem dapat memulai pemantauan masa berlaku secara otomatis.';
        
        container.innerHTML = `
            <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
                <i data-lucide="folder-open" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;" aria-hidden="true"></i>
                <p>Belum ada data dokumen yang diregistrasikan.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    let safeCount = 0, warningCount = 0, urgentCount = 0;
    activeItems.forEach(item => {
        const { status } = calculateStatus(item.expiryDate);
        if (status === 'Aman') safeCount++;
        else if (status === 'Perhatian') warningCount++;
        else urgentCount++; 
    });

    const favoriteCount = allItems.filter(item => item.isFavorite).length;
    const archivedCount = allItems.filter(item => item.isArchived).length;

    if (userGreeting && assistantSummary) {
        userGreeting.style.color = '';
        if (urgentCount > 0) {
            userGreeting.innerText = 'Perhatian Dibutuhkan';
            userGreeting.style.color = 'var(--danger-color)';
            assistantSummary.innerHTML = `Terdapat <strong>${urgentCount} dokumen aktif</strong> yang telah habis masa berlakunya atau berstatus sangat kritis.`;
        } else if (warningCount > 0) {
            userGreeting.innerText = 'Tindakan Persiapan';
            userGreeting.style.color = 'var(--warning-color)';
            assistantSummary.innerHTML = `Sebanyak <strong>${warningCount} dokumen aktif</strong> perlu dipersiapkan dalam waktu dekat.`;
        } else {
            userGreeting.innerText = 'Dokumen Anda Terkendali';
            userGreeting.style.color = 'var(--success-color)';
            assistantSummary.innerText = 'Semua dokumen aktif berada dalam masa berlaku yang aman.';
        }
    }

    document.getElementById('count-safe').innerText = safeCount;
    document.getElementById('count-warning').innerText = warningCount;
    document.getElementById('count-urgent').innerText = urgentCount;
    summaryWidgets.innerHTML = `
        <article class="stat-card stat-safe"><span class="stat-value" id="count-safe">${safeCount}</span><span class="stat-label">Dokumen Aman</span></article>
        <article class="stat-card stat-warning"><span class="stat-value" id="count-warning">${warningCount}</span><span class="stat-label">Perlu Diperpanjang</span></article>
        <article class="stat-card stat-urgent"><span class="stat-value" id="count-urgent">${urgentCount}</span><span class="stat-label">Habis Masa Berlaku</span></article>
        <article class="stat-card stat-favorite"><span class="stat-value">${favoriteCount}</span><span class="stat-label">Favorit</span></article>
    `;

    summaryWidgets?.classList.remove('hidden');
    controlsBar?.classList.remove('hidden');

    const filteredItems = getFilteredItems(allItems);

    container.innerHTML = `
        ${renderTimeline(allItems)}
        <div class="doc-list-grid" role="list" aria-label="Dokumen hasil penyaringan">
            ${filteredItems.length ? filteredItems.map(item => {
                const { status } = calculateStatus(item.expiryDate);
                const [cardClass, badgeClass] = getStatusClass(status);
                const tags = (item.tags || []).slice(0, 3);

                return `
                <article class="doc-card ${cardClass}" data-id="${item.id}" role="listitem" tabindex="0" aria-label="Buka detail dokumen ${escapeHTML(item.title)}">
                    <div class="doc-main-info">
                        <span class="doc-category">${escapeHTML(item.category)}${item.isArchived ? ' - Arsip' : ''}</span>
                        <h3 class="doc-title">${item.isFavorite ? '<i data-lucide="star" class="icon-inline" aria-hidden="true"></i> ' : ''}${escapeHTML(item.title)}</h3>
                        <p class="doc-expiry">Berlaku s.d. ${formatDate(item.expiryDate)}</p>
                        <div class="doc-meta-row">${tags.map(tag => `<span class="tag-chip">#${escapeHTML(tag)}</span>`).join('')}</div>
                    </div>
                    <div class="doc-card-actions">
                        ${item.isArchived ? '<span class="icon-state" title="Diarsipkan"><i data-lucide="archive" aria-hidden="true"></i></span>' : ''}
                        <span class="badge ${badgeClass}">${status}</span>
                    </div>
                </article>`;
            }).join('') : `
                <div class="empty-state" style="text-align:center; padding: 2rem 1rem; color: var(--text-muted);">
                    <p>Tidak ada dokumen yang cocok dengan filter saat ini.</p>
                </div>
            `}
        </div>
        ${archivedCount > 0 ? `<p class="timeline-copy" style="margin-top:1rem;">${archivedCount} dokumen tersimpan di arsip.</p>` : ''}
    `;

    lucide.createIcons();

    document.querySelectorAll('.doc-card').forEach(card => {
        const openCard = () => renderDetail(card.getAttribute('data-id'));
        card.addEventListener('click', openCard);
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openCard();
            }
        });
    });
};
