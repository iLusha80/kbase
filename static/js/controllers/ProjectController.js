import API from '../api.js';
import { switchView } from '../utils/router.js';
import { closeModal } from '../components/Modal.js';
import ProjectContactManager from '../components/ProjectContactManager.js';
import Dashboard from '../components/Dashboard.js';

let projectsData = [];

export const ProjectController = {
    init(contactsData = []) {
        const form = document.getElementById('project-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Инициализация менеджера команды
        window.projectContactManager = new ProjectContactManager('project-team-container', contactsData);

        // Экспорт
        window.openProjectModal = this.openModal.bind(this);
        window.closeProjectModal = () => closeModal('project-modal');
        window.editProject = this.editProject.bind(this);
        window.deleteProject = this.deleteProject.bind(this);
        window.openProjectDetail = this.openProjectDetail.bind(this);
    },

    async loadAll() {
        projectsData = await API.getProjects();
        this.renderProjectsList(projectsData);
        return projectsData;
    },
    
    getData() {
        return projectsData;
    },

    renderProjectsList(projects) {
        const container = document.getElementById('projects-container');
        if (!container) return;
        
        if (projects.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 dark:text-slate-500">Нет активных проектов.</div>`;
            return;
        }

        container.innerHTML = projects.map(p => `
            <div onclick="openProjectDetail(${p.id})" class="bg-white rounded-xl p-5 shadow-sm border border-slate-200 cursor-pointer hover:border-primary-500 transition-all dark:bg-slate-800 dark:border-slate-700 dark:hover:border-primary-500 group">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">${p.title}</h3>
                    <span class="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 dark:bg-slate-700 dark:text-slate-300">${p.status}</span>
                </div>
                <p class="text-sm text-slate-500 mb-4 line-clamp-2 dark:text-slate-400">${p.description || 'Нет описания'}</p>
                <div class="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-3 dark:border-slate-700">
                    <div class="flex items-center"><i data-lucide="check-square" class="w-3 h-3 mr-1"></i> ${p.tasks_count} задач</div>
                    <div class="flex items-center"><i data-lucide="users" class="w-3 h-3 mr-1"></i> ${p.team ? p.team.length : 0} участников</div>
                </div>
            </div>
        `).join('');
        
        if (window.lucide) lucide.createIcons();
    },

    async openProjectDetail(id) {
        const p = await API.getProject(id);
        if (!p) return;

        document.getElementById('p-detail-title').innerText = p.title;
        document.getElementById('p-detail-desc').innerText = p.description || '';
        
        // Кнопки управления в хедере
        const editBtn = document.getElementById('p-detail-edit-btn');
        const delBtn = document.getElementById('p-detail-delete-btn');
        if(editBtn) editBtn.onclick = () => this.editProject(p.id);
        if(delBtn) delBtn.onclick = () => this.deleteProject(p.id);
        
        // Ссылка
        const linkContainer = document.getElementById('p-detail-link-container');
        if (linkContainer) {
            if (p.link) {
                linkContainer.innerHTML = `<a href="${p.link}" target="_blank" class="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-sm hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 transition-colors"><i data-lucide="external-link" class="w-4 h-4 mr-2"></i>Открыть ресурс</a>`;
            } else {
                linkContainer.innerHTML = '';
            }
        }

        // Команда
        const teamContainer = document.getElementById('p-detail-team');
        if (p.team && p.team.length > 0) {
            teamContainer.innerHTML = p.team.map(m => `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 mr-3 dark:bg-slate-700 dark:text-slate-300">
                            ${m.name.charAt(0)}
                        </div>
                        <div>
                            <div class="text-sm font-medium text-slate-900 dark:text-white">${m.name}</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${m.role}</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            teamContainer.innerHTML = '<div class="text-sm text-slate-400 italic">Нет участников</div>';
        }

        // Задачи
        const tasksContainer = document.getElementById('p-detail-tasks');
        if (p.tasks_list && p.tasks_list.length > 0) {
            tasksContainer.innerHTML = p.tasks_list.map(t => `
                <div class="bg-white border border-slate-200 rounded p-3 flex justify-between items-center hover:shadow-sm dark:bg-slate-800 dark:border-slate-700">
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full" style="background-color: ${t.status.color}"></div>
                        <div>
                            <div class="font-medium text-sm text-slate-900 dark:text-white">${t.title}</div>
                            <div class="text-xs text-slate-500 dark:text-slate-400">${t.due_date || ''}</div>
                        </div>
                    </div>
                    <div class="flex gap-2">
                         <button onclick="editTask(${t.id})" class="text-slate-400 hover:text-primary-600"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
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
        const p = projectsData.find(x => x.id === id) || await API.getProject(id);
        if(!p) return;
        
        // Если данные из списка, может не быть полного списка команды, так что лучше загрузить свежие
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
                switchView('projects');
            }
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if(window.projectContactManager) {
            data.team = window.projectContactManager.getTeam();
        }

        const id = data.id;
        let success = id ? await API.updateProject(id, data) : await API.createProject(data);
        if (success) { 
            closeModal('project-modal'); 
            e.target.reset(); 
            await this.loadAll(); 
            
            // Если мы смотрели детали этого проекта, обновим их
            if (id && !document.getElementById('view-project-detail').classList.contains('hidden')) {
                this.openProjectDetail(id);
            }
            Dashboard.init();
        } 
        else { 
            alert('Ошибка при сохранении проекта'); 
        }
    }
};