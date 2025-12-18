import API from '../api.js';
import { switchView } from '../utils/router.js';
import { closeModal, openModal } from './Modal.js';

// Локальное хранилище данных для быстрого доступа при редактировании
let cachedLinks = []; 

const Dashboard = {
    setup() {
        this.initQuickLinkForm();
        
        // --- Глобальные функции для HTML-событий ---
        
        // Открытие модалки редактирования
        window.editQuickLink = (id) => {
            const link = cachedLinks.find(l => l.id === id);
            if (link) this.openLinkModal(link);
        };
        
        // Удаление ссылки
        window.deleteQuickLink = async (id) => {
            if (confirm('Удалить эту быструю ссылку?')) {
                const success = await API.deleteQuickLink(id);
                if (success) {
                    await this.loadData(); // Перезагружаем данные
                } else {
                    alert('Не удалось удалить ссылку');
                }
            }
        };
        
        // Открытие модалки создания
        window.openQuickLinkModal = () => {
            this.openLinkModal(null);
        };
        
        // Быстрое удаление из избранного
        window.removeFavoriteFromDash = async (id) => {
            // event.stopPropagation(); // уже прописан в HTML
            const res = await API.toggleContactFavorite(id);
            if (!res.is_favorite) {
                await this.loadData();
            }
        };
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
        
        // Избранные контакты
        this.renderFavorites(data.favorite_contacts);

        // Сохраняем и рендерим ссылки
        cachedLinks = data.quick_links || [];
        this.renderQuickLinks(cachedLinks);
        
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
                        <div class="text-sm font-medium text-slate-800 truncate dark:text-white cursor-pointer hover:text-primary-600" onclick="openTaskDetail(${t.id})">${t.title}</div>
                        <div class="text-xs text-slate-500 flex items-center gap-2 mt-0.5 dark:text-slate-400">
                            ${t.project_title ? `<span class="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] dark:bg-slate-700">${t.project_title}</span>` : ''}
                            <span class="${dateColorClass} flex items-center gap-1"><i data-lucide="${dateIcon}" class="w-3 h-3"></i> ${t.due_date || 'Без срока'}</span>
                        </div>
                    </div>
                </div>
                <button onclick="openTaskDetail(${t.id})" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary-600 transition-opacity dark:hover:text-primary-400"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
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
                <button onclick="openTaskDetail(${t.id})" class="text-slate-300 hover:text-purple-600 dark:text-slate-600 dark:hover:text-purple-400"><i data-lucide="arrow-right-circle" class="w-5 h-5"></i></button>
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

    renderFavorites(favorites) {
        const container = document.getElementById('dash-favorites');
        if (!container) return;

        if (!favorites || favorites.length === 0) {
            container.innerHTML = `<div class="col-span-2 text-center text-xs text-slate-400 py-4 border border-dashed border-slate-200 rounded dark:border-slate-700">Нет избранных</div>`;
            return;
        }

        container.innerHTML = favorites.map(f => {
            const initial = f.last_name ? f.last_name.charAt(0) : '?';
            
            // 1. Огонек (просроченные НА нём)
            const flameHtml = f.overdue_task_count > 0 
                ? `<div class="flex items-center text-orange-500 font-bold" title="Просрочено"><i data-lucide="flame" class="w-3 h-3 mr-0.5"></i>${f.overdue_task_count}</div>` 
                : '';
            
            // 2. Отправлено (поручения ОТ него)
            const authoredHtml = f.authored_task_count > 0
                ? `<div class="flex items-center text-indigo-500 font-medium" title="Поручения от него"><i data-lucide="send" class="w-3 h-3 mr-0.5"></i>${f.authored_task_count}</div>`
                : '';

            return `
            <div onclick="openContactDetail(${f.contact_id})" class="relative group cursor-pointer flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-yellow-400 transition-all shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:hover:border-yellow-500/50">
                <div class="flex items-center min-w-0 mr-2">
                    <div class="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mr-2" style="background-color: ${f.type_color}">
                        ${initial}
                    </div>
                    <div class="min-w-0">
                        <div class="text-xs font-medium text-slate-800 truncate dark:text-white leading-tight">${f.last_name} ${f.first_name ? f.first_name.charAt(0) + '.' : ''}</div>
                        <div class="text-[9px] text-slate-400 truncate leading-tight">${f.role || f.department || ''}</div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="flex items-center gap-2 text-[10px]">
                    ${flameHtml}
                    
                    ${authoredHtml}

                    <div class="flex items-center text-slate-400" title="В работе (на исполнении)"><i data-lucide="layers" class="w-3 h-3 mr-0.5"></i>${f.active_task_count}</div>
                </div>
                
                <!-- Unstar button -->
                <button onclick="event.stopPropagation(); removeFavoriteFromDash(${f.contact_id})" class="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity p-0.5">
                     <i data-lucide="x" class="w-2.5 h-2.5"></i>
                </button>
            </div>
            `;
        }).join('');
    },

    renderQuickLinks(links) {
        const container = document.getElementById('dash-quick-links');
        if (!container) return;

        if (!links || links.length === 0) {
            container.innerHTML = `<div class="col-span-2 text-center text-xs text-slate-400 py-4 border border-dashed border-slate-200 rounded dark:border-slate-700">Нет ссылок</div>`;
            return;
        }

        container.innerHTML = links.map(l => `
            <div class="relative group h-full">
                <!-- Ссылка -->
                <a href="${l.url}" target="_blank" class="flex flex-col items-center justify-center p-4 h-full rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-center dark:bg-slate-700/50 dark:border-slate-600 dark:hover:bg-slate-700 dark:text-slate-200">
                    <i data-lucide="${l.icon || 'link'}" class="w-6 h-6 mb-2 text-slate-500 dark:text-slate-300"></i>
                    <span class="text-xs font-medium truncate w-full px-1">${l.title}</span>
                </a>
                
                <!-- Кнопки управления -->
                <div class="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                    <button onclick="editQuickLink(${l.id})" class="p-1.5 rounded-md bg-white text-slate-400 hover:text-primary-600 hover:bg-slate-50 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:text-primary-400 transition-colors" title="Редактировать">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteQuickLink(${l.id})" class="p-1.5 rounded-md bg-white text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors" title="Удалить">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        `).join('');
    },

    openLinkModal(link) {
        const form = document.getElementById('quick-link-form');
        const titleEl = document.getElementById('quick-link-modal-title');
        
        if (form) {
            form.reset();
            
            if (link) {
                // Режим редактирования
                titleEl.innerText = "Редактировать ссылку";
                form.querySelector('[name="id"]').value = link.id;
                form.querySelector('[name="title"]').value = link.title;
                form.querySelector('[name="url"]').value = link.url;
                form.querySelector('[name="icon"]').value = link.icon || '';
            } else {
                // Режим создания
                titleEl.innerText = "Добавить ссылку";
                form.querySelector('[name="id"]').value = "";
            }
        }
        openModal('quick-link-modal');
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
                
                const id = data.id;
                let success = false;

                if (id) {
                    success = await API.updateQuickLink(id, data);
                } else {
                    success = await API.createQuickLink(data);
                }
                
                if (success) {
                    closeModal('quick-link-modal');
                    e.target.reset(); 
                    this.loadData(); 
                } else {
                    alert('Ошибка при сохранении ссылки');
                }
            });
        }
    }
};

export default Dashboard;