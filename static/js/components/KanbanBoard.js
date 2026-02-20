/**
 * KanbanBoard — канбан-доска для задач с Drag & Drop.
 * Использует HTML5 Drag & Drop API (без внешних библиотек).
 */
import API from '../api.js';

let statuses = [];
let allTasks = [];
let onTaskUpdated = null;

async function init(tasks, callback) {
    allTasks = tasks;
    onTaskUpdated = callback;
    if (!statuses.length) {
        statuses = await API.getTaskStatuses();
    }
    render();
}

function updateTasks(tasks) {
    allTasks = tasks;
    render();
}

function render() {
    const container = document.getElementById('kanban-board');
    if (!container) return;

    container.innerHTML = statuses.map(status => {
        const columnTasks = allTasks.filter(t => t.status_id === status.id);

        const cardsHtml = columnTasks.map(t => {
            const isOverdue = t.due_date && new Date(t.due_date) < new Date().setHours(0,0,0,0) && status.name !== 'Готово';
            const tagsHtml = t.tags && t.tags.length
                ? `<div class="flex flex-wrap gap-1 mt-1.5">${t.tags.map(tag => `<span class="px-1 py-0.5 rounded text-[9px] bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">#${tag.name}</span>`).join('')}</div>`
                : '';

            return `
            <div class="kanban-card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow group"
                 draggable="true"
                 data-task-id="${t.id}"
                 data-status-id="${t.status_id}">
                <div class="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                     onclick="openTaskDetail(${t.id})">
                    ${t.title}
                </div>
                ${tagsHtml}
                <div class="flex items-center justify-between mt-2">
                    <div class="flex items-center gap-2">
                        ${t.assignee ? `
                        <div class="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <div class="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-[8px] font-bold">${t.assignee.last_name.charAt(0)}</div>
                            <span class="truncate max-w-[60px]">${t.assignee.last_name}</span>
                        </div>` : ''}
                        ${t.project_title ? `
                        <span class="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[80px]">${t.project_title}</span>` : ''}
                    </div>
                    ${t.due_date ? `
                    <span class="text-[10px] ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-400 dark:text-slate-500'}">${t.due_date}</span>` : ''}
                </div>
            </div>`;
        }).join('');

        return `
        <div class="kanban-column flex flex-col min-w-[260px] max-w-[320px] flex-1 bg-slate-50 dark:bg-slate-900 rounded-lg"
             data-status-id="${status.id}">
            <div class="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${status.color}"></span>
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">${status.name}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400 font-medium">${columnTasks.length}</span>
            </div>
            <div class="kanban-drop-zone flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar min-h-[100px]"
                 data-status-id="${status.id}">
                ${cardsHtml || '<div class="text-center text-xs text-slate-400 italic py-4">Пусто</div>'}
            </div>
        </div>`;
    }).join('');

    attachDragListeners();
    if (window.lucide) lucide.createIcons();
}

function attachDragListeners() {
    // Drag start
    document.querySelectorAll('.kanban-card').forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.taskId);
            e.dataTransfer.effectAllowed = 'move';
            card.classList.add('opacity-40');
            // Подсвечиваем зоны сброса
            setTimeout(() => {
                document.querySelectorAll('.kanban-drop-zone').forEach(zone => {
                    zone.classList.add('border-2', 'border-dashed', 'border-primary-300', 'dark:border-primary-700');
                });
            }, 0);
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('opacity-40');
            document.querySelectorAll('.kanban-drop-zone').forEach(zone => {
                zone.classList.remove('border-2', 'border-dashed', 'border-primary-300', 'dark:border-primary-700', 'bg-primary-50', 'dark:bg-primary-900/20');
            });
        });
    });

    // Drop zones
    document.querySelectorAll('.kanban-drop-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            zone.classList.add('bg-primary-50', 'dark:bg-primary-900/20');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('bg-primary-50', 'dark:bg-primary-900/20');
        });

        zone.addEventListener('drop', async (e) => {
            e.preventDefault();
            zone.classList.remove('bg-primary-50', 'dark:bg-primary-900/20');

            const taskId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStatusId = parseInt(zone.dataset.statusId);

            const task = allTasks.find(t => t.id === taskId);
            if (!task || task.status_id === newStatusId) return;

            // Оптимистичное обновление UI
            task.status_id = newStatusId;
            task.status = statuses.find(s => s.id === newStatusId);
            render();

            // Отправляем на сервер
            const success = await API.updateTask(taskId, { status_id: newStatusId });
            if (!success) {
                // Откатываем при ошибке
                if (onTaskUpdated) onTaskUpdated();
            } else {
                if (onTaskUpdated) onTaskUpdated();
            }
        });
    });
}

export default { init, updateTasks, render };
