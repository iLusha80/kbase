// Global State for Contacts View
const state = {
    allContacts: [],
    filteredContacts: [],
    filter: {
        type: 'all',    // 'all', 'team', 'type'
        value: null,     // type_id для фильтра type
        search: ''
    },
    sort: {
        field: 'priority', // 'name', 'tasks', 'priority'
        direction: 'asc'
    }
};

// --- localStorage ---
const STORAGE_KEY = 'contactListState';

function saveStateToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            filter: { type: state.filter.type, value: state.filter.value },
            sort: { field: state.sort.field, direction: state.sort.direction }
        }));
    } catch (e) { /* silent */ }
}

function restoreStateFromStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved) {
            if (saved.filter) {
                state.filter.type = saved.filter.type || 'all';
                state.filter.value = saved.filter.value ?? null;
            }
            if (saved.sort) {
                state.sort.field = saved.sort.field || 'priority';
                state.sort.direction = saved.sort.direction || 'asc';
            }
        }
    } catch (e) { /* silent */ }
}

// --- Helper ---
function renderTagsHtml(tagsList) {
    if (!tagsList || !tagsList.length) return '';
    return `<div class="flex flex-wrap gap-1 mt-1">` +
           tagsList.map(t => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">#${t.name}</span>`).join('') +
           `</div>`;
}

// --- 1. ENTRY POINT ---
export function renderContacts(contactsData) {
    state.allContacts = contactsData;
    restoreStateFromStorage();
    renderSidebarFilters();
    applyFiltersAndSort();
}

// --- 2. LOGIC ---
function applyFiltersAndSort() {
    let result = [...state.allContacts];

    // Фильтр по типу
    if (state.filter.type === 'team') {
        result = result.filter(c => c.is_team === true);
    }
    else if (state.filter.type === 'type') {
        result = result.filter(c => c.type_id === state.filter.value);
    }
    // 'all' — ничего не фильтруем

    // Поиск
    if (state.filter.search) {
        const term = state.filter.search.toLowerCase();
        result = result.filter(c => {
            const fullName = `${c.last_name} ${c.first_name} ${c.middle_name}`.toLowerCase();
            const tagsString = c.tags ? c.tags.map(t => t.name).join(' ') : '';
            return fullName.includes(term) ||
                   (c.department && c.department.toLowerCase().includes(term)) ||
                   (c.role && c.role.toLowerCase().includes(term)) ||
                   tagsString.includes(term);
        });
    }

    // Сортировка
    result.sort((a, b) => {
        let valA, valB;

        switch (state.sort.field) {
            case 'name':
                valA = `${a.last_name} ${a.first_name}`.toLowerCase();
                valB = `${b.last_name} ${b.first_name}`.toLowerCase();
                break;
            case 'tasks':
                valA = (a.active_task_count || 0);
                valB = (b.active_task_count || 0);
                // Больше задач — выше (desc по умолчанию)
                return state.sort.direction === 'asc' ? valB - valA : valA - valB;
            case 'priority':
                // self=0, team=1, остальные=2
                valA = a.is_self ? 0 : (a.is_team ? 1 : 2);
                valB = b.is_self ? 0 : (b.is_team ? 1 : 2);
                if (valA !== valB) return valA - valB;
                // Внутри группы — по имени
                valA = `${a.last_name} ${a.first_name}`.toLowerCase();
                valB = `${b.last_name} ${b.first_name}`.toLowerCase();
                break;
            default:
                return 0;
        }

        if (valA < valB) return state.sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return state.sort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    state.filteredContacts = result;
    renderTable();
    updateSidebarActiveState();
}

// --- 3. RENDER TABLE ---
function renderTable() {
    const tbody = document.getElementById('contacts-table-body');
    const footerCount = document.getElementById('contact-table-count');
    if (!tbody) return;

    if (state.filteredContacts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 italic">
            <div class="flex flex-col items-center justify-center">
                <i data-lucide="users" class="w-10 h-10 mb-2 opacity-20"></i>
                <p>Контакты не найдены</p>
            </div>
        </td></tr>`;
        if (footerCount) footerCount.innerText = '0 контактов';
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (footerCount) footerCount.innerText = `${state.filteredContacts.length} контактов`;

    tbody.innerHTML = state.filteredContacts.map(c => {
        const fullName = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
        const initial = c.last_name ? c.last_name.charAt(0).toUpperCase() : '?';
        const typeColor = c.type ? c.type.render_color : '#cbd5e1';

        return `
        <tr class="hover:bg-slate-50 transition-colors group dark:hover:bg-slate-800/50" style="border-left: 4px solid ${typeColor};">
            <td class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 cursor-pointer" onclick="openContactDetail(${c.id})">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600 dark:bg-slate-700 dark:text-slate-300" style="background-color: ${typeColor}40; color: ${typeColor}">${initial}</div>
                    <div>
                        <div class="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors dark:text-slate-100 dark:group-hover:text-primary-400 flex items-center gap-1.5 flex-wrap">
                            ${fullName}
                            ${c.is_self ? `<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Я</span>` : ''}
                            ${c.is_team ? `<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">Команда</span>` : ''}
                            ${c.link ? `<i data-lucide="external-link" class="w-3 h-3 inline text-slate-400"></i>` : ''}
                        </div>
                        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider dark:text-slate-500">${c.type ? c.type.name_type : ''}</div>
                    </div>
                </div>
                ${renderTagsHtml(c.tags)}
            </td>
            <td class="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50">
                <div class="text-sm text-slate-800 dark:text-slate-200">${c.department || '-'}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400">${c.role || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 border-b border-slate-100 dark:border-slate-700/50 dark:text-slate-400">
                <div>${c.email || ''}</div>
                <div>${c.phone || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate border-b border-slate-100 dark:border-slate-700/50 dark:text-slate-400">
                ${c.notes || ''}
            </td>
            <td class="px-6 py-4 text-right border-b border-slate-100 dark:border-slate-700/50">
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editContact(${c.id})" class="p-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteContact(${c.id})" class="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// --- 4. RENDER SIDEBAR ---
function renderSidebarFilters() {
    // Счётчики
    const allCount = state.allContacts.length;
    const teamCount = state.allContacts.filter(c => c.is_team).length;

    const allCountEl = document.getElementById('contact-count-all');
    const teamCountEl = document.getElementById('contact-count-team');
    if (allCountEl) allCountEl.innerText = allCount;
    if (teamCountEl) teamCountEl.innerText = teamCount;

    // Типы контактов (динамически из данных)
    const typesMap = new Map();
    state.allContacts.forEach(c => {
        if (c.type) {
            if (!typesMap.has(c.type_id)) {
                typesMap.set(c.type_id, { id: c.type_id, name: c.type.name_type, color: c.type.render_color, count: 0 });
            }
            typesMap.get(c.type_id).count++;
        }
    });

    const typesContainer = document.getElementById('contact-filter-types');
    if (typesContainer) {
        typesContainer.innerHTML = Array.from(typesMap.values()).map(t => `
            <li>
                <button onclick="window.setContactFilter('type', ${t.id})"
                    class="contact-filter-btn w-full text-left px-2 py-1.5 rounded text-sm font-medium text-slate-600 hover:bg-slate-100 flex justify-between items-center group dark:text-slate-300 dark:hover:bg-slate-700"
                    data-filter="type-${t.id}">
                    <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${t.color}"></span>
                        ${t.name}
                    </span>
                    <span class="text-[10px] py-0.5 px-1.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-primary-600 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:text-primary-400">${t.count}</span>
                </button>
            </li>
        `).join('');
    }
}

function updateSidebarActiveState() {
    // Фильтры
    document.querySelectorAll('.contact-filter-btn').forEach(btn => {
        btn.classList.remove('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');

        if (btn.dataset.filter === 'team') btn.classList.add('text-green-600', 'dark:text-green-400');
        else btn.classList.add('text-slate-600', 'dark:text-slate-300');

        let isActive = false;
        const df = btn.dataset.filter;

        if (state.filter.type === 'all' && df === 'all') isActive = true;
        else if (state.filter.type === 'team' && df === 'team') isActive = true;
        else if (state.filter.type === 'type' && df === `type-${state.filter.value}`) isActive = true;

        if (isActive) {
            btn.classList.remove('text-slate-600', 'text-green-600', 'hover:bg-slate-100', 'hover:bg-green-50', 'dark:text-slate-300', 'dark:text-green-400');
            btn.classList.add('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        }
    });

    // Сортировка
    document.querySelectorAll('.contact-sort-btn').forEach(btn => {
        btn.classList.remove('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        btn.classList.add('text-slate-600', 'dark:text-slate-300');

        if (btn.dataset.sort === state.sort.field) {
            btn.classList.remove('text-slate-600', 'hover:bg-slate-100', 'dark:text-slate-300');
            btn.classList.add('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        }
    });
}

// --- EXPORTS ---
window.setContactFilter = function(type, value = null) {
    state.filter.type = type;
    state.filter.value = value;
    state.filter.search = '';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    saveStateToStorage();
    applyFiltersAndSort();
};

window.setContactSort = function(field) {
    if (state.sort.field === field) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.field = field;
        state.sort.direction = 'asc';
    }
    saveStateToStorage();
    applyFiltersAndSort();
};

window.filterContactsLocal = function(val) {
    state.filter.search = val;
    applyFiltersAndSort();
};
