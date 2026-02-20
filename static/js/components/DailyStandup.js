import API from '../api.js';

let standupData = null;
let viewMode = 'team'; // 'flat' (старый вид) или 'team' (группировка по команде)

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

        // Определяем режим: если есть self или team — показываем группировку
        const hasTeamData = data.self_contact || (data.team && data.team.length > 0);
        viewMode = hasTeamData ? 'team' : 'flat';

        if (viewMode === 'team') {
            this.renderTeamView(data);
        } else {
            this.renderFlatView(data);
        }

        this.renderMeetings(data.today_meetings);
        this.renderPreview(data);
        this.updateCounts(data);

        const genAt = document.getElementById('standup-generated-at');
        if (genAt) genAt.textContent = `Данные на ${data.generated_at}`;

        if (window.lucide) lucide.createIcons();
    },

    // ========= FLAT VIEW (старый вид без команды) =========
    renderFlatView(data) {
        const mainContainer = document.getElementById('standup-team-container');
        if (mainContainer) mainContainer.innerHTML = '';

        this.renderCompleted(data.completed);
        this.renderInProgress(data.in_progress);
        this.renderDueToday(data.due_today);
        this.renderOverdue(data.overdue);
        this.renderWaiting(data.waiting);
    },

    // ========= TEAM VIEW (группировка по людям) =========
    renderTeamView(data) {
        const container = document.getElementById('standup-team-container');
        if (!container) {
            // Fallback: если нет контейнера, рендерим flat
            this.renderFlatView(data);
            return;
        }

        let html = '';

        // Секция «Я»
        if (data.self_tasks && data.self_contact) {
            const selfName = [data.self_contact.last_name, data.self_contact.first_name].filter(Boolean).join(' ');
            const initial = data.self_contact.last_name ? data.self_contact.last_name.charAt(0).toUpperCase() : '?';
            html += this._renderPersonSection(initial, selfName, data.self_tasks, 'blue', true);
        }

        // Секции по членам команды
        if (data.team && data.team.length > 0) {
            data.team.forEach(member => {
                const name = [member.contact.last_name, member.contact.first_name].filter(Boolean).join(' ');
                const initial = member.contact.last_name ? member.contact.last_name.charAt(0).toUpperCase() : '?';
                const color = member.contact.type && member.contact.type.render_color ? member.contact.type.render_color : '#10b981';
                html += this._renderPersonSection(initial, name, member.tasks, 'green', false, member.contact.id, color);
            });
        }

        // Секция «Прочие»
        if (data.other_tasks) {
            const hasAny = Object.values(data.other_tasks).some(arr => arr.length > 0);
            if (hasAny) {
                html += this._renderPersonSection('...', 'Прочие', data.other_tasks, 'slate', false);
            }
        }

        if (!html) {
            html = this._emptyState('Нет данных для группировки. Отметьте контакт как «Я» и добавьте членов команды.');
        }

        container.innerHTML = html;

        // Скрываем старые flat-контейнеры при team view
        ['standup-completed', 'standup-in-progress', 'standup-due-today', 'standup-overdue', 'standup-waiting'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
    },

    _renderPersonSection(initial, name, tasks, accentColor, isSelf = false, contactId = null, typeColor = null) {
        const totalCount = Object.values(tasks).reduce((sum, arr) => sum + arr.length, 0);
        if (totalCount === 0) return '';

        const colorMap = {
            blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
            green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
            slate: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700' },
        };
        const colors = colorMap[accentColor] || colorMap.slate;
        const avatarBg = typeColor ? `background-color: ${typeColor}30; color: ${typeColor}` : '';
        const avatarClass = typeColor ? '' : `${colors.bg} ${colors.text}`;
        const clickHandler = contactId ? `onclick="openContactDetail(${contactId})"` : '';
        const cursorClass = contactId ? 'cursor-pointer hover:opacity-80' : '';

        let tasksHtml = '';

        // Завершённые
        if (tasks.completed && tasks.completed.length > 0) {
            tasksHtml += tasks.completed.map(t => this._taskRow(t, 'check-circle-2', 'text-green-500')).join('');
        }

        // В работе
        if (tasks.in_progress && tasks.in_progress.length > 0) {
            tasksHtml += tasks.in_progress.map(t => this._taskRow(t, 'loader-2', 'text-amber-500')).join('');
        }

        // Дедлайн сегодня
        if (tasks.due_today && tasks.due_today.length > 0) {
            tasksHtml += `<div class="text-[10px] uppercase tracking-wider font-bold text-blue-400 mt-1 mb-0.5 px-2.5">Дедлайн сегодня</div>`;
            tasksHtml += tasks.due_today.map(t => this._taskRow(t, 'clock', 'text-blue-500')).join('');
        }

        // Просрочено
        if (tasks.overdue && tasks.overdue.length > 0) {
            tasksHtml += `<div class="text-[10px] uppercase tracking-wider font-bold text-red-400 mt-1 mb-0.5 px-2.5">Просрочено</div>`;
            tasksHtml += tasks.overdue.map(t => this._taskRow(t, 'alert-triangle', 'text-red-500')).join('');
        }

        // Жду ответа
        if (tasks.waiting && tasks.waiting.length > 0) {
            tasksHtml += `<div class="text-[10px] uppercase tracking-wider font-bold text-purple-400 mt-1 mb-0.5 px-2.5">Жду ответа</div>`;
            tasksHtml += tasks.waiting.map(t => {
                const assignee = t.assignee ? `${t.assignee.last_name}` : '';
                return this._taskRow(t, 'clock', 'text-purple-500', assignee);
            }).join('');
        }

        const selfBadge = isSelf ? `<span class="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">Я</span>` : '';

        return `
        <div class="mb-4">
            <div class="flex items-center gap-2 mb-2 ${cursorClass}" ${clickHandler}>
                <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarClass}" ${avatarBg ? `style="${avatarBg}"` : ''}>
                    ${initial}
                </div>
                <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">${name}</span>
                ${selfBadge}
                <span class="text-[11px] text-slate-400 ml-auto">${totalCount} задач</span>
            </div>
            <div class="ml-2 border-l-2 ${colors.border} pl-2">
                ${tasksHtml}
            </div>
        </div>`;
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
        const hasTeam = data.self_contact || (data.team && data.team.length > 0);

        if (hasTeam) {
            return this._buildTeamChatText(data, today);
        }
        return this._buildFlatChatText(data, today);
    },

    _buildFlatChatText(data, today) {
        const lines = [];
        lines.push(`Дейлик ${today}`);
        lines.push('');

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

    _buildTeamChatText(data, today) {
        const lines = [];
        lines.push(`Дейлик ${today}`);
        lines.push('');

        const renderPersonTasks = (tasks, prefix) => {
            if (tasks.completed && tasks.completed.length > 0) {
                tasks.completed.forEach(t => {
                    const proj = t.project_title ? ` [${t.project_title}]` : '';
                    lines.push(`${prefix}done: ${t.title}${proj}`);
                });
            }
            if (tasks.in_progress && tasks.in_progress.length > 0) {
                tasks.in_progress.forEach(t => {
                    const proj = t.project_title ? ` [${t.project_title}]` : '';
                    lines.push(`${prefix}в работе: ${t.title}${proj}`);
                });
            }
            if (tasks.due_today && tasks.due_today.length > 0) {
                tasks.due_today.forEach(t => {
                    const proj = t.project_title ? ` [${t.project_title}]` : '';
                    lines.push(`${prefix}дедлайн сегодня: ${t.title}${proj}`);
                });
            }
            if (tasks.overdue && tasks.overdue.length > 0) {
                tasks.overdue.forEach(t => {
                    lines.push(`${prefix}ПРОСРОЧЕНО: ${t.title} (${t.due_date || '?'})`);
                });
            }
            if (tasks.waiting && tasks.waiting.length > 0) {
                tasks.waiting.forEach(t => {
                    const from = t.assignee ? ` (от: ${t.assignee.last_name})` : '';
                    lines.push(`${prefix}жду ответа: ${t.title}${from}`);
                });
            }
        };

        // Я
        if (data.self_tasks && data.self_contact) {
            const selfName = [data.self_contact.last_name, data.self_contact.first_name].filter(Boolean).join(' ');
            lines.push(`Я (${selfName}):`);
            renderPersonTasks(data.self_tasks, '  - ');
            lines.push('');
        }

        // Команда
        if (data.team && data.team.length > 0) {
            data.team.forEach(member => {
                const name = [member.contact.last_name, member.contact.first_name].filter(Boolean).join(' ');
                lines.push(`${name}:`);
                renderPersonTasks(member.tasks, '  - ');
                lines.push('');
            });
        }

        // Прочие
        if (data.other_tasks) {
            const hasAny = Object.values(data.other_tasks).some(arr => arr.length > 0);
            if (hasAny) {
                lines.push('Прочие:');
                renderPersonTasks(data.other_tasks, '  - ');
                lines.push('');
            }
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
