import API from '../api.js';

export const ReportController = {
    init() {
        // Инициализация событий
        window.copyReportToClipboard = this.copyReportToClipboard.bind(this);
        window.applyReportDateFilter = this.applyReportDateFilter.bind(this);

        // Устанавливаем даты по умолчанию (последние 7 дней)
        this.initDateFilters();
    },

    initDateFilters() {
        const dateFromInput = document.getElementById('report-date-from');
        const dateToInput = document.getElementById('report-date-to');

        if (dateFromInput && dateToInput) {
            const today = new Date();
            const weekAgo = new Date();
            weekAgo.setDate(today.getDate() - 7);

            // Форматируем даты для input type="date" (YYYY-MM-DD)
            dateToInput.value = today.toISOString().split('T')[0];
            dateFromInput.value = weekAgo.toISOString().split('T')[0];
        }
    },

    async applyReportDateFilter() {
        const dateFrom = document.getElementById('report-date-from')?.value;
        const dateTo = document.getElementById('report-date-to')?.value;
        await this.loadWeeklyReport(dateFrom, dateTo);
    },

    async loadWeeklyReport(dateFrom = null, dateTo = null) {
        const container = document.getElementById('report-weekly-content');
        if (!container) return;

        // Если даты не переданы, берем из инпутов
        if (!dateFrom) dateFrom = document.getElementById('report-date-from')?.value;
        if (!dateTo) dateTo = document.getElementById('report-date-to')?.value;

        container.innerHTML = `<div class="text-center py-10 text-slate-400">Загрузка отчета...</div>`;

        const data = await API.getWeeklyReport(dateFrom, dateTo);
        if (!data) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Ошибка загрузки отчета</div>`;
            return;
        }

        // Обновляем заголовок с датами
        const dateRangeEl = document.getElementById('report-date-range');
        if (dateRangeEl) dateRangeEl.innerText = data.date_range;

        this.render(data);
    },

    render(data) {
        // Helper to render a list of tasks
        const renderList = (tasks, emptyText) => {
            if (!tasks || tasks.length === 0) {
                return `<div class="text-sm text-slate-400 italic py-2">${emptyText}</div>`;
            }
            return `<ul class="space-y-2">` + tasks.map(t => `
                <li class="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-start gap-2 hover:border-slate-300 transition-colors dark:bg-slate-800 dark:border-slate-700">
                    <div class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${t.status ? t.status.color : '#ccc'}"></div>
                    <div class="flex-grow min-w-0">
                        <div class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-primary-600" onclick="openTaskDetail(${t.id})">
                            ${t.title}
                        </div>
                        <div class="flex flex-wrap gap-2 text-xs text-slate-500 mt-1 dark:text-slate-400">
                            ${t.project_title ? `<span class="flex items-center"><i data-lucide="briefcase" class="w-3 h-3 mr-1 opacity-70"></i>${t.project_title}</span>` : ''}
                            ${t.assignee ? `<span class="flex items-center"><i data-lucide="user" class="w-3 h-3 mr-1 opacity-70"></i>${t.assignee.last_name}</span>` : ''}
                            ${t.due_date ? `<span class="flex items-center"><i data-lucide="calendar" class="w-3 h-3 mr-1 opacity-70"></i>${t.due_date}</span>` : ''}
                        </div>
                    </div>
                </li>
            `).join('') + `</ul>`;
        };

        // Helper for blocker tasks (with warning styling)
        const renderBlockerList = (tasks, emptyText, isOverdue = false) => {
            if (!tasks || tasks.length === 0) {
                return `<div class="text-sm text-slate-400 italic py-2">${emptyText}</div>`;
            }
            const borderColor = isOverdue ? 'border-red-200 dark:border-red-900/50' : 'border-orange-200 dark:border-orange-900/50';
            return `<ul class="space-y-2">` + tasks.map(t => `
                <li class="bg-white p-3 rounded border ${borderColor} shadow-sm flex items-start gap-2 hover:border-slate-300 transition-colors dark:bg-slate-800">
                    <div class="mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-orange-500'}"></div>
                    <div class="flex-grow min-w-0">
                        <div class="text-sm font-medium text-slate-800 dark:text-slate-200 truncate cursor-pointer hover:text-primary-600" onclick="openTaskDetail(${t.id})">
                            ${t.title}
                        </div>
                        <div class="flex flex-wrap gap-2 text-xs text-slate-500 mt-1 dark:text-slate-400">
                            ${t.project_title ? `<span class="flex items-center"><i data-lucide="briefcase" class="w-3 h-3 mr-1 opacity-70"></i>${t.project_title}</span>` : ''}
                            ${t.assignee ? `<span class="flex items-center"><i data-lucide="user" class="w-3 h-3 mr-1 opacity-70"></i>${t.assignee.last_name}</span>` : '<span class="text-orange-500 flex items-center"><i data-lucide="user-x" class="w-3 h-3 mr-1"></i>Нет исполнителя</span>'}
                            ${t.due_date ? `<span class="flex items-center ${isOverdue ? 'text-red-500 font-medium' : ''}"><i data-lucide="alert-triangle" class="w-3 h-3 mr-1"></i>${t.due_date}</span>` : ''}
                        </div>
                    </div>
                </li>
            `).join('') + `</ul>`;
        };

        // Helper for project breakdown
        const renderProjectBreakdown = (projects) => {
            if (!projects || projects.length === 0) {
                return `<div class="text-sm text-slate-400 italic py-2">Нет активных проектов</div>`;
            }
            return `<div class="space-y-3">` + projects.map(p => `
                <div class="bg-white p-3 rounded border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-slate-800 dark:text-slate-200 cursor-pointer hover:text-primary-600" onclick="openProjectDetail(${p.project_id})">${p.project_title}</span>
                        <span class="text-xs text-slate-500 dark:text-slate-400">${p.progress}%</span>
                    </div>
                    <div class="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-700">
                        <div class="bg-primary-500 h-2 rounded-full transition-all" style="width: ${p.progress}%"></div>
                    </div>
                    <div class="flex gap-3 mt-2 text-xs">
                        <span class="text-green-600 dark:text-green-400"><i data-lucide="check" class="w-3 h-3 inline mr-1"></i>${p.completed}</span>
                        <span class="text-blue-600 dark:text-blue-400"><i data-lucide="loader-2" class="w-3 h-3 inline mr-1"></i>${p.in_progress}</span>
                        <span class="text-slate-500 dark:text-slate-400"><i data-lucide="circle" class="w-3 h-3 inline mr-1"></i>${p.todo}</span>
                    </div>
                </div>
            `).join('') + `</div>`;
        };

        // Helper for team workload
        const renderTeamWorkload = (team) => {
            if (!team || team.length === 0) {
                return `<div class="text-sm text-slate-400 italic py-2">Нет данных</div>`;
            }
            return `<div class="space-y-2">` + team.map(member => {
                const name = member.contact ? `${member.contact.last_name} ${member.contact.first_name || ''}`.trim() : 'Неизвестный';
                const initial = member.contact?.last_name ? member.contact.last_name.charAt(0) : '?';
                return `
                <div class="bg-white p-3 rounded border border-slate-200 flex items-center justify-between dark:bg-slate-800 dark:border-slate-700">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold dark:bg-primary-900 dark:text-primary-200">${initial}</div>
                        <span class="text-sm font-medium text-slate-800 dark:text-slate-200">${name}</span>
                    </div>
                    <div class="flex gap-3 text-xs">
                        <span class="text-green-600 dark:text-green-400" title="Завершено"><i data-lucide="check-circle-2" class="w-4 h-4 inline mr-1"></i>${member.completed_count}</span>
                        <span class="text-blue-600 dark:text-blue-400" title="В работе"><i data-lucide="layers" class="w-4 h-4 inline mr-1"></i>${member.active_count}</span>
                    </div>
                </div>`;
            }).join('') + `</div>`;
        };

        const container = document.getElementById('report-weekly-content');

        // Calculate totals for blockers section header
        const blockersTotal = (data.blockers?.overdue?.length || 0) +
                              (data.blockers?.no_assignee?.length || 0) +
                              (data.blockers?.stuck?.length || 0);

        container.innerHTML = `
            <!-- ROW 1: Original 3 columns -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                <!-- COMPLETED -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="check-circle-2" class="w-5 h-5 mr-2 text-green-500"></i>
                        Сделано за неделю <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.completed.length}</span>
                    </h3>
                    ${renderList(data.completed, 'Нет завершенных задач')}
                </div>

                <!-- IN PROGRESS -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="loader-2" class="w-5 h-5 mr-2 text-blue-500 animate-spin-slow"></i>
                        В работе сейчас <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.in_progress.length}</span>
                    </h3>
                    ${renderList(data.in_progress, 'Нет задач в работе')}
                </div>

                <!-- NEW / CREATED -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="plus-square" class="w-5 h-5 mr-2 text-purple-500"></i>
                        Новые (Поступили) <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.created.length}</span>
                    </h3>
                    ${renderList(data.created, 'Нет новых задач')}
                </div>
            </div>

            <!-- ROW 2: Blockers and Risks (Full Width) -->
            <div class="mb-8">
                <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center mb-4 dark:text-slate-300">
                    <i data-lucide="alert-octagon" class="w-5 h-5 mr-2 text-red-500"></i>
                    Блокеры и риски <span class="ml-auto text-xs font-normal bg-red-100 px-2 py-0.5 rounded text-red-600 dark:bg-red-900/30 dark:text-red-400">${blockersTotal}</span>
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Overdue -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium text-red-600 flex items-center dark:text-red-400">
                            <i data-lucide="alert-triangle" class="w-4 h-4 mr-1"></i>
                            Просрочено <span class="ml-1 text-xs">(${data.blockers?.overdue?.length || 0})</span>
                        </h4>
                        ${renderBlockerList(data.blockers?.overdue, 'Нет просроченных', true)}
                    </div>
                    <!-- No Assignee -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium text-orange-600 flex items-center dark:text-orange-400">
                            <i data-lucide="user-x" class="w-4 h-4 mr-1"></i>
                            Без исполнителя <span class="ml-1 text-xs">(${data.blockers?.no_assignee?.length || 0})</span>
                        </h4>
                        ${renderBlockerList(data.blockers?.no_assignee, 'Все задачи назначены')}
                    </div>
                    <!-- Stuck -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium text-amber-600 flex items-center dark:text-amber-400">
                            <i data-lucide="clock" class="w-4 h-4 mr-1"></i>
                            Застряли (&gt;7 дней) <span class="ml-1 text-xs">(${data.blockers?.stuck?.length || 0})</span>
                        </h4>
                        ${renderBlockerList(data.blockers?.stuck, 'Нет застрявших задач')}
                    </div>
                </div>
            </div>

            <!-- ROW 3: Project Breakdown + Team Workload -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <!-- Project Breakdown -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="folder-kanban" class="w-5 h-5 mr-2 text-indigo-500"></i>
                        Разбивка по проектам <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.project_breakdown?.length || 0}</span>
                    </h3>
                    ${renderProjectBreakdown(data.project_breakdown)}
                </div>

                <!-- Team Workload -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="users" class="w-5 h-5 mr-2 text-teal-500"></i>
                        Нагрузка команды <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.team_workload?.length || 0}</span>
                    </h3>
                    ${renderTeamWorkload(data.team_workload)}
                </div>
            </div>

            <!-- ROW 4: Next Week Plans -->
            <div class="mb-8">
                <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center mb-4 dark:text-slate-300">
                    <i data-lucide="calendar-range" class="w-5 h-5 mr-2 text-cyan-500"></i>
                    Планы на следующую неделю
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Next Week Due -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium text-cyan-600 flex items-center dark:text-cyan-400">
                            <i data-lucide="calendar-check" class="w-4 h-4 mr-1"></i>
                            Запланировано <span class="ml-1 text-xs">(${data.next_week_plans?.next_week?.length || 0})</span>
                        </h4>
                        ${renderList(data.next_week_plans?.next_week, 'Нет задач на следующую неделю')}
                    </div>
                    <!-- Backlog Priority -->
                    <div class="space-y-2">
                        <h4 class="text-sm font-medium text-slate-600 flex items-center dark:text-slate-400">
                            <i data-lucide="inbox" class="w-4 h-4 mr-1"></i>
                            Из бэклога <span class="ml-1 text-xs">(${data.next_week_plans?.backlog_priority?.length || 0})</span>
                        </h4>
                        ${renderList(data.next_week_plans?.backlog_priority, 'Бэклог пуст')}
                    </div>
                </div>
            </div>

            <!-- EXPORT TEXT AREA (Hidden, used for copy) -->
            <textarea id="report-clipboard-source" class="hidden"></textarea>
        `;

        // Update clipboard text with new sections
        this.updateClipboardText(data);

        if (window.lucide) lucide.createIcons();
    },

    updateClipboardText(data) {
        const formatTxt = (title, list) => {
            if (!list || !list.length) return '';
            return `*${title}*\n` + list.map(t => `• ${t.title} [${t.project_title || 'Без проекта'}]`).join('\n') + `\n\n`;
        };

        const formatBlockers = (blockers) => {
            let text = '';
            if (blockers?.overdue?.length) {
                text += `  Просрочено:\n` + blockers.overdue.map(t => `  • ${t.title}`).join('\n') + '\n';
            }
            if (blockers?.no_assignee?.length) {
                text += `  Без исполнителя:\n` + blockers.no_assignee.map(t => `  • ${t.title}`).join('\n') + '\n';
            }
            if (blockers?.stuck?.length) {
                text += `  Застряли:\n` + blockers.stuck.map(t => `  • ${t.title}`).join('\n') + '\n';
            }
            return text ? `*Блокеры и риски:*\n${text}\n` : '';
        };

        const formatProjects = (projects) => {
            if (!projects || !projects.length) return '';
            return `*Проекты:*\n` + projects.map(p =>
                `• ${p.project_title}: ${p.completed}/${p.total} (${p.progress}%)`
            ).join('\n') + `\n\n`;
        };

        const formatTeam = (team) => {
            if (!team || !team.length) return '';
            return `*Команда:*\n` + team.map(m => {
                const name = m.contact ? `${m.contact.last_name}` : '?';
                return `• ${name}: завершено ${m.completed_count}, в работе ${m.active_count}`;
            }).join('\n') + `\n\n`;
        };

        const formatNextWeek = (plans) => {
            let text = '';
            if (plans?.next_week?.length) {
                text += plans.next_week.map(t => `• ${t.title} [${t.due_date || ''}]`).join('\n');
            }
            return text ? `*Планы на след. неделю:*\n${text}\n\n` : '';
        };

        const clipText =
            `Отчет ${data.date_range}\n\n` +
            formatTxt('Сделано:', data.completed) +
            formatTxt('В работе:', data.in_progress) +
            formatTxt('Новые:', data.created) +
            formatBlockers(data.blockers) +
            formatProjects(data.project_breakdown) +
            formatTeam(data.team_workload) +
            formatNextWeek(data.next_week_plans);

        document.getElementById('report-clipboard-source').value = clipText;
    },

    copyReportToClipboard() {
        const text = document.getElementById('report-clipboard-source').value;
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            alert('Текст отчета скопирован в буфер обмена!');
        }).catch(err => {
            console.error('Ошибка копирования', err);
        });
    }
};