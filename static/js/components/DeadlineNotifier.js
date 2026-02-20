import API from '../api.js';

const DISMISSED_KEY = 'deadline_notifier_dismissed';

const DeadlineNotifier = {
    async check() {
        // Не показывать повторно в рамках одной сессии (до перезагрузки страницы)
        const dismissed = sessionStorage.getItem(DISMISSED_KEY);
        if (dismissed) return;

        const tasks = await API.getTasks();
        if (!tasks || tasks.length === 0) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const overdue = [];
        const dueToday = [];

        tasks.forEach(t => {
            if (!t.due_date) return;
            if (t.status && t.status.name === 'Готово') return;

            const due = new Date(t.due_date);
            due.setHours(0, 0, 0, 0);

            if (due < today) {
                overdue.push(t);
            } else if (due.getTime() === today.getTime()) {
                dueToday.push(t);
            }
        });

        if (overdue.length === 0 && dueToday.length === 0) return;

        this.showBanner(overdue, dueToday);
    },

    showBanner(overdue, dueToday) {
        // Удаляем старый баннер если есть
        const old = document.getElementById('deadline-notifier');
        if (old) old.remove();

        const total = overdue.length + dueToday.length;

        let itemsHtml = '';

        if (overdue.length > 0) {
            const items = overdue.slice(0, 3).map(t =>
                `<div onclick="openTaskDetail(${t.id})" class="flex items-center gap-2 cursor-pointer hover:bg-red-100/50 dark:hover:bg-red-900/30 px-2 py-1 rounded transition-colors">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-red-500 flex-shrink-0"></i>
                    <span class="text-sm text-slate-700 dark:text-slate-200 truncate">${t.title}</span>
                    <span class="text-[10px] text-red-500 flex-shrink-0 font-medium">${t.due_date.split('-').reverse().slice(0, 2).join('.')}</span>
                </div>`
            ).join('');
            const moreHtml = overdue.length > 3 ? `<div class="text-[11px] text-slate-400 pl-6">...и ещё ${overdue.length - 3}</div>` : '';
            itemsHtml += `
                <div class="mb-2">
                    <div class="text-[10px] uppercase tracking-wider font-bold text-red-500 mb-1">Просрочено (${overdue.length})</div>
                    ${items}
                    ${moreHtml}
                </div>`;
        }

        if (dueToday.length > 0) {
            const items = dueToday.slice(0, 3).map(t =>
                `<div onclick="openTaskDetail(${t.id})" class="flex items-center gap-2 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/30 px-2 py-1 rounded transition-colors">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-500 flex-shrink-0"></i>
                    <span class="text-sm text-slate-700 dark:text-slate-200 truncate">${t.title}</span>
                </div>`
            ).join('');
            const moreHtml = dueToday.length > 3 ? `<div class="text-[11px] text-slate-400 pl-6">...и ещё ${dueToday.length - 3}</div>` : '';
            itemsHtml += `
                <div>
                    <div class="text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 mb-1">Дедлайн сегодня (${dueToday.length})</div>
                    ${items}
                    ${moreHtml}
                </div>`;
        }

        const borderColor = overdue.length > 0 ? 'border-red-300 dark:border-red-800' : 'border-amber-300 dark:border-amber-800';
        const bgColor = overdue.length > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-amber-50 dark:bg-amber-950/30';
        const iconColor = overdue.length > 0 ? 'text-red-500' : 'text-amber-500';

        const banner = document.createElement('div');
        banner.id = 'deadline-notifier';
        banner.className = `fixed top-20 right-4 z-50 w-80 ${bgColor} border ${borderColor} rounded-xl shadow-lg p-4 animate-slide-in`;
        banner.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <i data-lucide="bell-ring" class="w-5 h-5 ${iconColor}"></i>
                    <span class="text-sm font-bold text-slate-800 dark:text-white">${total} ${this._pluralize(total)} требует внимания</span>
                </div>
                <button onclick="DeadlineNotifier.dismiss()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            ${itemsHtml}
        `;

        document.body.appendChild(banner);

        // Добавим стиль анимации если ещё нет
        if (!document.getElementById('deadline-notifier-style')) {
            const style = document.createElement('style');
            style.id = 'deadline-notifier-style';
            style.textContent = `
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
                .animate-slide-in { animation: slideIn 0.3s ease-out; }
                .animate-slide-out { animation: slideOut 0.3s ease-in forwards; }
            `;
            document.head.appendChild(style);
        }

        if (window.lucide) lucide.createIcons();

        // Автоскрытие через 15 секунд
        setTimeout(() => this.dismiss(), 15000);
    },

    dismiss() {
        const banner = document.getElementById('deadline-notifier');
        if (banner) {
            banner.classList.remove('animate-slide-in');
            banner.classList.add('animate-slide-out');
            setTimeout(() => banner.remove(), 300);
        }
        sessionStorage.setItem(DISMISSED_KEY, '1');
    },

    _pluralize(n) {
        if (n % 10 === 1 && n % 100 !== 11) return 'задача';
        if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'задачи';
        return 'задач';
    }
};

export default DeadlineNotifier;
