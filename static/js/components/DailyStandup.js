import API from '../api.js';

let standupData = null;

const DailyStandup = {
    async init() {
        await this.loadData();
    },

    async refresh() {
        await this.loadData();
    },

    async loadData() {
        const data = await API.getDailyStandup();
        if (!data) return;
        standupData = data;

        this.renderCompleted(data.completed);
        this.renderInProgress(data.in_progress);
        this.renderDueToday(data.due_today);
        this.renderOverdue(data.overdue);
        this.renderWaiting(data.waiting);
        this.renderMeetings(data.today_meetings);
        this.renderPreview(data);
        this.updateCounts(data);

        const genAt = document.getElementById('standup-generated-at');
        if (genAt) genAt.textContent = `Данные на ${data.generated_at}`;

        if (window.lucide) lucide.createIcons();
    },

    updateCounts(data) {
        const setCount = (id, count) => {
            const el = document.getElementById(id);
            if (el) el.textContent = count > 0 ? count : '';
        };
        setCount('standup-completed-count', data.completed.length);
        setCount('standup-plan-count', data.in_progress.length + data.due_today.length);
        setCount('standup-blockers-count', data.overdue.length + data.waiting.length);
        setCount('standup-meetings-count', data.today_meetings.length);
    },

    renderCompleted(tasks) {
        const container = document.getElementById('standup-completed');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            container.innerHTML = this._emptyState('Нет завершённых задач за 24ч');
            return;
        }
        container.innerHTML = tasks.map(t => this._taskRow(t, 'check-circle-2', 'text-green-500')).join('');
    },

    renderInProgress(tasks) {
        const container = document.getElementById('standup-in-progress');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            container.innerHTML = this._emptyState('Нет задач в работе');
            return;
        }
        container.innerHTML = tasks.map(t => this._taskRow(t, 'loader-2', 'text-amber-500')).join('');
    },

    renderDueToday(tasks) {
        const container = document.getElementById('standup-due-today');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <div class="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-slate-500 mt-2 mb-1">Дедлайн сегодня</div>
            ${tasks.map(t => this._taskRow(t, 'clock', 'text-blue-500')).join('')}
        `;
    },

    renderOverdue(tasks) {
        const container = document.getElementById('standup-overdue');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <div class="text-[10px] uppercase tracking-wider font-bold text-red-400 mb-1">Просрочено</div>
            ${tasks.map(t => this._taskRow(t, 'alert-triangle', 'text-red-500')).join('')}
        `;
    },

    renderWaiting(tasks) {
        const container = document.getElementById('standup-waiting');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            // Если и overdue пуст — покажем общее "нет блокеров"
            const overdue = document.getElementById('standup-overdue');
            if (overdue && overdue.innerHTML === '') {
                container.innerHTML = this._emptyState('Нет блокеров. Все чисто!');
            } else {
                container.innerHTML = '';
            }
            return;
        }
        container.innerHTML = `
            <div class="text-[10px] uppercase tracking-wider font-bold text-purple-400 mb-1">Жду ответа</div>
            ${tasks.map(t => {
                const assignee = t.assignee ? `${t.assignee.last_name}` : '';
                return this._taskRow(t, 'clock', 'text-purple-500', assignee);
            }).join('')}
        `;
    },

    renderMeetings(meetings) {
        const container = document.getElementById('standup-meetings');
        if (!container) return;
        if (!meetings || meetings.length === 0) {
            container.innerHTML = this._emptyState('Нет встреч на сегодня');
            return;
        }
        container.innerHTML = meetings.map(m => {
            const time = m.time || '';
            const typeName = m.type ? m.type.name : '';
            const typeColor = m.type ? m.type.color : '#6366f1';
            const title = m.title || typeName || 'Без названия';
            const notesCount = m.meeting_notes_count || 0;
            return `
            <div onclick="MeetingController.openMeetingDetail(${m.id})" class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background-color: ${typeColor}20; color: ${typeColor}">
                    <i data-lucide="calendar" class="w-4 h-4"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">${title}</div>
                    <div class="text-[11px] text-slate-400 flex items-center gap-2">
                        ${time ? `<span>${time}</span>` : ''}
                        ${typeName ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-medium" style="background-color: ${typeColor}15; color: ${typeColor}">${typeName}</span>` : ''}
                        ${m.participants_count ? `<span>${m.participants_count} уч.</span>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    renderPreview(data) {
        const container = document.getElementById('standup-preview');
        if (!container) return;
        container.textContent = this._buildChatText(data);
    },

    _buildChatText(data) {
        const lines = [];
        const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        lines.push(`Дейлик ${today}`);
        lines.push('');

        // Что сделал
        lines.push('Что сделал:');
        if (data.completed.length > 0) {
            data.completed.forEach(t => {
                const proj = t.project_title ? ` [${t.project_title}]` : '';
                lines.push(`  - ${t.title}${proj}`);
            });
        } else {
            lines.push('  - (нет завершённых)');
        }
        lines.push('');

        // Что планирую
        lines.push('Что планирую:');
        const planned = [...data.in_progress, ...data.due_today];
        if (planned.length > 0) {
            planned.forEach(t => {
                const proj = t.project_title ? ` [${t.project_title}]` : '';
                lines.push(`  - ${t.title}${proj}`);
            });
        } else {
            lines.push('  - (нет запланированных)');
        }
        lines.push('');

        // Блокеры
        const blockers = [...data.overdue, ...data.waiting];
        lines.push('Блокеры:');
        if (blockers.length > 0) {
            data.overdue.forEach(t => {
                lines.push(`  - [ПРОСРОЧЕНО] ${t.title} (дедлайн: ${t.due_date || '?'})`);
            });
            data.waiting.forEach(t => {
                const from = t.assignee ? ` (от: ${t.assignee.last_name})` : '';
                lines.push(`  - [ЖДУ ОТВЕТА] ${t.title}${from}`);
            });
        } else {
            lines.push('  - Нет');
        }

        return lines.join('\n');
    },

    copyForChat() {
        if (!standupData) return;
        const text = this._buildChatText(standupData);
        navigator.clipboard.writeText(text).then(() => {
            const toast = document.getElementById('standup-copy-toast');
            if (toast) {
                toast.classList.remove('hidden');
                setTimeout(() => toast.classList.add('hidden'), 2000);
            }
        });
    },

    _taskRow(t, icon, iconColor, extra = '') {
        const proj = t.project_title
            ? `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">${t.project_title}</span>`
            : '';
        const dueHtml = t.due_date
            ? `<span class="text-[11px] text-slate-400">${t.due_date.split('-').reverse().slice(0, 2).join('.')}</span>`
            : '';
        const extraHtml = extra
            ? `<span class="text-[11px] text-slate-400">${extra}</span>`
            : '';
        return `
        <div onclick="openTaskDetail(${t.id})" class="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
            <i data-lucide="${icon}" class="w-4 h-4 ${iconColor} flex-shrink-0"></i>
            <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-slate-700 dark:text-slate-200 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400">${t.title}</div>
                <div class="flex items-center gap-2 mt-0.5">${proj} ${dueHtml} ${extraHtml}</div>
            </div>
        </div>`;
    },

    _emptyState(text) {
        return `<div class="text-center text-xs text-slate-400 py-4 border border-dashed border-slate-200 rounded-lg dark:border-slate-700 dark:text-slate-500">${text}</div>`;
    }
};

export default DailyStandup;
