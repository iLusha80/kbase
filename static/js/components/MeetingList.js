const state = {
    allMeetings: [],
    filteredMeetings: [],
    meetingTypes: [],
    filter: {
        type: 'upcoming',
        value: null,
        search: ''
    },
    sort: {
        field: 'date',
        direction: 'desc'
    }
};

const STATUS_LABELS = {
    'planned': { label: 'Запланирована', color: '#6366f1', bg: '#6366f115', icon: 'clock' },
    'in_progress': { label: 'Идёт', color: '#f59e0b', bg: '#f59e0b15', icon: 'play-circle' },
    'completed': { label: 'Завершена', color: '#22c55e', bg: '#22c55e15', icon: 'check-circle' },
    'cancelled': { label: 'Отменена', color: '#ef4444', bg: '#ef444415', icon: 'x-circle' }
};

function renderMeetings(meetingsData, meetingTypes) {
    state.allMeetings = meetingsData;
    if (meetingTypes) state.meetingTypes = meetingTypes;
    renderSidebarFilters();
    applyFiltersAndSort();
}

function applyFiltersAndSort() {
    let result = [...state.allMeetings];
    const today = new Date().toISOString().split('T')[0];

    if (state.filter.type === 'upcoming') {
        result = result.filter(m => m.date >= today && m.status !== 'completed' && m.status !== 'cancelled');
    } else if (state.filter.type === 'today') {
        result = result.filter(m => m.date === today);
    } else if (state.filter.type === 'completed') {
        result = result.filter(m => m.status === 'completed');
    } else if (state.filter.type === 'meeting_type') {
        result = result.filter(m => m.type_id === state.filter.value);
    }

    if (state.filter.search) {
        const term = state.filter.search.toLowerCase();
        result = result.filter(m => (m.title || '').toLowerCase().includes(term));
    }

    result.sort((a, b) => {
        let valA, valB;
        switch (state.sort.field) {
            case 'date':
                valA = a.date || ''; valB = b.date || '';
                break;
            case 'title':
                valA = (a.title || '').toLowerCase(); valB = (b.title || '').toLowerCase();
                break;
            default: return 0;
        }
        if (valA < valB) return state.sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return state.sort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    state.filteredMeetings = result;
    renderCards();
    updateSidebarActiveState();
}

function renderCards() {
    const grid = document.getElementById('meetings-card-grid');
    const footerCount = document.getElementById('meeting-table-count');
    if (!grid) return;

    if (state.filteredMeetings.length === 0) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                <i data-lucide="calendar-x" class="w-12 h-12 mb-3 opacity-20"></i>
                <p class="text-sm">Встречи не найдены</p>
            </div>`;
        if (footerCount) footerCount.innerText = '0 встреч';
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (footerCount) footerCount.innerText = `${state.filteredMeetings.length} встреч`;

    // Group by date
    const groups = {};
    const today = new Date().toISOString().split('T')[0];

    state.filteredMeetings.forEach(m => {
        const dateKey = m.date || 'no-date';
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(m);
    });

    let html = '';

    for (const [dateKey, meetings] of Object.entries(groups)) {
        const dateLabel = formatDateGroup(dateKey, today);
        const isToday = dateKey === today;

        html += `
        <div class="mb-5">
            <h3 class="text-xs font-bold uppercase tracking-wider mb-2 px-1 ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}">
                ${dateLabel}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                ${meetings.map(m => renderCard(m, today)).join('')}
            </div>
        </div>`;
    }

    grid.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

function renderCard(m, today) {
    const statusInfo = STATUS_LABELS[m.status] || STATUS_LABELS['planned'];
    const isActive = m.status === 'in_progress';
    const isCompleted = m.status === 'completed';

    const notesCount = m.meeting_notes_count || 0;
    const tasksCount = m.related_tasks ? m.related_tasks.length : 0;

    const participantsHtml = m.participants && m.participants.length > 0
        ? `<div class="flex -space-x-1.5">
            ${m.participants.slice(0, 4).map(p => `
                <div class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold ring-1 ring-white dark:ring-slate-800 dark:bg-slate-700 dark:text-slate-300" title="${p.last_name} ${p.first_name || ''}">
                    ${p.last_name.charAt(0)}
                </div>
            `).join('')}
            ${m.participants_count > 4 ? `<div class="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-medium ring-1 ring-white dark:ring-slate-800 dark:bg-slate-700">+${m.participants_count - 4}</div>` : ''}
           </div>`
        : '';

    return `
    <div class="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-primary-200 dark:hover:border-primary-800 transition-all ${isActive ? 'ring-2 ring-amber-400/50 border-amber-300 dark:border-amber-700' : ''} ${isCompleted ? 'opacity-70' : ''}"
        onclick="openMeetingDetail(${m.id})">

        <!-- Top: Status + Time -->
        <div class="flex items-center justify-between mb-2">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                style="background-color: ${statusInfo.bg}; color: ${statusInfo.color}; border-color: ${statusInfo.color}30">
                <i data-lucide="${statusInfo.icon}" class="w-3 h-3"></i>
                ${statusInfo.label}
            </span>
            <span class="text-[11px] text-slate-400 dark:text-slate-500">${m.time || ''}</span>
        </div>

        <!-- Title -->
        <h4 class="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1 leading-snug line-clamp-2">
            ${m.title || 'Без названия'}
        </h4>

        <!-- Type + Project -->
        <div class="flex items-center gap-2 mb-3 text-[11px] text-slate-400">
            ${m.type ? `<span class="flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full" style="background-color: ${m.type.color}"></span>${m.type.name}</span>` : ''}
            ${m.project_title ? `<span class="truncate">${m.project_title}</span>` : ''}
        </div>

        <!-- Bottom: Stats + Participants -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                ${notesCount > 0 ? `<span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i>${notesCount}</span>` : ''}
                ${tasksCount > 0 ? `<span class="flex items-center gap-1"><i data-lucide="check-square" class="w-3 h-3"></i>${tasksCount}</span>` : ''}
                ${m.action_items_count > 0 ? `<span class="flex items-center gap-1"><i data-lucide="list-checks" class="w-3 h-3"></i>${m.action_items_done}/${m.action_items_count}</span>` : ''}
            </div>
            ${participantsHtml}
        </div>
    </div>`;
}

function renderSidebarFilters() {
    const typesContainer = document.getElementById('meeting-filter-types');
    if (typesContainer && state.meetingTypes.length > 0) {
        const typeCounts = {};
        state.allMeetings.forEach(m => {
            if (m.type_id) {
                typeCounts[m.type_id] = (typeCounts[m.type_id] || 0) + 1;
            }
        });

        typesContainer.innerHTML = state.meetingTypes.map(t => `
            <li>
                <button onclick="window.setMeetingFilter('meeting_type', ${t.id})"
                    class="meeting-filter-btn w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex justify-between group dark:text-slate-300 dark:hover:bg-slate-700"
                    data-filter="meeting_type-${t.id}">
                    <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${t.color}"></span>
                        ${t.name}
                    </span>
                    <span class="text-[10px] py-0.5 px-1.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500">${typeCounts[t.id] || 0}</span>
                </button>
            </li>
        `).join('');
    }
}

function updateSidebarActiveState() {
    document.querySelectorAll('.meeting-filter-btn').forEach(btn => {
        btn.classList.remove('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        btn.classList.add('text-slate-600', 'dark:text-slate-300');

        let isActive = false;
        const dataFilter = btn.dataset.filter;

        if (state.filter.type === 'upcoming' && dataFilter === 'upcoming') isActive = true;
        else if (state.filter.type === 'today' && dataFilter === 'today') isActive = true;
        else if (state.filter.type === 'completed' && dataFilter === 'completed') isActive = true;
        else if (state.filter.type === 'all' && dataFilter === 'all') isActive = true;
        else if (state.filter.type === 'meeting_type' && dataFilter === `meeting_type-${state.filter.value}`) isActive = true;

        if (isActive) {
            btn.classList.remove('text-slate-600', 'hover:bg-slate-100', 'dark:text-slate-300');
            btn.classList.add('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        }
    });
}

function formatDateGroup(dateStr, today) {
    if (!dateStr || dateStr === 'no-date') return 'Без даты';
    const d = new Date(dateStr + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');

    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(todayDate);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.getTime() === todayDate.getTime()) return 'Сегодня';
    if (d.getTime() === tomorrow.getTime()) return 'Завтра';
    if (d.getTime() === yesterday.getTime()) return 'Вчера';

    return d.toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: d.getFullYear() !== todayDate.getFullYear() ? 'numeric' : undefined
    });
}

// --- EXPORTS ---
window.setMeetingFilter = function(type, value = null) {
    state.filter.type = type;
    state.filter.value = value;
    state.filter.search = '';
    const searchInput = document.getElementById('meetingLocalSearch');
    if (searchInput) searchInput.value = '';
    applyFiltersAndSort();
};

window.filterMeetingsLocal = function(val) {
    state.filter.search = val;
    applyFiltersAndSort();
};

window.sortMeetings = function(field) {
    if (state.sort.field === field) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.field = field;
        state.sort.direction = field === 'date' ? 'desc' : 'asc';
    }
    applyFiltersAndSort();
};

export { renderMeetings, STATUS_LABELS };
