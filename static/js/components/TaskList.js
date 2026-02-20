import API from '../api.js';

// Global State for Task View
const state = {
    allTasks: [],
    filteredTasks: [],
    selfContactId: null,
    filter: {
        type: 'active',
        value: null,
        search: ''
    },
    sort: {
        field: 'due_date',
        direction: 'asc'
    }
};

// --- localStorage ---
const STORAGE_KEY = 'taskListState';

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
                state.filter.type = saved.filter.type || 'active';
                state.filter.value = saved.filter.value ?? null;
            }
            if (saved.sort) {
                state.sort.field = saved.sort.field || 'due_date';
                state.sort.direction = saved.sort.direction || 'asc';
            }
        }
    } catch (e) { /* silent */ }
}

// --- 1. ENTRY POINT ---
async function renderTasks(tasksData) {
    state.allTasks = tasksData;
    restoreStateFromStorage();

    // Загружаем self-контакт для фильтров my/authored
    try {
        const self = await API.getSelfContact();
        state.selfContactId = self ? self.id : null;
    } catch (e) {
        state.selfContactId = null;
    }

    renderSidebarFilters();
    applyFiltersAndSort();
}

// --- 2. LOGIC ---
function applyFiltersAndSort() {
    let result = [...state.allTasks];

    // Фильтр по типу
    if (state.filter.type === 'active') {
        result = result.filter(t => !t.status || t.status.name !== 'Готово');
    }
    else if (state.filter.type === 'my') {
        if (state.selfContactId) {
            result = result.filter(t => t.assignee_id === state.selfContactId);
        } else {
            result = [];
        }
    }
    else if (state.filter.type === 'authored') {
        if (state.selfContactId) {
            result = result.filter(t => t.author_id === state.selfContactId);
        } else {
            result = [];
        }
    }
    else if (state.filter.type === 'overdue') {
        const today = new Date().setHours(0,0,0,0);
        result = result.filter(t => t.due_date && new Date(t.due_date) < today && (!t.status || t.status.name !== 'Готово'));
    }
    else if (state.filter.type === 'project') {
        result = result.filter(t => t.project_id === state.filter.value);
    }
    else if (state.filter.type === 'tag') {
        result = result.filter(t => t.tags && t.tags.some(tag => tag.name === state.filter.value));
    }
    // Если 'all' - ничего не фильтруем (кроме поиска)

    // Поиск
    if (state.filter.search) {
        const term = state.filter.search.toLowerCase();
        result = result.filter(t => t.title.toLowerCase().includes(term));
    }

    // Сортировка
    result.sort((a, b) => {
        let valA, valB;

        switch (state.sort.field) {
            case 'status':
                valA = a.status ? a.status.name : ''; valB = b.status ? b.status.name : ''; break;
            case 'title':
                valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
            case 'project':
                valA = a.project_title || ''; valB = b.project_title || ''; break;
            case 'assignee':
                valA = a.assignee ? a.assignee.last_name : ''; valB = b.assignee ? b.assignee.last_name : ''; break;
            case 'due_date':
                valA = a.due_date ? new Date(a.due_date).getTime() : 9999999999999;
                valB = b.due_date ? new Date(b.due_date).getTime() : 9999999999999;
                break;
            default: return 0;
        }

        if (valA < valB) return state.sort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return state.sort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    state.filteredTasks = result;
    renderTable();
    updateSidebarActiveState();
}

// --- 3. RENDER TABLE ---
function renderTable() {
    const tbody = document.getElementById('tasks-table-body');
    const footerCount = document.getElementById('task-table-count');
    if (!tbody) return;

    if (state.filteredTasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-12 text-center text-slate-400 italic">
            <div class="flex flex-col items-center justify-center">
                <i data-lucide="clipboard-list" class="w-10 h-10 mb-2 opacity-20"></i>
                <p>Задачи не найдены</p>
            </div>
        </td></tr>`;
        if (footerCount) footerCount.innerText = '0 задач';
        if (window.lucide) lucide.createIcons();
        return;
    }

    if (footerCount) footerCount.innerText = `${state.filteredTasks.length} задач`;

    tbody.innerHTML = state.filteredTasks.map(t => {
        const isDone = t.status && t.status.name === 'Готово';
        const isOverdue = !isDone && t.due_date && new Date(t.due_date) < new Date().setHours(0,0,0,0);

        // VISUAL: Тусклость для завершенных
        const rowClass = isDone ? 'opacity-60 grayscale-[0.5]' : 'opacity-100';

        // Status Dot (Soft style)
        const statusHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap"
            style="background-color: ${t.status?.color}15; color: ${t.status?.color}; border-color: ${t.status?.color}30">
            ${t.status?.name}
        </span>`;

        // Date
        let dateClass = 'text-slate-600 dark:text-slate-300';
        if (isOverdue) dateClass = 'text-red-600 font-bold';
        if (isDone) dateClass = 'text-slate-400 line-through';

        // Tags
        const tagsHtml = t.tags && t.tags.length
            ? `<div class="flex gap-1 mt-1 flex-wrap">${t.tags.map(tag => `<span class="px-1.5 py-0.5 rounded-sm bg-slate-100 text-[9px] text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">#${tag.name}</span>`).join('')}</div>`
            : '';

        return `
        <tr class="group hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors dark:hover:bg-slate-800/50 dark:border-slate-800 ${rowClass}">
            <!-- Checkbox -->
            <td class="px-4 py-3 text-center align-top pt-3.5">
                 <button onclick="event.stopPropagation(); toggleTaskStatus(${t.id}, ${t.status_id})"
                    class="w-4 h-4 rounded border flex items-center justify-center transition-all hover:scale-110"
                    style="border-color: ${t.status?.color}; ${isDone ? `background-color: ${t.status?.color}` : ''}">
                    ${isDone ? `<i data-lucide="check" class="w-3 h-3 text-white"></i>` : ''}
                </button>
            </td>

            <!-- Status -->
            <td class="px-4 py-3 align-top pt-3.5">${statusHtml}</td>

            <!-- Title -->
            <td class="px-4 py-3 max-w-xs align-top">
                <div class="font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:text-primary-600 leading-snug ${isDone ? 'line-through decoration-slate-400' : ''}" onclick="openTaskDetail(${t.id})">
                    ${t.title}
                </div>
                ${tagsHtml}
            </td>

            <!-- Project -->
            <td class="px-4 py-3 whitespace-nowrap align-top pt-3.5">
                ${t.project_id ?
                    `<div onclick="openProjectDetail(${t.project_id})" class="cursor-pointer flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary-600 dark:text-slate-400 transition-colors max-w-[140px]">
                        <i data-lucide="briefcase" class="w-3 h-3 flex-shrink-0 opacity-50"></i>
                        <span class="truncate">${t.project_title}</span>
                     </div>`
                    : '<span class="text-xs text-slate-300 dark:text-slate-600 pl-4">-</span>'}
            </td>

            <!-- Assignee -->
            <td class="px-4 py-3 whitespace-nowrap align-top pt-3">
                ${t.assignee ?
                    `<div class="flex items-center text-xs text-slate-600 dark:text-slate-300 group/u" title="${t.assignee.last_name} ${t.assignee.first_name}">
                        <div class="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold mr-2 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-800 group-hover/u:ring-primary-100 dark:group-hover/u:ring-primary-900 transition-all">
                            ${t.assignee.last_name.charAt(0)}
                        </div>
                        <span class="truncate max-w-[80px]">${t.assignee.last_name}</span>
                     </div>`
                    : '<span class="text-xs text-slate-300 dark:text-slate-600 pl-4">-</span>'}
            </td>

            <!-- Date -->
            <td class="px-4 py-3 whitespace-nowrap text-right align-top pt-3.5">
                <span class="text-xs ${dateClass}">${t.due_date || '-'}</span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity align-top pt-2.5">
                <button onclick="editTask(${t.id})" class="p-1.5 rounded-md text-slate-400 hover:text-primary-600 hover:bg-white border border-transparent hover:border-slate-200 shadow-sm dark:hover:bg-slate-700 dark:hover:border-slate-600 dark:hover:text-primary-400"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// --- 4. RENDER SIDEBAR ---
function renderSidebarFilters() {
    // Projects
    const projectsMap = new Map();
    state.allTasks.forEach(t => {
        if (t.project_id) {
            if (!projectsMap.has(t.project_id)) {
                projectsMap.set(t.project_id, { id: t.project_id, title: t.project_title, count: 0 });
            }
            projectsMap.get(t.project_id).count++;
        }
    });

    const projectsList = Array.from(projectsMap.values()).sort((a,b) => b.count - a.count);
    const projContainer = document.getElementById('task-filter-projects');

    if (projContainer) {
        projContainer.innerHTML = projectsList.map(p => `
            <li>
                <button onclick="window.setTaskFilter('project', ${p.id})"
                    class="task-filter-btn w-full text-left px-2 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 flex justify-between group dark:text-slate-300 dark:hover:bg-slate-700"
                    data-filter="project-${p.id}">
                    <span class="truncate pr-2">${p.title}</span>
                    <span class="text-[10px] py-0.5 px-1.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-primary-600 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:text-primary-400">${p.count}</span>
                </button>
            </li>
        `).join('');
    }

    // Tags
    const tagsMap = new Map();
    state.allTasks.forEach(t => {
        if (t.tags) {
            t.tags.forEach(tag => {
                tagsMap.set(tag.name, (tagsMap.get(tag.name) || 0) + 1);
            });
        }
    });

    const tagsContainer = document.getElementById('task-filter-tags');
    if (tagsContainer) {
        tagsContainer.innerHTML = Array.from(tagsMap.entries()).map(([name, count]) => `
            <button onclick="window.setTaskFilter('tag', '${name}')"
                class="task-filter-btn px-2 py-1 rounded text-[10px] bg-white border border-slate-200 text-slate-600 hover:border-primary-400 hover:text-primary-600 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                data-filter="tag-${name}">
                #${name} <span class="opacity-50 ml-0.5">${count}</span>
            </button>
        `).join('');
    }
}

function updateSidebarActiveState() {
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        // Reset
        btn.classList.remove('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');

        // Restore defaults based on type (simple check)
        if (btn.dataset.filter === 'overdue') btn.classList.add('text-red-600', 'dark:text-red-400');
        else btn.classList.add('text-slate-600', 'dark:text-slate-300');

        // Check active
        let isActive = false;
        const dataFilter = btn.dataset.filter;

        if (state.filter.type === 'active' && dataFilter === 'active') isActive = true;
        else if (state.filter.type === 'all' && dataFilter === 'all') isActive = true;
        else if (state.filter.type === 'my' && dataFilter === 'my') isActive = true;
        else if (state.filter.type === 'authored' && dataFilter === 'authored') isActive = true;
        else if (state.filter.type === 'overdue' && dataFilter === 'overdue') isActive = true;
        else if (state.filter.type === 'project' && dataFilter === `project-${state.filter.value}`) isActive = true;
        else if (state.filter.type === 'tag' && dataFilter === `tag-${state.filter.value}`) isActive = true;

        if (isActive) {
            btn.classList.remove('text-slate-600', 'text-red-600', 'hover:bg-slate-100', 'hover:bg-red-50', 'dark:text-slate-300', 'dark:text-red-400');
            btn.classList.add('bg-primary-50', 'text-primary-700', 'font-bold', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        }
    });
}

// --- EXPORTS ---
window.setTaskFilter = function(type, value = null) {
    state.filter.type = type;
    state.filter.value = value;
    state.filter.search = '';
    const searchInput = document.getElementById('taskLocalSearch');
    if(searchInput) searchInput.value = '';
    saveStateToStorage();
    applyFiltersAndSort();
};

window.filterTasksLocal = function(val) {
    state.filter.search = val;
    applyFiltersAndSort();
};

window.sortTasks = function(field) {
    if (state.sort.field === field) {
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.field = field;
        state.sort.direction = 'asc';
    }
    saveStateToStorage();
    applyFiltersAndSort();
};

export { renderTasks };
