import API from '../api.js';
import { switchView } from '../utils/router.js';
import { closeModal } from './Modal.js';

const Dashboard = {
    // Метод для инициализации слушателей событий (выполняется 1 раз при загрузке App)
    setup() {
        this.initSearch();
        this.initQuickLinkForm();
    },

    // Метод для загрузки данных (выполняется каждый раз при переходе на Dashboard)
    async init() {
        await this.loadData();
    },

    async loadData() {
        const data = await API.getDashboard();
        if (!data) return;

        this.renderPriorityTasks(data.priority_tasks);
        this.renderWaitingTasks(data.waiting_tasks);
        this.renderTopProjects(data.top_projects);
        this.renderQuickLinks(data.quick_links);
        
        if (window.lucide) lucide.createIcons();
    },

    renderPriorityTasks(tasks) {
        const container = document.getElementById('dash-priority-tasks');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm bg-white rounded-lg border border-slate-200 border-dashed dark:bg-slate-800 dark:border-slate-700">Нет срочных задач. Отличная работа!</div>`;
            return;
        }
        container.innerHTML = tasks.map(t => {
            const isOverdue = t.due_date && new Date(t.due_date) < new Date().setHours(0,0,0,0);
            const dateColorClass = isOverdue ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400';
            const dateIcon = isOverdue ? 'alert-circle' : 'calendar';
            return `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-primary-400 transition-colors group dark:bg-slate-800 dark:border-slate-700">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${t.status ? t.status.color : '#ccc'}"></div>
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-slate-800 truncate dark:text-white cursor-pointer hover:text-primary-600" onclick="editTask(${t.id})">${t.title}</div>
                        <div class="text-xs text-slate-500 flex items-center gap-2 mt-0.5 dark:text-slate-400">
                            ${t.project_title ? `<span class="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] dark:bg-slate-700">${t.project_title}</span>` : ''}
                            <span class="${dateColorClass} flex items-center gap-1"><i data-lucide="${dateIcon}" class="w-3 h-3"></i> ${t.due_date || 'Без срока'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="editTask(${t.id})" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary-600 transition-opacity dark:hover:text-primary-400"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
            </div>`;
        }).join('');
    },

    renderWaitingTasks(tasks) {
        const container = document.getElementById('dash-waiting-tasks');
        if (!container) return;
        if (!tasks || tasks.length === 0) {
            container.innerHTML = `<div class="p-4 text-center text-slate-400 text-sm bg-white rounded-lg border border-slate-200 border-dashed dark:bg-slate-800 dark:border-slate-700">Никого не ждем.</div>`;
            return;
        }
        container.innerHTML = tasks.map(t => `
            <div class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-purple-100 hover:border-purple-300 transition-colors dark:bg-slate-800 dark:border-slate-700/50">
                <div class="min-w-0">
                    <div class="text-sm font-medium text-slate-800 truncate dark:text-white">${t.title}</div>
                    <div class="text-xs text-slate-500 mt-0.5 dark:text-slate-400">${t.assignee ? `<i data-lucide="user" class="w-3 h-3 inline mr-1"></i>${t.assignee.last_name}` : 'Нет исполнителя'}</div>
                </div>
                <button onclick="editTask(${t.id})" class="text-slate-300 hover:text-purple-600 dark:text-slate-600 dark:hover:text-purple-400"><i data-lucide="arrow-right-circle" class="w-5 h-5"></i></button>
            </div>
        `).join('');
    },

    renderTopProjects(projects) {
        const container = document.getElementById('dash-active-projects');
        if (!container) return;
        if (!projects || projects.length === 0) {
            container.innerHTML = `<div class="text-xs text-slate-400 text-center">Нет активных проектов</div>`;
            return;
        }
        container.innerHTML = projects.map(p => `
            <div onclick="openProjectDetail(${p.id})" class="cursor-pointer group block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all dark:border-slate-700/50 dark:hover:bg-slate-700/50">
                <div class="flex justify-between items-start mb-1">
                    <div class="font-medium text-sm text-slate-800 group-hover:text-primary-600 dark:text-slate-200 dark:group-hover:text-primary-400 truncate w-3/4">${p.title}</div>
                    <span class="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded dark:bg-green-900/30 dark:text-green-400">${p.active_work_count} актив</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-1.5 mt-2 dark:bg-slate-700">
                    <div class="bg-primary-500 h-1.5 rounded-full" style="width: ${Math.min(100, (p.active_work_count * 10) + 10)}%"></div>
                </div>
            </div>
        `).join('');
    },

    renderQuickLinks(links) {
        const container = document.getElementById('dash-quick-links');
        if (!container) return;

        if (!links || links.length === 0) {
            container.innerHTML = `<div class="col-span-2 text-center text-xs text-slate-400 py-4 border border-dashed border-slate-200 rounded dark:border-slate-700">Нет ссылок</div>`;
            return;
        }

        container.innerHTML = links.map(l => `
            <div class="relative group flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-center dark:bg-slate-700/50 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-200">
                <a href="${l.url}" target="_blank" class="w-full flex flex-col items-center">
                    <i data-lucide="${l.icon || 'link'}" class="w-5 h-5 mb-1 text-slate-500 dark:text-slate-300"></i>
                    <span class="text-xs font-medium truncate w-full">${l.title}</span>
                </a>
                <button onclick="deleteQuickLink(${l.id})" class="absolute top-1 right-1 text-slate-300 hover:text-red-500 hidden group-hover:block transition-colors">
                    <i data-lucide="x-circle" class="w-3 h-3"></i>
                </button>
            </div>
        `).join('');
    },

    initQuickLinkForm() {
        const form = document.getElementById('quick-link-form');
        if (form) {
            // Удаляем старые слушатели путем клонирования (самый простой способ без именованной функции)
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                if (await API.createQuickLink(data)) {
                    closeModal('quick-link-modal');
                    e.target.reset(); // Сброс формы
                    this.loadData(); // Обновление дашборда
                } else {
                    alert('Ошибка при создании ссылки');
                }
            });
        }
    },

    initSearch() {
        const input = document.getElementById('globalSearchInput');
        const resultsContainer = document.getElementById('globalSearchResults');
        
        if (!input || !resultsContainer) return;
        
        // Клонируем input чтобы убрать старые слушатели, если они были
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        let debounceTimer;
        newInput.addEventListener('input', (e) => {
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

        // Слушатель клика на документе лучше оставить один раз в app.js или проверить, не дублируется ли он
        // Для простоты здесь оставим, но добавим проверку (хотя при SPA переходе initSearch не должен вызываться много раз, если мы используем setup)
        document.addEventListener('click', (e) => {
            if (!newInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.add('hidden');
            }
        });

        newInput.addEventListener('focus', () => {
            if (newInput.value.length >= 2 && resultsContainer.children.length > 0) {
                resultsContainer.classList.remove('hidden');
            }
        });
    },

    renderSearchResults(data, container) {
        let html = '';
        const hasTasks = data.tasks && data.tasks.length > 0;
        const hasProjects = data.projects && data.projects.length > 0;
        const hasContacts = data.contacts && data.contacts.length > 0;

        if (!hasTasks && !hasProjects && !hasContacts) {
            container.innerHTML = `<div class="p-3 text-sm text-slate-500 dark:text-slate-400">Ничего не найдено</div>`;
            container.classList.remove('hidden');
            return;
        }
        if (hasProjects) {
            html += `<div class="px-3 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300">Проекты</div>`;
            html += data.projects.map(p => `<div onclick="openProjectDetail(${p.id})" class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center dark:hover:bg-slate-700"><i data-lucide="briefcase" class="w-4 h-4 mr-2 text-slate-400"></i><span class="text-sm font-medium text-slate-800 dark:text-slate-200">${p.title}</span></div>`).join('');
        }
        if (hasTasks) {
            html += `<div class="px-3 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-50 border-t border-slate-100 dark:bg-slate-700/50 dark:border-slate-700 dark:text-slate-300">Задачи</div>`;
            html += data.tasks.map(t => `<div onclick="editTask(${t.id})" class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center dark:hover:bg-slate-700"><div class="w-2 h-2 rounded-full mr-2" style="background-color: ${t.status ? t.status.color : '#ccc'}"></div><span class="text-sm text-slate-800 truncate dark:text-slate-200">${t.title}</span></div>`).join('');
        }
        if (hasContacts) {
            html += `<div class="px-3 py-2 text-xs font-bold text-slate-400 uppercase bg-slate-50 border-t border-slate-100 dark:bg-slate-700/50 dark:border-slate-700 dark:text-slate-300">Контакты</div>`;
            html += data.contacts.map(c => `<div onclick="editContact(${c.id})" class="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center dark:hover:bg-slate-700"><i data-lucide="user" class="w-4 h-4 mr-2 text-slate-400"></i><span class="text-sm text-slate-800 dark:text-slate-200">${c.last_name} ${c.first_name || ''}</span></div>`).join('');
        }
        container.innerHTML = html;
        container.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }
};

export default Dashboard;