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

// Палитра цветов для аватаров участников
const AVATAR_COLORS = [
    { bg: '#dbeafe', text: '#1e40af' },
    { bg: '#fce7f3', text: '#9d174d' },
    { bg: '#d1fae5', text: '#065f46' },
    { bg: '#fef3c7', text: '#92400e' },
    { bg: '#e0e7ff', text: '#3730a3' },
    { bg: '#fae8ff', text: '#86198f' },
    { bg: '#ccfbf1', text: '#134e4a' },
    { bg: '#fee2e2', text: '#991b1b' },
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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
                valA = (a.date || '') + (a.time || ''); valB = (b.date || '') + (b.time || '');
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
    renderStats();
    renderCards();
    updateSidebarActiveState();
}

// =========================================================================
// Stats bar
// =========================================================================

function renderStats() {
    const container = document.getElementById('meetings-stats-bar');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const total = state.allMeetings.length;
    const upcoming = state.allMeetings.filter(m => m.date >= today && m.status !== 'completed' && m.status !== 'cancelled').length;
    const todayCount = state.allMeetings.filter(m => m.date === today).length;
    const weekMinutes = state.allMeetings
        .filter(m => m.date >= weekAgoStr && m.date <= today && m.status === 'completed')
        .reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
    const weekHours = (weekMinutes / 60).toFixed(1);

    const stats = [
        { icon: 'calendar', label: 'Всего', value: total, color: 'text-slate-600 dark:text-slate-300', iconColor: 'text-slate-400' },
        { icon: 'calendar-clock', label: 'Предстоящие', value: upcoming, color: 'text-indigo-600 dark:text-indigo-400', iconColor: 'text-indigo-400' },
        { icon: 'sun', label: 'Сегодня', value: todayCount, color: 'text-amber-600 dark:text-amber-400', iconColor: 'text-amber-400' },
        { icon: 'clock', label: 'Часов / нед.', value: weekHours, color: 'text-emerald-600 dark:text-emerald-400', iconColor: 'text-emerald-400' },
    ];

    container.innerHTML = stats.map(s => `
        <div class="flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <i data-lucide="${s.icon}" class="w-4 h-4 ${s.iconColor} flex-shrink-0"></i>
            <div class="min-w-0">
                <div class="text-base font-bold ${s.color} leading-none">${s.value}</div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">${s.label}</div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}

// =========================================================================
// Cards
// =========================================================================

function renderCards() {
    const grid = document.getElementById('meetings-card-grid');
    const footerCount = document.getElementById('meeting-table-count');
    if (!grid) return;

    if (state.filteredMeetings.length === 0) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600">
                <div class="w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4">
                    <i data-lucide="calendar-x" class="w-10 h-10 opacity-30"></i>
                </div>
                <p class="text-sm font-medium mb-1">Встречи не найдены</p>
                <p class="text-xs opacity-60">Попробуйте другой фильтр или создайте новую встречу</p>
                <button onclick="quickStartMeeting()" class="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Начать встречу
                </button>
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
        <div class="mb-6">
            <div class="flex items-center gap-2 mb-3 px-1">
                <h3 class="text-xs font-bold uppercase tracking-wider ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}">
                    ${dateLabel}
                </h3>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 font-medium">${meetings.length}</span>
                <div class="flex-1 h-px bg-slate-100 dark:bg-slate-700/50"></div>
            </div>
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
    const isCancelled = m.status === 'cancelled';
    const typeColor = m.type?.color || '#94a3b8';

    const notesCount = m.meeting_notes_count || 0;
    const tasksCount = m.related_tasks ? m.related_tasks.length : 0;
    const actionsDone = m.action_items_done || 0;
    const actionsTotal = m.action_items_count || 0;

    // Время и длительность
    const timeStr = m.time ? m.time.slice(0, 5) : '';
    const durationStr = m.duration_minutes ? `${m.duration_minutes} мин` : '';

    // Аватары участников
    const participantsHtml = m.participants && m.participants.length > 0
        ? `<div class="flex -space-x-1.5">
            ${m.participants.slice(0, 5).map(p => {
                const colors = getAvatarColor(p.last_name);
                return `<div class="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white dark:ring-slate-800" style="background-color:${colors.bg};color:${colors.text}" title="${p.last_name} ${p.first_name || ''}">
                    ${p.last_name.charAt(0)}
                </div>`;
            }).join('')}
            ${m.participants_count > 5 ? `<div class="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-semibold text-slate-500 dark:text-slate-400 ring-2 ring-white dark:ring-slate-800">+${m.participants_count - 5}</div>` : ''}
           </div>`
        : '';

    // Статистика внизу
    const statsItems = [];
    if (notesCount > 0) statsItems.push(`<span class="flex items-center gap-1"><i data-lucide="message-square" class="w-3 h-3"></i>${notesCount}</span>`);
    if (tasksCount > 0) statsItems.push(`<span class="flex items-center gap-1"><i data-lucide="square-check" class="w-3 h-3"></i>${tasksCount}</span>`);
    if (actionsTotal > 0) statsItems.push(`<span class="flex items-center gap-1"><i data-lucide="list-checks" class="w-3 h-3"></i>${actionsDone}/${actionsTotal}</span>`);

    return `
    <div class="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-600 overflow-hidden ${isActive ? 'ring-2 ring-amber-400/60 border-amber-200 dark:border-amber-700 shadow-md shadow-amber-100/50 dark:shadow-amber-900/20' : ''} ${isCompleted || isCancelled ? 'opacity-60 hover:opacity-80' : ''}"
        onclick="openMeetingDetail(${m.id})">

        <!-- Left color accent bar -->
        <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style="background-color: ${typeColor}"></div>

        <div class="pl-4 pr-4 py-3.5">
            <!-- Top row: Status + Time + Duration -->
            <div class="flex items-center justify-between mb-2.5">
                <div class="flex items-center gap-2">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style="background-color: ${statusInfo.bg}; color: ${statusInfo.color}">
                        ${isActive ? '<span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style="background-color:' + statusInfo.color + '"></span><span class="relative inline-flex rounded-full h-2 w-2" style="background-color:' + statusInfo.color + '"></span></span>' : `<i data-lucide="${statusInfo.icon}" class="w-3 h-3"></i>`}
                        ${statusInfo.label}
                    </span>
                    ${m.type ? `<span class="text-[10px] text-slate-400 dark:text-slate-500 font-medium">${m.type.name}</span>` : ''}
                </div>
                <div class="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                    ${durationStr ? `<span class="flex items-center gap-1"><i data-lucide="timer" class="w-3 h-3"></i>${durationStr}</span>` : ''}
                    ${timeStr ? `<span class="font-medium">${timeStr}</span>` : ''}
                </div>
            </div>

            <!-- Title -->
            <h4 class="font-semibold text-[15px] text-slate-800 dark:text-slate-100 mb-1 leading-snug line-clamp-2 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                ${m.title || 'Без названия'}
            </h4>

            <!-- Project -->
            ${m.project_title ? `<div class="flex items-center gap-1.5 mb-2.5 text-[11px] text-slate-400 dark:text-slate-500"><i data-lucide="briefcase" class="w-3 h-3"></i><span class="truncate">${m.project_title}</span></div>` : '<div class="mb-2.5"></div>'}

            <!-- Bottom: Stats + Participants -->
            <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/50">
                <div class="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
                    ${statsItems.join('')}
                    ${statsItems.length === 0 ? '<span class="text-[11px] text-slate-300 dark:text-slate-600 italic">Нет заметок</span>' : ''}
                </div>
                ${participantsHtml}
            </div>
        </div>
    </div>`;
}

// =========================================================================
// Sidebar filters
// =========================================================================

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
                    class="meeting-filter-btn w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex justify-between group dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    data-filter="meeting_type-${t.id}">
                    <span class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${t.color}"></span>
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
