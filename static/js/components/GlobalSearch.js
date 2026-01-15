import API from '../api.js';

const GlobalSearch = {
    init() {
        const input = document.getElementById('globalHeaderSearch');
        const resultsContainer = document.getElementById('globalHeaderSearchResults');
        
        if (!input || !resultsContainer) return;

        // 1. Определение ОС для правильной подсказки
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKeySymbol = isMac ? '⌘' : 'Ctrl';
        input.placeholder = `Поиск (${modKeySymbol}K)...`;

        let debounceTimer;

        input.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            clearTimeout(debounceTimer);

            // Для поиска по тегам (#) достаточно 1 символа, для обычного - 2
            const minLength = val.startsWith('#') ? 1 : 2;

            if (val.length < minLength) {
                resultsContainer.classList.add('hidden');
                resultsContainer.innerHTML = '';
                return;
            }

            debounceTimer = setTimeout(async () => {
                const data = await API.search(val);
                this.renderSearchResults(data, resultsContainer);
            }, 300);
        });

        input.addEventListener('focus', () => {
            const val = input.value.trim();
            const minLength = val.startsWith('#') ? 1 : 2;
            if (val.length >= minLength && resultsContainer.children.length > 0) {
                resultsContainer.classList.remove('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });

        // 2. Исправление горячей клавиши (e.code работает на любой раскладке)
        document.addEventListener('keydown', (e) => {
            // Проверяем нажатие Cmd (Mac) или Ctrl (PC) + физическую клавишу K
            if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
                e.preventDefault();
                input.focus();
            }
        });
    },

    renderSearchResults(data, container) {
        let html = '';
        const hasTasks = data.tasks && data.tasks.length > 0;
        const hasProjects = data.projects && data.projects.length > 0;
        const hasContacts = data.contacts && data.contacts.length > 0;
        const hasTagSuggestions = data.tag_suggestions && data.tag_suggestions.length > 0;

        if (!hasTasks && !hasProjects && !hasContacts && !hasTagSuggestions) {
            container.innerHTML = `<div class="p-4 text-sm text-center text-slate-500 dark:text-slate-400">Ничего не найдено</div>`;
            container.classList.remove('hidden');
            return;
        }

        // Подсказки по тегам (при поиске по #)
        if (hasTagSuggestions) {
            html += `<div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300">Теги</div>`;
            html += `<div class="px-3 py-2 flex flex-wrap gap-2">`;
            html += data.tag_suggestions.map(tag => `
                <span onclick="document.getElementById('globalHeaderSearch').value = '#${tag.name}'; document.getElementById('globalHeaderSearch').dispatchEvent(new Event('input'));"
                      class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 transition-colors dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/50">
                    <i data-lucide="hash" class="w-3 h-3 mr-1"></i>${tag.name}
                </span>
            `).join('');
            html += `</div>`;
        }

        if (hasProjects) {
            html += `<div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 ${hasTagSuggestions ? 'border-t border-slate-100 dark:border-slate-700' : ''} dark:bg-slate-700/50 dark:text-slate-300">Проекты</div>`;
            html += data.projects.map(p => `
                <div onclick="openProjectDetail(${p.id}); document.getElementById('globalHeaderSearchResults').classList.add('hidden');"
                     class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center transition-colors dark:hover:bg-slate-700">
                    <i data-lucide="briefcase" class="w-4 h-4 mr-3 text-slate-400"></i>
                    <span class="text-sm font-medium text-slate-800 dark:text-slate-200">${p.title}</span>
                </div>
            `).join('');
        }

        if (hasContacts) {
            html += `<div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-t border-slate-100 dark:bg-slate-700/50 dark:border-slate-700 dark:text-slate-300">Контакты</div>`;
            html += data.contacts.map(c => `
                <div onclick="openContactDetail(${c.id}); document.getElementById('globalHeaderSearchResults').classList.add('hidden');"
                     class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center transition-colors dark:hover:bg-slate-700">
                    <i data-lucide="user" class="w-4 h-4 mr-3 text-slate-400"></i>
                    <div>
                        <div class="text-sm text-slate-800 dark:text-slate-200">${c.last_name} ${c.first_name || ''}</div>
                        ${c.role ? `<div class="text-xs text-slate-500">${c.role}</div>` : ''}
                    </div>
                </div>
            `).join('');
        }

        if (hasTasks) {
            html += `<div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-t border-slate-100 dark:bg-slate-700/50 dark:border-slate-700 dark:text-slate-300">Задачи</div>`;
            html += data.tasks.map(t => `
                <div onclick="openTaskDetail(${t.id}); document.getElementById('globalHeaderSearchResults').classList.add('hidden');"
                     class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center transition-colors dark:hover:bg-slate-700">
                    <div class="w-2 h-2 rounded-full mr-3 flex-shrink-0" style="background-color: ${t.status ? t.status.color : '#ccc'}"></div>
                    <span class="text-sm text-slate-800 truncate dark:text-slate-200">${t.title}</span>
                </div>
            `).join('');
        }

        container.innerHTML = html;
        container.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
};

export default GlobalSearch;