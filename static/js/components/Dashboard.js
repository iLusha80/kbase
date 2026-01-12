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
            container.innerHTML = `<div class="col-span-full p-4 text-center text-slate-400 text-sm bg-white rounded-lg border border-slate-200 border-dashed dark:bg-slate-800 dark:border-slate-700">Нет срочных задач. Отличная работа!</div>`;
            return;
        }

        container.innerHTML = tasks.map(t => {
            const isOverdue = t.due_date && new Date(t.due_date) < new Date().setHours(0,0,0,0);
            const statusName = t.status ? t.status.name : '';
            const statusColor = t.status ? t.status.color : '#94a3b8';
            
            // --- Icon Logic ---
            let iconName = 'circle';
            let spinClass = '';
            
            if (statusName === 'В работе') {
                iconName = 'loader-2'; // Спиннер
                spinClass = 'animate-spin'; // Вращение (стандартный Tailwind класс, если нет - можно custom)
                // Если нет animate-spin, добавим inline style
            } else if (statusName === 'К выполнению') {
                iconName = 'circle';
            } else if (statusName === 'Жду ответа') {
                iconName = 'clock';
            } else if (statusName === 'Готово') {
                iconName = 'check-circle-2';
            }
            // Переопределение для анимации, если стандартного класса нет в вашей версии
            const spinStyle = (statusName === 'В работе') ? 'animation: spin 3s linear infinite;' : '';

            // --- Date Logic ---
            const dateIcon = isOverdue ? 'alert-triangle' : 'calendar';
            const dateTextClass = isOverdue ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400';
            const dateDisplay = t.due_date ? t.due_date.split('-').reverse().slice(0, 2).join('.') : 'Нет срока'; // ДД.ММ

            // --- Avatar Logic ---
            let avatarHtml = `<div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 dark:bg-slate-700"><i data-lucide="user" class="w-3 h-3"></i></div>`;
            if (t.assignee) {
                const initial = t.assignee.last_name ? t.assignee.last_name.charAt(0) : '?';
                avatarHtml = `<div title="Исполнитель: ${t.assignee.last_name}" class="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold border border-white shadow-sm dark:bg-primary-900 dark:text-primary-200 dark:border-slate-700">${initial}</div>`;
            }

            // --- Project Badge ---
            const projectBadge = t.project_title 
                ? `<span class="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 truncate max-w-[100px] border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">${t.project_title}</span>`
                : '';

            return `
            <div onclick="openTaskDetail(${t.id})" class="relative flex flex-col p-4 bg-white rounded-xl border border-slate-200 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer group dark:bg-slate-800 dark:border-slate-700 dark:hover:border-primary-500 h-full">
                <!-- Header: Status Icon & Project -->
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-1.5" style="color: ${statusColor}">
                        <i data-lucide="${iconName}" class="w-4 h-4" style="${spinStyle}"></i>
                        <span class="text-[10px] font-bold uppercase tracking-wider opacity-90">${statusName}</span>
                    </div>
                    ${projectBadge}
                </div>

                <!-- Title -->
                <div class="font-bold text-slate-800 dark:text-white mb-4 line-clamp-2 text-sm leading-snug group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    ${t.title}
                </div>

                <!-- Footer: Date & User -->
                <div class="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
                    <!-- Date -->
                    <div class="text-xs ${dateTextClass} flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded dark:bg-slate-700/50">
                        <i data-lucide="${dateIcon}" class="w-3.5 h-3.5"></i>
                        <span>${isOverdue ? 'Просрочено' : dateDisplay}</span>
                    </div>

                    <!-- Avatar -->
                    <div class="flex items-center">
                        ${avatarHtml}
                    </div>
                </div>
            </div>`;
        }).join('');
        
        // Инлайн стили для анимации спиннера (если нет в CSS)
        if (!document.getElementById('spin-style')) {
            const style = document.createElement('style');
            style.id = 'spin-style';
            style.innerHTML = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
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