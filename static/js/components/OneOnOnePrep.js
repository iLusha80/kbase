/**
 * OneOnOnePrep — экран подготовки к 1-1 с руководителем.
 * Автосбор: прогресс по проектам, достижения, риски, история встреч.
 */
import API from '../api.js';

let prepData = null;

const OneOnOnePrep = {
    async init() {
        await this.loadData();
    },

    async refresh() {
        await this.loadData();
    },

    async loadData() {
        const data = await API.getOneOnOnePrep();
        if (!data) return;
        prepData = data;

        this.renderProjects(data.projects_progress);
        this.renderCompleted(data.completed_this_week);
        this.renderRisks(data.overdue_tasks, data.waiting_tasks);
        this.renderQuestions(data.questions);
        this.renderHistory(data.past_one_on_ones);
        this.renderPreview(data);

        const genAt = document.getElementById('oo-generated-at');
        if (genAt) genAt.textContent = `Данные на ${data.generated_at}`;

        if (window.lucide) lucide.createIcons();
    },

    renderProjects(projects) {
        const container = document.getElementById('oo-projects');
        if (!container) return;
        if (!projects || projects.length === 0) {
            container.innerHTML = this._emptyState('Нет активных проектов');
            return;
        }
        container.innerHTML = projects.map(p => {
            const barColor = p.overdue_tasks > 0 ? 'bg-red-500' : 'bg-primary-500';
            return `
            <div onclick="openProjectDetail(${p.id})" class="p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 cursor-pointer transition-colors group">
                <div class="flex justify-between items-start mb-2">
                    <div class="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">${p.title}</div>
                    <span class="text-xs font-bold text-slate-500 ml-2 flex-shrink-0">${p.progress_pct}%</span>
                </div>
                <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mb-2">
                    <div class="${barColor} h-1.5 rounded-full transition-all" style="width: ${p.progress_pct}%"></div>
                </div>
                <div class="flex gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>${p.done_tasks}/${p.total_tasks} готово</span>
                    <span>${p.active_tasks} в работе</span>
                    ${p.overdue_tasks > 0 ? `<span class="text-red-500 font-bold">${p.overdue_tasks} просрочено</span>` : ''}
                </div>
            </div>`;
        }).join('');
    },

    renderCompleted(tasks) {
        const container = document.getElementById('oo-completed');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            container.innerHTML = this._emptyState('Нет завершённых задач за неделю');
            return;
        }
        container.innerHTML = tasks.map(t => this._taskRow(t, 'check-circle-2', 'text-green-500')).join('');
    },

    renderRisks(overdue, waiting) {
        const container = document.getElementById('oo-risks');
        if (!container) return;
        const all = [...(overdue || []), ...(waiting || [])];
        if (all.length === 0) {
            container.innerHTML = this._emptyState('Нет рисков и блокеров');
            return;
        }
        let html = '';
        if (overdue && overdue.length > 0) {
            html += `<div class="text-[10px] uppercase tracking-wider font-bold text-red-400 mb-1">Просрочено</div>`;
            html += overdue.map(t => this._taskRow(t, 'alert-triangle', 'text-red-500')).join('');
        }
        if (waiting && waiting.length > 0) {
            html += `<div class="text-[10px] uppercase tracking-wider font-bold text-purple-400 mt-2 mb-1">Жду ответа</div>`;
            html += waiting.map(t => {
                const assignee = t.assignee ? t.assignee.last_name : '';
                return this._taskRow(t, 'clock', 'text-purple-500', assignee);
            }).join('');
        }
        container.innerHTML = html;
    },

    renderQuestions(questions) {
        const container = document.getElementById('oo-questions');
        if (!container) return;
        if (!questions || questions.length === 0) {
            container.innerHTML = this._emptyState('Нет открытых вопросов');
            return;
        }
        container.innerHTML = questions.map(t => this._taskRow(t, 'help-circle', 'text-amber-500')).join('');
    },

    renderHistory(meetings) {
        const container = document.getElementById('oo-history');
        if (!container) return;
        if (!meetings || meetings.length === 0) {
            container.innerHTML = this._emptyState('Нет прошлых 1-1 встреч');
            return;
        }
        container.innerHTML = meetings.map(m => {
            const noteCount = m.meeting_notes_count || 0;
            const actionCount = m.action_items_count || 0;
            const actionDone = m.action_items_done || 0;
            return `
            <div onclick="MeetingController.openMeetingDetail(${m.id})" class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group">
                <div class="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                    <i data-lucide="message-circle" class="w-4 h-4 text-violet-600 dark:text-violet-400"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        ${m.title || '1-1'} &mdash; ${m.date}
                    </div>
                    <div class="text-[11px] text-slate-400 flex items-center gap-3">
                        ${noteCount > 0 ? `<span>${noteCount} заметок</span>` : ''}
                        ${actionCount > 0 ? `<span>${actionDone}/${actionCount} действий</span>` : ''}
                        ${m.summary ? '<span class="text-green-500">Есть итоги</span>' : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    renderPreview(data) {
        const container = document.getElementById('oo-preview');
        if (!container) return;
        container.textContent = this._buildText(data);
    },

    _buildText(data) {
        const lines = [];
        const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        lines.push(`Подготовка к 1-1 (${today})`);
        lines.push('');

        // Проекты
        lines.push('ПРОГРЕСС ПО ПРОЕКТАМ:');
        if (data.projects_progress.length > 0) {
            data.projects_progress.forEach(p => {
                const risk = p.overdue_tasks > 0 ? ` [!${p.overdue_tasks} просрочено]` : '';
                lines.push(`  - ${p.title}: ${p.progress_pct}% (${p.done_tasks}/${p.total_tasks})${risk}`);
            });
        } else {
            lines.push('  - Нет активных проектов');
        }
        lines.push('');

        // Достижения
        lines.push('ДОСТИЖЕНИЯ ЗА НЕДЕЛЮ:');
        if (data.completed_this_week.length > 0) {
            data.completed_this_week.forEach(t => {
                const proj = t.project_title ? ` [${t.project_title}]` : '';
                lines.push(`  - ${t.title}${proj}`);
            });
        } else {
            lines.push('  - (нет)');
        }
        lines.push('');

        // Риски
        const hasRisks = data.overdue_tasks.length > 0 || data.waiting_tasks.length > 0;
        lines.push('РИСКИ И БЛОКЕРЫ:');
        if (hasRisks) {
            data.overdue_tasks.forEach(t => {
                lines.push(`  - [ПРОСРОЧЕНО] ${t.title} (дедлайн: ${t.due_date || '?'})`);
            });
            data.waiting_tasks.forEach(t => {
                const from = t.assignee ? ` (от: ${t.assignee.last_name})` : '';
                lines.push(`  - [ЖДУ ОТВЕТА] ${t.title}${from}`);
            });
        } else {
            lines.push('  - Нет');
        }
        lines.push('');

        // Вопросы
        if (data.questions.length > 0) {
            lines.push('ВОПРОСЫ К РУКОВОДИТЕЛЮ:');
            data.questions.forEach(t => {
                lines.push(`  - ${t.title}`);
            });
        }

        return lines.join('\n');
    },

    copyForChat() {
        if (!prepData) return;
        const text = this._buildText(prepData);
        navigator.clipboard.writeText(text).then(() => {
            const toast = document.getElementById('oo-copy-toast');
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
            ? `<span class="text-[11px] text-slate-400">${t.due_date}</span>`
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

export default OneOnOnePrep;
