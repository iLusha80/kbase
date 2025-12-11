import API from './api.js';
import { switchView } from './utils/router.js';
import { initModals, openModal, closeModal } from './components/Modal.js';
import TagManager from './components/TagManager.js';
import ThemeManager from './components/ThemeManager.js';
import Dashboard from './components/Dashboard.js';
import GlobalSearch from './components/GlobalSearch.js'; 

import { TaskController } from './controllers/TaskController.js';
import { ContactController } from './controllers/ContactController.js';
import { ProjectController } from './controllers/ProjectController.js';

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

    window.closeModal = closeModal;
    window.openModal = openModal;

    window.contactTagManager = new TagManager('contact-tags-container');
    window.taskTagManager = new TagManager('task-tags-container');

    GlobalSearch.init();

    ContactController.init();
    TaskController.init();
    
    Dashboard.setup();

    // --- HOTKEYS & UI HINTS ---
    setupHotkeysAndHints();

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

    await loadInitialData();
    
    Dashboard.init();
    handleUrlRouting(false);
});

// --- UPDATED: Helper for Hotkeys and Visible Hints ---
function setupHotkeysAndHints() {
    // 1. Detect OS
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKeySymbol = isMac ? '⌘' : 'Ctrl';

    // 2. Global Hotkey Listener (Cmd+J for New Task)
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.code === 'KeyJ') {
            e.preventDefault();
            const modal = document.getElementById('task-modal');
            if (modal && modal.classList.contains('hidden')) {
                window.openTaskModal();
            }
        }
    });

    // 3. Update Button Hints (Visible text)
    const newTaskBtns = document.querySelectorAll('[onclick="openTaskModal()"]');
    newTaskBtns.forEach(btn => {
        btn.title = `Новая задача (${modKeySymbol}J)`; // Tooltip fallback
        
        // Пытаемся найти текстовый span внутри кнопки
        // В HTML у нас: <i ...></i> <span>Текст</span>
        // На мобильных span скрыт, поэтому hotkey тоже будет скрыт (что логично)
        const textSpan = btn.querySelector('span');
        if (textSpan) {
            // Добавляем красивую полупрозрачную подпись
            const hintSpan = document.createElement('span');
            hintSpan.className = 'ml-1.5 opacity-60 text-[10px] font-normal';
            hintSpan.innerText = `(${modKeySymbol}J)`;
            textSpan.appendChild(hintSpan);
        }
    });
}

async function loadInitialData() {
    await Promise.all([
        loadContactTypes(),
        loadTaskStatuses(),
        loadAllTags()
    ]);

    const contacts = await ContactController.loadAll();
    
    ProjectController.init(contacts);
    await ProjectController.loadAll();
    
    await TaskController.loadAll();
    
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

    const contactMatch = path.match(/^\/contacts\/(\d+)$/);
    if (contactMatch) {
        const contactId = contactMatch[1];
        switchView('contacts', false); 
        ContactController.openContactDetail(contactId);
        return; 
    }
    
    if (initialView === 'dashboard') {
        Dashboard.init();
    }

    switchView(initialView, addToHistory);
}