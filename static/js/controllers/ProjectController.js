import API from '../api.js';
import { switchView, navigateBack } from '../utils/router.js';
import { closeModal } from '../components/Modal.js';
import ProjectContactManager from '../components/ProjectContactManager.js';
import Dashboard from '../components/Dashboard.js';

let projectsData = [];
let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'newest';

// Status color mapping
const statusColors = {
    'Active': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
    'Planning': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
    'On Hold': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
    'Done': { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
    'Archived': { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-300' }
};

const statusLabels = {
    'Active': 'Активный',
    'Planning': 'Планирование',
    'On Hold': 'На паузе',
    'Done': 'Завершён',
    'Archived': 'Архив'
};

export const ProjectController = {
    init(contactsData = []) {
        const form = document.getElementById('project-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        window.projectContactManager = new ProjectContactManager('project-team-container', contactsData);
        window.openProjectModal = this.openModal.bind(this);
        window.closeProjectModal = () => closeModal('project-modal');
        window.editProject = this.editProject.bind(this);
        window.deleteProject = this.deleteProject.bind(this);
        window.openProjectDetail = this.openProjectDetail.bind(this);

        this.initFilters();
    },

    initFilters() {
        // Search input
        const searchInput = document.getElementById('projects-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Status tabs
        const tabs = document.querySelectorAll('.projects-status-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentFilter = e.currentTarget.dataset.status;
                this.applyFilters();
            });
        });

        // Sort select
        const sortSelect = document.getElementById('projects-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                this.applyFilters();
            });
        }
    },

    applyFilters() {
        let filtered = [...projectsData];

        // Filter by status
        if (currentFilter !== 'all') {
            filtered = filtered.filter(p => p.status === currentFilter);
        }

        // Filter by search
        if (currentSearch) {
            filtered = filtered.filter(p =>
                p.title.toLowerCase().includes(currentSearch) ||
                (p.description && p.description.toLowerCase().includes(currentSearch))
            );
        }

        // Sort
        filtered = this.sortProjects(filtered, currentSort);

        this.renderProjectsList(filtered);
        this.updateCount(filtered.length);
    },

    sortProjects(projects, sortBy) {
        const sorted = [...projects];
        switch (sortBy) {
            case 'newest':
                return sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
            case 'oldest':
                return sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
            case 'name':
                return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
            case 'tasks':
                return sorted.sort((a, b) => b.tasks_count - a.tasks_count);
            default:
                return sorted;
        }
    },

    updateCount(count) {
        const countEl = document.getElementById('projects-count');
        if (countEl) {
            const word = this.getProjectWord(count);
            countEl.textContent = `Найдено: ${count} ${word}`;
        }
    },

    getProjectWord(n) {
        const abs = Math.abs(n) % 100;
        const n1 = abs % 10;
        if (abs > 10 && abs < 20) return 'проектов';
        if (n1 > 1 && n1 < 5) return 'проекта';
        if (n1 === 1) return 'проект';
        return 'проектов';
    },

    async loadAll() {
        projectsData = await API.getProjects();
        this.applyFilters();
        return projectsData;
    },

    getData() {
        return projectsData;
    },

    renderProjectsList(projects) {
        const container = document.getElementById('projects-container');
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <i data-lucide="folder-open" class="w-8 h-8 text-slate-400"></i>
                    </div>
                    <p class="text-slate-500 dark:text-slate-400 mb-2">Проекты не найдены</p>
                    <p class="text-sm text-slate-400 dark:text-slate-500">Попробуйте изменить фильтры или создайте новый проект</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        container.innerHTML = projects.map(p => {
            const colors = statusColors[p.status] || statusColors['Active'];
            const label = statusLabels[p.status] || p.status;
            const progress = p.tasks_count > 0 ? Math.round((p.completed_tasks_count / p.tasks_count) * 100) : 0;

            return `
            <div onclick="openProjectDetail(${p.id})" class="bg-white rounded-xl p-5 shadow-sm border border-slate-200 cursor-pointer hover:border-primary-500 hover:shadow-md transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-primary-500 group flex flex-col">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 line-clamp-1">${p.title}</h3>
                    <span class="text-xs px-2 py-1 rounded-full flex items-center gap-1.5 shrink-0 ml-2 ${colors.bg} ${colors.text}">
                        <span class="w-1.5 h-1.5 rounded-full ${colors.dot}"></span>
                        ${label}
                    </span>
                </div>
                <p class="text-sm text-slate-500 mb-4 line-clamp-2 dark:text-slate-400 flex-1">${p.description || 'Нет описания'}</p>

                ${p.tasks_count > 0 ? `
                <div class="mb-4">
                    <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span>Прогресс задач</span>
                        <span>${p.completed_tasks_count}/${p.tasks_count} (${progress}%)</span>
                    </div>
                    <div class="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full ${progress === 100 ? 'bg-green-500' : 'bg-primary-500'} rounded-full transition-all" style="width: ${progress}%"></div>
                    </div>
                </div>
                ` : ''}

                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <div class="flex items-center gap-4">
                        <div class="flex items-center">
                            <i data-lucide="check-square" class="w-3.5 h-3.5 mr-1.5"></i>
                            ${p.tasks_count} задач
                        </div>
                        <div class="flex items-center">
                            <i data-lucide="users" class="w-3.5 h-3.5 mr-1.5"></i>
                            ${p.team ? p.team.length : 0}
                        </div>
                    </div>
                    ${p.link ? '<i data-lucide="external-link" class="w-3.5 h-3.5 text-slate-400"></i>' : ''}
                </div>
            </div>
        `}).join('');

        if (window.lucide) lucide.createIcons();
    },

    async openProjectDetail(id) {
        API.logView('project', id);
        const p = await API.getProject(id);
        if (!p) return;

        document.getElementById('p-detail-title').innerText = p.title;
        document.getElementById('p-detail-desc').innerText = p.description || '';

        const editBtn = document.getElementById('p-detail-edit-btn');
        const delBtn = document.getElementById('p-detail-delete-btn');
        if(editBtn) editBtn.onclick = () => this.editProject(p.id);
        if(delBtn) delBtn.onclick = () => this.deleteProject(p.id);

        const linkContainer = document.getElementById('p-detail-link-container');
        if (linkContainer) {
            if (p.link) {
                linkContainer.innerHTML = `<a href="${p.link}" target="_blank" class="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"><i data-lucide="external-link" class="w-4 h-4 mr-2"></i>Открыть ресурс</a>`;
            } else {
                linkContainer.innerHTML = '';
            }
        }

        const teamContainer = document.getElementById('p-detail-team');
        if (p.team && p.team.length > 0) {
            teamContainer.innerHTML = p.team.map(m => `
                <div class="flex items-center justify-between cursor-pointer group" onclick="openContactDetail(${m.contact_id})">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-3 dark:bg-slate-700 dark:text-slate-300">
                            ${m.name.charAt(0)}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors dark:text-white dark:group-hover:text-primary-400">${m.name}</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${m.role}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            teamContainer.innerHTML = '<div class="text-sm text-slate-400 italic">Нет участников</div>';
        }

        const tasksContainer = document.getElementById('p-detail-tasks');
        if (p.tasks_list && p.tasks_list.length > 0) {
            tasksContainer.innerHTML = p.tasks_list.map(t => `
                <div onclick="openTaskDetail(${t.id})" class="cursor-pointer bg-white border border-slate-200 rounded p-3 flex justify-between items-center hover:shadow-sm hover:border-primary-400 transition-all dark:bg-slate-800 dark:border-slate-700 group">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full" style="background-color: ${t.status.color}"></div>
                        <div>
                            <div class="font-medium text-sm text-slate-900 group-hover:text-primary-600 transition-colors dark:text-white dark:group-hover:text-primary-400">${t.title}</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${t.due_date || 'Без срока'}</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                         <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-primary-500 transition-colors"></i>
                    </div>
                </div>
            `).join('');
        } else {
            tasksContainer.innerHTML = '<div class="text-sm text-slate-400 italic">Нет задач</div>';
        }

        if (window.lucide) lucide.createIcons();
        switchView('project-detail', true, `/projects/${id}`);
    },

    openModal() {
        const form = document.getElementById('project-form');
        if(form) {
            form.reset();
            form.querySelector('[name="id"]').value = "";
            const statusSelect = form.querySelector('select[name="status"]');
            if (statusSelect) statusSelect.value = "Active";
        }
        if(window.projectContactManager) window.projectContactManager.clear();
        document.getElementById('project-modal').classList.remove('hidden');
    },

    async editProject(id) {
        const fullProject = await API.getProject(id);
        this.openModal();
        const form = document.getElementById('project-form');
        form.querySelector('[name="id"]').value = fullProject.id;
        form.querySelector('[name="title"]').value = fullProject.title;
        form.querySelector('[name="description"]').value = fullProject.description || '';
        const statusSelect = form.querySelector('select[name="status"]');
        if (statusSelect) statusSelect.value = fullProject.status || 'Active';
        form.querySelector('[name="link"]').value = fullProject.link || '';
        if(window.projectContactManager) {
            window.projectContactManager.setTeam(fullProject.team || []);
        }
    },

    async deleteProject(id) {
        if (confirm('Удалить проект? Задачи останутся, но будут отвязаны.')) {
            if (await API.deleteProject(id)) {
                await this.loadAll();
                Dashboard.init();
                navigateBack('projects', '/projects');
            }
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        if(window.projectContactManager) data.team = window.projectContactManager.getTeam();
        const id = data.id;
        let success = id ? await API.updateProject(id, data) : await API.createProject(data);
        if (success) {
            closeModal('project-modal');
            e.target.reset();
            await this.loadAll();
            if (id && !document.getElementById('view-project-detail').classList.contains('hidden')) {
                this.openProjectDetail(id);
            }
            Dashboard.init();
        } else { alert('Ошибка при сохранении проекта'); }
    }
};
