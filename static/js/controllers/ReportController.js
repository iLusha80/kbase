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
        const renderList = (tasks, emptyText, iconColor) => {
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
                        </div>
                    </div>
                </li>
            `).join('') + `</ul>`;
        };

        const container = document.getElementById('report-weekly-content');
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <!-- COMPLETED -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="check-circle-2" class="w-5 h-5 mr-2 text-green-500"></i>
                        Сделано за неделю <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.completed.length}</span>
                    </h3>
                    ${renderList(data.completed, 'Нет завершенных задач', '#22c55e')}
                </div>

                <!-- IN PROGRESS -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="loader-2" class="w-5 h-5 mr-2 text-blue-500 animate-spin-slow"></i>
                        В работе сейчас <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.in_progress.length}</span>
                    </h3>
                    ${renderList(data.in_progress, 'Нет задач в работе', '#3b82f6')}
                </div>

                <!-- NEW / CREATED -->
                <div class="space-y-3">
                    <h3 class="font-bold text-slate-700 border-b pb-2 flex items-center dark:text-slate-300">
                        <i data-lucide="plus-square" class="w-5 h-5 mr-2 text-purple-500"></i>
                        Новые (Поступили) <span class="ml-auto text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${data.created.length}</span>
                    </h3>
                    ${renderList(data.created, 'Нет новых задач', '#a855f7')}
                </div>
            </div>
            
            <!-- EXPORT TEXT AREA (Hidden mostly, used for copy) -->
            <textarea id="report-clipboard-source" class="hidden"></textarea>
        `;

        // Prepare text for clipboard
        const formatTxt = (title, list) => {
            if (!list.length) return '';
            return `*${title}*\n` + list.map(t => `• ${t.title} [${t.project_title || 'No Project'}]`).join('\n') + `\n\n`;
        };

        const clipText = 
            `📅 Отчет ${data.date_range}\n\n` +
            formatTxt('✅ Сделано:', data.completed) +
            formatTxt('🚧 В работе:', data.in_progress) +
            formatTxt('📥 Новые:', data.created);
        
        document.getElementById('report-clipboard-source').value = clipText;

        if (window.lucide) lucide.createIcons();
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