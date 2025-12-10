import API from './api.js';
import { switchView } from './utils/router.js';
import { initModals } from './components/Modal.js';
import TagManager from './components/TagManager.js';
import ThemeManager from './components/ThemeManager.js';
import Dashboard from './components/Dashboard.js';

// Импорт новых контроллеров
import { TaskController } from './controllers/TaskController.js';
import { ContactController } from './controllers/ContactController.js';
import { ProjectController } from './controllers/ProjectController.js';

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
    window.api = api; // Оставляем для отладки в консоли браузера

    if (window.lucide) {
        lucide.createIcons();
    }
    
    // 1. Инициализация UI-компонентов
    new ThemeManager('theme-toggle');
    initModals();

    window.contactTagManager = new TagManager('contact-tags-container');
    window.taskTagManager = new TagManager('task-tags-container');

    // 2. Инициализация контроллеров
    // Они вешают слушатели на формы и экспортируют глобальные функции
    ContactController.init();
    TaskController.init();
    // ProjectController инициализируем чуть позже, так как ему нужны контакты

    // 3. Обработка навигации
    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.closest('[data-view]'); 
            if (target) {
                const viewName = target.dataset.view;
                const path = viewPaths[viewName] || '/';
                
                if (viewName === 'dashboard') {
                    Dashboard.init();
                }
                
                switchView(viewName, true, path);
            }
        });
    });

    window.addEventListener('popstate', (event) => {
        handleUrlRouting(false);
    });
    
    // Quick Links handlers (можно тоже вынести, но они мелкие)
    window.openQuickLinkModal = function() {
        const form = document.getElementById('quick-link-form');
        if (form) form.reset();
        document.getElementById('quick-link-modal').classList.remove('hidden');
    };
    window.deleteQuickLink = async function(id) {
        if (confirm('Удалить ссылку?')) {
            if (await window.api.deleteQuickLink(id)) Dashboard.init();
        }
    };

    // 4. Загрузка данных
    await loadInitialData();
    
    // 5. Запуск
    Dashboard.init();
    handleUrlRouting(false);
});

// --- HELPER FUNCTIONS ---

async function loadInitialData() {
    // Сначала грузим справочники
    await Promise.all([
        loadContactTypes(),
        loadTaskStatuses(),
        loadAllTags()
    ]);

    // Затем сущности
    // Важен порядок: Контакты нужны для Проектов (команда) и Задач (селекты)
    const contacts = await ContactController.loadAll();
    
    // Теперь можно инициализировать контроллер проектов, передав ему контакты
    ProjectController.init(contacts);
    await ProjectController.loadAll();
    
    await TaskController.loadAll();
    
    // Обновляем зависимые селекты в модалках
    updateTaskSelects(contacts, ProjectController.getData());
}

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

// Эту функцию экспортируем глобально, чтобы ContactController мог ее вызвать после создания контакта
window.loadAllTags = loadAllTags;

function updateTaskSelects(contacts, projects) {
    const assigneeSelect = document.querySelector('select[name="assignee_id"]');
    const authorSelect = document.querySelector('select[name="author_id"]');
    const projectSelect = document.querySelector('select[name="project_id"]');
    
    const contactOptions = `<option value="">-- Не выбрано --</option>` + contacts.map(c => `<option value="${c.id}">${c.last_name} ${c.first_name || ''}</option>`).join('');
    
    if (assigneeSelect) assigneeSelect.innerHTML = contactOptions;
    if (authorSelect) authorSelect.innerHTML = contactOptions;

    if (projectSelect) {
        const projectOptions = `<option value="">-- Без проекта --</option>` + projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
        projectSelect.innerHTML = projectOptions;
    }
}

function handleUrlRouting(addToHistory = false) {
    const path = window.location.pathname;
    let initialView = 'dashboard';

    if (path === '/contacts') initialView = 'contacts';
    else if (path === '/tasks') initialView = 'tasks';
    else if (path === '/projects') initialView = 'projects';
    else if (path === '/kb') initialView = 'kb';
    
    const projectMatch = path.match(/^\/projects\/(\d+)$/);
    if (projectMatch) {
        const projectId = projectMatch[1];
        switchView('projects', false); 
        ProjectController.openProjectDetail(projectId);
        return; 
    }
    
    if (initialView === 'dashboard') {
        Dashboard.init();
    }

    switchView(initialView, addToHistory);
}