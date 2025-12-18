// Global State for Task View
const state = {
    allTasks: [],     // Сырые данные
    filteredTasks: [], // После фильтрации
    filter: {
        type: 'all',  // 'all', 'my', 'authored', 'overdue', 'project', 'tag'
        value: null,  // id проекта или имя тега
        search: ''    // текстовый поиск
    },
    sort: {
        field: 'due_date', // 'status', 'title', 'project', 'assignee', 'due_date'
        direction: 'asc'
    }
};

// --- 1. ENTRY POINT ---
function renderTasks(tasksData) {
    state.allTasks = tasksData;
    
    // Инициализация сайдбара только один раз или при изменении данных
    renderSidebarFilters();
    
    // Применяем текущие фильтры и сортировку
    applyFiltersAndSort();
}

// --- 2. LOGIC ---
function applyFiltersAndSort() {
    let result = [...state.allTasks];
    const myId = 1; // TODO: В реальном приложении брать ID текущего юзера. Пока заглушка или берем первого.

    // A. Filter by Type
    if (state.filter.type === 'my') {
        // Предположим, что "Я" - это контакт с ID=2 (Смирнова Анна - PM) для теста, 
        // или просто фильтруем тех, у кого есть assignee. 
        // Для локальной версии без авторизации: фильтруем "без исполнителя" или по конкретному ID.
        // Пусть будет: задачи, где assignee != null (назначенные)
        result = result.filter(t => t.assignee_id !== null); 
    } else if (state.filter.type === 'authored') {
        result = result.filter(t => t.author_id !== null);
    } else if (state.filter.type === 'overdue') {
        const today = new Date().setHours(0,0,0,0);
        result = result.filter(t => t.due_date && new Date(t.due_date) < today && t.status.name !== 'Готово');
    } else if (state.filter.type === 'project') {
        result = result.filter(t => t.project_id === state.filter.value);
    } else if (state.filter.type === 'tag') {
        result = result.filter(t => t.tags && t.tags.some(tag => tag.name === state.filter.value));
    }

    // B. Search
    if (state.filter.search) {
        const term = state.filter.search.toLowerCase();
        result = result.filter(t => t.title.toLowerCase().includes(term));
    }

    // C. Sort
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
                // null даты всегда в конце
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
        tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-slate-400 italic">Задачи не найдены</td></tr>`;
        if (footerCount) footerCount.innerText = '0 задач';
        return;
    }

    if (footerCount) footerCount.innerText = `${state.filteredTasks.length} задач`;

    tbody.innerHTML = state.filteredTasks.map(t => {
        const isDone = t.status && t.status.name === 'Готово';
        const isOverdue = !isDone && t.due_date && new Date(t.due_date) < new Date().setHours(0,0,0,0);
        
        // Status Dot
        const statusHtml = `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border" 
            style="background-color: ${t.status?.color}20; color: ${t.status?.color}; border-color: ${t.status?.color}40">
            ${t.status?.name}
        </span>`;

        // Date
        const dateClass = isOverdue ? 'text-red-600 font-bold' : (isDone ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300');
        
        // Tags
        const tagsHtml = t.tags && t.tags.length 
            ? `<div class="flex gap-1 mt-1">${t.tags.map(tag => `<span class="text-[9px] text-slate-400">#${tag.name}</span>`).join('')}</div>` 
            : '';

        return `
        <tr class="group hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors dark:hover:bg-slate-800 dark:border-slate-800">
            <!-- Checkbox -->
            <td class="px-4 py-2 text-center">
                 <button onclick="event.stopPropagation(); toggleTaskStatus(${t.id}, ${t.status_id})" 
                    class="w-4 h-4 rounded border flex items-center justify-center transition-colors"
                    style="border-color: ${t.status?.color}">
                    ${isDone ? `<i data-lucide="check" class="w-3 h-3" style="color: ${t.status?.color}"></i>` : ''}
                </button>
            </td>

            <!-- Status -->
            <td class="px-4 py-2 whitespace-nowrap">${statusHtml}</td>

            <!-- Title -->
            <td class="px-4 py-2 max-w-xs">
                <div class="truncate font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:text-primary-600" onclick="openTaskDetail(${t.id})">
                    ${t.title}
                </div>
                ${tagsHtml}
            </td>

            <!-- Project -->
            <td class="px-4 py-2 whitespace-nowrap">
                ${t.project_id ? 
                    `<span onclick="openProjectDetail(${t.project_id})" class="cursor-pointer text-xs text-slate-500 hover:text-primary-600 dark:text-slate-400">
                        <i data-lucide="briefcase" class="w-3 h-3 inline mr-1 opacity-50"></i>${t.project_title}
                     </span>` 
                    : '<span class="text-xs text-slate-300 dark:text-slate-600">-</span>'}
            </td>

            <!-- Assignee -->
            <td class="px-4 py-2 whitespace-nowrap">
                ${t.assignee ? 
                    `<div class="flex items-center text-xs text-slate-600 dark:text-slate-300" title="${t.assignee.last_name} ${t.assignee.first_name}">
                        <div class="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold mr-2 dark:bg-slate-700">
                            ${t.assignee.last_name.charAt(0)}
                        </div>
                        <span class="truncate max-w-[80px]">${t.assignee.last_name}</span>
                     </div>` 
                    : '<span class="text-xs text-slate-300 dark:text-slate-600">-</span>'}
            </td>

            <!-- Date -->
            <td class="px-4 py-2 whitespace-nowrap text-right">
                <span class="text-xs ${dateClass}">${t.due_date || '-'}</span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="editTask(${t.id})" class="p-1 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400"><i data-lucide="edit-2" class="w-3.5 h-3.5"></i></button>
            </td>
        </tr>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// --- 4. RENDER SIDEBAR ---
function renderSidebarFilters() {
    // A. Projects
    // Собираем уникальные проекты из задач (или можно брать Projects API, но для задач лучше брать используемые)
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
                    <span class="truncate">${p.title}</span>
                    <span class="text-slate-400 group-hover:text-slate-600 dark:text-slate-500">${p.count}</span>
                </button>
            </li>
        `).join('');
    }

    // B. Tags
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
                class="task-filter-btn px-2 py-1 rounded-full text-[10px] bg-slate-100 text-slate-600 border border-slate-200 hover:bg-white hover:border-primary-300 transition-colors dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                data-filter="tag-${name}">
                #${name}
            </button>
        `).join('');
    }
}

function updateSidebarActiveState() {
    document.querySelectorAll('.task-filter-btn').forEach(btn => {
        // Сброс стилей
        btn.classList.remove('bg-primary-50', 'text-primary-700', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        
        // Обычный стиль
        if (!btn.classList.contains('text-red-600')) { // Исключаем кнопку просроченных из стандартного сброса
           btn.classList.add('text-slate-600', 'dark:text-slate-300');
        }

        // Логика проверки
        let isActive = false;
        const dataFilter = btn.dataset.filter;
        
        if (state.filter.type === 'all' && dataFilter === 'all') isActive = true;
        else if (state.filter.type === 'my' && dataFilter === 'my') isActive = true;
        else if (state.filter.type === 'authored' && dataFilter === 'authored') isActive = true;
        else if (state.filter.type === 'overdue' && dataFilter === 'overdue') isActive = true;
        else if (state.filter.type === 'project' && dataFilter === `project-${state.filter.value}`) isActive = true;
        else if (state.filter.type === 'tag' && dataFilter === `tag-${state.filter.value}`) isActive = true;

        if (isActive) {
            btn.classList.remove('text-slate-600', 'hover:bg-slate-100', 'dark:text-slate-300');
            btn.classList.add('bg-primary-50', 'text-primary-700', 'dark:bg-primary-900/20', 'dark:text-primary-400');
        }
    });
}

// --- EXPORTS TO WINDOW ---
window.setTaskFilter = function(type, value = null) {
    state.filter.type = type;
    state.filter.value = value;
    state.filter.search = ''; // Сброс поиска при смене фильтра
    document.getElementById('taskLocalSearch').value = '';
    applyFiltersAndSort();
};

window.filterTasksLocal = function(val) {
    state.filter.search = val;
    applyFiltersAndSort();
};

window.sortTasks = function(field) {
    if (state.sort.field === field) {
        // Toggle direction
        state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sort.field = field;
        state.sort.direction = 'asc';
    }
    applyFiltersAndSort();
};

export { renderTasks };