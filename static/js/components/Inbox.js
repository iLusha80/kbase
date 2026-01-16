import API from '../api.js';
import Dashboard from './Dashboard.js';

let inboxTasks = [];
let contacts = [];
let projects = [];

const Inbox = {
    async init() {
        await this.loadData();
        this.render();
    },

    async loadData() {
        const [tasks, contactsData, projectsData] = await Promise.all([
            API.getTasks(),
            API.getContacts(),
            API.getProjects()
        ]);

        contacts = contactsData || [];
        projects = projectsData || [];

        // Фильтруем задачи: нет исполнителя ИЛИ нет срока (и не завершены)
        inboxTasks = (tasks || []).filter(t => {
            const isDone = t.status && t.status.name === 'Готово';
            const needsAssignee = !t.assignee_id;
            const needsDueDate = !t.due_date;
            return !isDone && (needsAssignee || needsDueDate);
        });
    },

    getCount() {
        return inboxTasks.length;
    },

    render() {
        const container = document.getElementById('inbox-tasks-list');
        const emptyState = document.getElementById('inbox-empty');
        const countEl = document.getElementById('inbox-count');

        if (!container) return;

        if (countEl) {
            countEl.textContent = `${inboxTasks.length} задач`;
        }

        if (inboxTasks.length === 0) {
            container.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        container.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        container.innerHTML = inboxTasks.map(task => this.renderTaskCard(task)).join('');

        if (window.lucide) lucide.createIcons();
        this.bindEvents();
    },

    renderTaskCard(task) {
        const needsAssignee = !task.assignee_id;
        const needsDueDate = !task.due_date;

        // Status badge
        const statusHtml = task.status ? `
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                style="background-color: ${task.status.color}15; color: ${task.status.color};">
                ${task.status.name}
            </span>` : '';

        // Missing fields indicators
        const missingHtml = [];
        if (needsAssignee) {
            missingHtml.push(`<span class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <i data-lucide="user" class="w-3 h-3"></i> Нет исполнителя
            </span>`);
        }
        if (needsDueDate) {
            missingHtml.push(`<span class="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <i data-lucide="calendar" class="w-3 h-3"></i> Нет срока
            </span>`);
        }

        // Assignee select options
        const assigneeOptions = `<option value="">Выберите исполнителя</option>` +
            contacts.map(c => `<option value="${c.id}" ${task.assignee_id === c.id ? 'selected' : ''}>${c.last_name} ${c.first_name || ''}</option>`).join('');

        // Project select options
        const projectOptions = `<option value="">Без проекта</option>` +
            projects.map(p => `<option value="${p.id}" ${task.project_id === p.id ? 'selected' : ''}>${p.title}</option>`).join('');

        return `
        <div class="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow dark:bg-slate-800 dark:border-slate-700" data-task-id="${task.id}">
            <div class="flex items-start gap-3">
                <!-- Checkbox -->
                <button onclick="Inbox.completeTask(${task.id})"
                    class="mt-1 w-5 h-5 rounded border-2 border-slate-300 hover:border-green-500 hover:bg-green-50 flex-shrink-0 flex items-center justify-center transition-all dark:border-slate-600 dark:hover:border-green-400 dark:hover:bg-green-900/30"
                    title="Отметить как готово">
                </button>

                <div class="flex-1 min-w-0">
                    <!-- Header -->
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex items-center gap-2 flex-wrap">
                            ${statusHtml}
                            <h3 class="font-medium text-slate-900 dark:text-white cursor-pointer hover:text-primary-600 transition-colors" onclick="openTaskDetail(${task.id})">
                                ${task.title}
                            </h3>
                        </div>
                        <button onclick="editTask(${task.id})" class="text-slate-400 hover:text-primary-600 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <!-- Missing indicators -->
                    <div class="flex items-center gap-3 mb-3">
                        ${missingHtml.join('')}
                    </div>

                    <!-- Inline Edit Fields -->
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <!-- Assignee -->
                        <div>
                            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1 block">Исполнитель</label>
                            <select onchange="Inbox.updateField(${task.id}, 'assignee_id', this.value)"
                                class="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white ${needsAssignee ? 'border-amber-300 dark:border-amber-600' : ''}">
                                ${assigneeOptions}
                            </select>
                        </div>

                        <!-- Due Date -->
                        <div>
                            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1 block">Срок</label>
                            <input type="date" value="${task.due_date || ''}"
                                onchange="Inbox.updateField(${task.id}, 'due_date', this.value)"
                                class="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white ${needsDueDate ? 'border-amber-300 dark:border-amber-600' : ''}">
                        </div>

                        <!-- Project -->
                        <div>
                            <label class="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1 block">Проект</label>
                            <select onchange="Inbox.updateField(${task.id}, 'project_id', this.value)"
                                class="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                                ${projectOptions}
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    bindEvents() {
        // События уже привязаны через inline handlers
    },

    async updateField(taskId, field, value) {
        const data = {};
        data[field] = value || null;

        const success = await API.updateTask(taskId, data);
        if (success) {
            // Обновляем локально
            const task = inboxTasks.find(t => t.id === taskId);
            if (task) {
                task[field] = value || null;

                // Проверяем, остаётся ли задача в inbox
                const stillNeeds = !task.assignee_id || !task.due_date;
                if (!stillNeeds) {
                    // Задача полностью заполнена - удаляем из inbox с анимацией
                    const card = document.querySelector(`[data-task-id="${taskId}"]`);
                    if (card) {
                        card.classList.add('opacity-0', 'scale-95', 'transition-all', 'duration-300');
                        setTimeout(() => {
                            inboxTasks = inboxTasks.filter(t => t.id !== taskId);
                            this.render();
                            this.updateBadge();
                        }, 300);
                    }
                } else {
                    // Просто перерисовываем карточку
                    this.render();
                }
            }
            Dashboard.init();
        }
    },

    async completeTask(taskId) {
        const taskStatuses = await window.api.getTaskStatuses();
        const doneStatus = taskStatuses.find(s => s.name === 'Готово');
        if (!doneStatus) return;

        const success = await API.updateTask(taskId, { status_id: doneStatus.id });
        if (success) {
            // Удаляем из inbox с анимацией
            const card = document.querySelector(`[data-task-id="${taskId}"]`);
            if (card) {
                card.classList.add('opacity-0', 'scale-95', 'transition-all', 'duration-300');
                setTimeout(async () => {
                    await this.init();
                    this.updateBadge();
                }, 300);
            }
            Dashboard.init();
        }
    },

    updateBadge() {
        if (window.updateInboxBadge) {
            window.updateInboxBadge();
        } else {
            const badge = document.getElementById('inbox-badge');
            if (badge) {
                if (inboxTasks.length > 0) {
                    badge.textContent = inboxTasks.length;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
        }
    }
};

// Экспортируем для использования в inline handlers
window.Inbox = Inbox;

export default Inbox;
