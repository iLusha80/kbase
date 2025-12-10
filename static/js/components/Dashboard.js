import API from '../api.js';
import { switchView } from '../utils/router.js';
import { closeModal } from './Modal.js';

const Dashboard = {
    // Setup listeners (Search logic REMOVED from here)
    setup() {
        this.initQuickLinkForm();
    },

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
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                if (await API.createQuickLink(data)) {
                    closeModal('quick-link-modal');
                    e.target.reset(); 
                    this.loadData(); 
                } else {
                    alert('Ошибка при создании ссылки');
                }
            });
        }
    }
};

export default Dashboard;