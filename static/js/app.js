import API from './api.js';
import { switchView } from './utils/router.js';
import { initModals, openModal, closeModal } from './components/Modal.js';
import { renderTasks } from './components/TaskList.js';
import { renderContacts } from './components/ContactList.js';
import TagManager from './components/TagManager.js';
import ThemeManager from './components/ThemeManager.js';
import ProjectContactManager from './components/ProjectContactManager.js'; // NEW

let contactsData = [];
let tasksData = [];
let projectsData = [];

// Карта маршрутов: viewName -> URL path
const viewPaths = {
    'dashboard': '/',
    'contacts': '/contacts',
    'tasks': '/tasks',
    'projects': '/projects',
    'kb': '/kb'
};

document.addEventListener('DOMContentLoaded', async () => {
    const api = API; 
    window.api = api; 

    if (window.lucide) {
        lucide.createIcons();
    }
    
    new ThemeManager('theme-toggle');
    initModals();

    window.contactTagManager = new TagManager('contact-tags-container');
    window.taskTagManager = new TagManager('task-tags-container');
    
    // Менеджер команды проекта (инициализируем позже, когда загрузим контакты)
    window.projectContactManager = null;

    // --- ПОИСК ---
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchValue = e.target.value.toLowerCase();
            renderContacts(contactsData, searchValue);
        });
    }

    // --- НАВИГАЦИЯ (КЛИКИ) ---
    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.closest('[data-view]'); 
            if (target) {
                const viewName = target.dataset.view;
                const path = viewPaths[viewName] || '/';
                switchView(viewName, true, path);
            }
        });
    });

    window.addEventListener('popstate', (event) => {
        const path = window.location.pathname;
        let view = 'dashboard';
        if (path === '/contacts') view = 'contacts';
        else if (path === '/tasks') view = 'tasks';
        else if (path === '/projects') view = 'projects';
        switchView(view, false);
    });
    
    // Forms
    const contactForm = document.getElementById('contact-form');
    if (contactForm) contactForm.addEventListener('submit', handleContactFormSubmit);
    
    const taskForm = document.getElementById('task-form');
    if (taskForm) taskForm.addEventListener('submit', handleTaskFormSubmit);

    // NEW: Project Form
    const projectForm = document.getElementById('project-form');
    if (projectForm) projectForm.addEventListener('submit', handleProjectFormSubmit);

    await loadInitialData();
    
    // Init Manager after contacts loaded
    window.projectContactManager = new ProjectContactManager('project-team-container', contactsData);

    // Initial View
    const path = window.location.pathname;
    let initialView = 'dashboard';
    if (path === '/contacts') initialView = 'contacts';
    if (path === '/tasks') initialView = 'tasks';
    if (path === '/projects') initialView = 'projects';
    switchView(initialView, false);
});

async function loadInitialData() {
    await Promise.all([
        loadContactTypes(),
        loadTaskStatuses(),
        loadAllTags(),
        loadContacts(),
        loadTasks(),
        loadProjects() // NEW
    ]);
}

async function loadContacts() {
    contactsData = await window.api.getContacts();
    renderContacts(contactsData);
    updateTaskContactSelects();
    // Обновим список в менеджере команд, если он уже создан
    if (window.projectContactManager) {
        window.projectContactManager.contactsList = contactsData;
    }
}

async function loadTasks() {
    tasksData = await window.api.getTasks();
    renderTasks(tasksData);
}

async function loadProjects() {
    projectsData = await window.api.getProjects();
    renderProjectsList();
    updateTaskProjectSelect();
}

// ... (loadContactTypes, loadTaskStatuses, loadAllTags без изменений) ...
async function loadContactTypes() {
    const contactTypes = await window.api.getContactTypes();
    const select = document.querySelector('select[name="type_id"]');
    if (select) {
        select.innerHTML = contactTypes.map(t => `<option value="${t.id}">${t.name_type}</option>`).join('');
    }
}

async function loadTaskStatuses() {
    const taskStatuses = await window.api.getTaskStatuses();
    const select = document.querySelector('select[name="status_id"]');
    if (select) {
        select.innerHTML = taskStatuses.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
}

async function loadAllTags() {
    window.allTags = await window.api.getTags();
}

function updateTaskContactSelects() {
    const assigneeSelect = document.querySelector('select[name="assignee_id"]');
    const authorSelect = document.querySelector('select[name="author_id"]');
    const options = `<option value="">-- Не выбрано --</option>` + contactsData.map(c => `<option value="${c.id}">${c.last_name} ${c.first_name || ''}</option>`).join('');
    if (assigneeSelect) assigneeSelect.innerHTML = options;
    if (authorSelect) authorSelect.innerHTML = options;
}

function updateTaskProjectSelect() {
    const projectSelect = document.querySelector('select[name="project_id"]');
    if (projectSelect) {
        const options = `<option value="">-- Без проекта --</option>` + projectsData.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
        projectSelect.innerHTML = options;
    }
}

// --- RENDER PROJECTS ---
function renderProjectsList() {
    const container = document.getElementById('projects-container');
    if (!container) return;
    
    if (projectsData.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400 dark:text-slate-500">Нет активных проектов.</div>`;
        return;
    }

    container.innerHTML = projectsData.map(p => `
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
}

// --- PROJECT DETAIL LOGIC ---
window.openProjectDetail = async (id) => {
    // Получаем полные данные (включая задачи)
    const p = await window.api.getProject(id);
    if (!p) return;

    document.getElementById('p-detail-title').innerText = p.title;
    document.getElementById('p-detail-desc').innerText = p.description || '';
    
    // Кнопки управления
    document.getElementById('p-detail-edit-btn').onclick = () => window.editProject(p.id);
    document.getElementById('p-detail-delete-btn').onclick = () => window.deleteProject(p.id);

    // Рендер команды
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

    // Рендер задач (переиспользуем логику renderTasks, но вручную для этого контейнера)
    const tasksContainer = document.getElementById('p-detail-tasks');
    if (p.tasks_list && p.tasks_list.length > 0) {
        // Простая отрисовка списка задач
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
};

// --- HANDLERS ---
async function handleProjectFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Собираем команду из менеджера
    data.team = window.projectContactManager.getTeam();

    const id = data.id;
    let success = id ? await window.api.updateProject(id, data) : await window.api.createProject(data);
    if (success) { 
        closeModal('project-modal'); 
        e.target.reset(); 
        loadProjects(); 
        // Если мы были в детальке, обновим её
        if (id && !document.getElementById('view-project-detail').classList.contains('hidden')) {
            openProjectDetail(id);
        }
    } 
    else { alert('Ошибка'); }
}

async function handleContactFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.tags = window.contactTagManager.getTags();
    const id = data.id;
    let success = id ? await window.api.updateContact(id, data) : await window.api.createContact(data);
    if (success) { 
        closeModal('contact-modal'); 
        e.target.reset(); 
        loadContacts(); 
        loadAllTags(); 
    } 
    else { alert('Ошибка'); }
}

async function handleTaskFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.tags = window.taskTagManager.getTags();
    const id = data.id;
    let success = id ? await window.api.updateTask(id, data) : await window.api.createTask(data);
    if (success) { 
        closeModal('task-modal'); 
        e.target.reset(); 
        loadTasks(); 
        loadAllTags(); 
        // Если мы в проекте, обновим список задач там тоже (грубо, перезагрузкой детальки)
        if (data.project_id && !document.getElementById('view-project-detail').classList.contains('hidden')) {
             openProjectDetail(data.project_id);
        }
    } 
    else { alert('Ошибка'); }
}

// Global Helpers
window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); };
window.closeTaskModal = function() { closeModal('task-modal'); };
window.closeProjectModal = function() { closeModal('project-modal'); };

window.openModal = function() {
    const form = document.getElementById('contact-form');
    if(form) { form.reset(); form.querySelector('[name="id"]').value = ""; }
    window.contactTagManager.clear();
    document.getElementById('contact-modal').classList.remove('hidden');
};

window.openTaskModal = function() {
    const form = document.getElementById('task-form');
    if(form) { form.reset(); form.querySelector('[name="id"]').value = ""; }
    window.taskTagManager.clear();
    document.getElementById('task-modal').classList.remove('hidden');
};

window.openProjectModal = function() {
    const form = document.getElementById('project-form');
    if(form) { form.reset(); form.querySelector('[name="id"]').value = ""; }
    window.projectContactManager.clear();
    document.getElementById('project-modal').classList.remove('hidden');
};

// ... removeTag ...
window.removeTag = function(containerId, index) {
    if (containerId === 'contact-tags-container') window.contactTagManager.removeTag(index);
    if (containerId === 'task-tags-container') window.taskTagManager.removeTag(index);
};

// ... editContact / deleteContact ... (оставляем старые)
window.editContact = (id) => {
    const form = document.getElementById('contact-form');
    document.getElementById('contact-modal').classList.remove('hidden');
    window.contactTagManager.clear();
    const contact = contactsData.find(c => c.id === id);
    if (!contact) return;
    form.querySelector('[name="id"]').value = contact.id;
    form.querySelector('[name="last_name"]').value = contact.last_name || '';
    form.querySelector('[name="first_name"]').value = contact.first_name || '';
    form.querySelector('[name="middle_name"]').value = contact.middle_name || '';
    form.querySelector('[name="department"]').value = contact.department || '';
    form.querySelector('[name="role"]').value = contact.role || '';
    form.querySelector('[name="email"]').value = contact.email || '';
    form.querySelector('[name="phone"]').value = contact.phone || '';
    form.querySelector('[name="link"]').value = contact.link || '';
    form.querySelector('[name="notes"]').value = contact.notes || '';
    if (contact.type_id) form.querySelector('select[name="type_id"]').value = contact.type_id;
    if (contact.tags) window.contactTagManager.addTags(contact.tags.map(t => t.name));
};

window.deleteContact = async (id) => {
    if (confirm('Вы уверены?')) { if (await window.api.deleteContact(id)) loadContacts(); }
};

// Updated editTask to load project_id
window.editTask = (id) => {
    const form = document.getElementById('task-form');
    document.getElementById('task-modal').classList.remove('hidden');
    window.taskTagManager.clear();
    const task = tasksData.find(t => t.id === id);
    if (!task) return;
    form.querySelector('[name="id"]').value = task.id;
    form.querySelector('[name="title"]').value = task.title;
    form.querySelector('[name="due_date"]').value = task.due_date || '';
    form.querySelector('[name="description"]').value = task.description || '';
    if (task.status_id) form.querySelector('select[name="status_id"]').value = task.status_id;
    form.querySelector('select[name="assignee_id"]').value = task.assignee_id || '';
    form.querySelector('select[name="author_id"]').value = task.author_id || '';
    if (task.project_id) form.querySelector('select[name="project_id"]').value = task.project_id; // NEW
    if (task.tags) window.taskTagManager.addTags(task.tags.map(t => t.name));
};

window.deleteTask = async (id) => {
    if (confirm('Вы уверены?')) { if (await window.api.deleteTask(id)) loadTasks(); }
};

window.editProject = async (id) => {
    const p = await window.api.getProject(id);
    if(!p) return;
    
    const form = document.getElementById('project-form');
    document.getElementById('project-modal').classList.remove('hidden');
    
    form.querySelector('[name="id"]').value = p.id;
    form.querySelector('[name="title"]').value = p.title;
    form.querySelector('[name="description"]').value = p.description || '';
    
    // Заполняем команду
    window.projectContactManager.setTeam(p.team || []);
};

window.deleteProject = async (id) => {
    if (confirm('Удалить проект? Задачи останутся, но будут отвязаны.')) { 
        if (await window.api.deleteProject(id)) {
            loadProjects();
            switchView('projects');
        }
    }
};