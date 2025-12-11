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
            
            if (val.length < 2) {
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
            if (input.value.length >= 2 && resultsContainer.children.length > 0) {
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

        if (!hasTasks && !hasProjects && !hasContacts) {
            container.innerHTML = `<div class="p-4 text-sm text-center text-slate-500 dark:text-slate-400">Ничего не найдено</div>`;
            container.classList.remove('hidden');
            return;
        }

        if (hasProjects) {
            html += `<div class="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300">Проекты</div>`;
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
                <div onclick="editTask(${t.id}); document.getElementById('globalHeaderSearchResults').classList.add('hidden');" 
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