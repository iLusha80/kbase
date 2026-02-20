import API from './api.js';
import { switchView, navigateBack } from './utils/router.js';
import { initModals, openModal, closeModal } from './components/Modal.js';
import TagManager from './components/TagManager.js';
import ThemeManager from './components/ThemeManager.js';
import Dashboard from './components/Dashboard.js';
import GlobalSearch from './components/GlobalSearch.js';
import Inbox from './components/Inbox.js';

import { TaskController } from './controllers/TaskController.js';
import { ContactController } from './controllers/ContactController.js';
import { ProjectController } from './controllers/ProjectController.js';
import { ReportController } from './controllers/ReportController.js';
import { MeetingController } from './controllers/MeetingController.js';

const viewPaths = {
    'dashboard': '/',
    'inbox': '/inbox',
    'contacts': '/contacts',
    'tasks': '/tasks',
    'projects': '/projects',
    'kb': '/kb',
    'meetings': '/meetings',
    'reports-weekly': '/reports/weekly'
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
    window.navigateBack = navigateBack;

    window.contactTagManager = new TagManager('contact-tags-container');
    window.taskTagManager = new TagManager('task-tags-container');

    GlobalSearch.init();

    ContactController.init();
    TaskController.init();
    MeetingController.init();
    ReportController.init();
    
    // Dropdown toggle for Reports
    const reportsToggle = document.getElementById('nav-reports-toggle');
    const reportsMenu = document.getElementById('reports-menu');
    const reportsDropdown = document.getElementById('reports-dropdown');

    if (reportsToggle && reportsMenu) {
        reportsToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            reportsMenu.classList.toggle('hidden');
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (reportsDropdown && !reportsDropdown.contains(e.target)) {
                reportsMenu.classList.add('hidden');
            }
        });
    }

    // Инициализация дашборда
    Dashboard.setup();

    // --- HOTKEYS & UI HINTS ---
    setupHotkeysAndHints();

    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Ищем ближайший элемент с data-view, так как клик может быть по иконке внутри
            const target = e.target.closest('[data-view]');
            if (target) {
                const viewName = target.dataset.view;
                const path = viewPaths[viewName] || '/';

                if (viewName === 'dashboard') {
                    Dashboard.init();
                }

                // Load Inbox data when switching to inbox view
                if (viewName === 'inbox') {
                    Inbox.init();
                }

                // Load Meetings data when switching to meetings view
                if (viewName === 'meetings') {
                    MeetingController.loadAll();
                }

                // Load Report Data if switching to report view
                if (viewName === 'reports-weekly') {
                    ReportController.loadWeeklyReport();
                    // Закрываем меню, если кликнули
                    if (reportsMenu) reportsMenu.classList.add('hidden');
                }

                switchView(viewName, true, path);
            }
        });
    });

    window.addEventListener('popstate', (event) => {
        handleUrlRouting(false);
    });

    await loadInitialData();
    
    // Check initial routing before loading dashboard default
    handleUrlRouting(false);
});

// --- UPDATED: Helper for Hotkeys and Visible Hints ---
function setupHotkeysAndHints() {
    // 1. Detect OS
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKeySymbol = isMac ? '⌘' : 'Ctrl';

    // 2. Global Hotkey Listener (Cmd+J for New Task, Cmd+Shift+J for Quick Capture)
    document.addEventListener('keydown', (e) => {
        // Cmd+Shift+J → Quick Capture (проверяем первым, т.к. включает Shift)
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyJ') {
            e.preventDefault();
            const modal = document.getElementById('quick-task-modal');
            if (modal && modal.classList.contains('hidden')) {
                window.openQuickTaskModal();
            }
            return;
        }
        // Cmd+J → Полная форма новой задачи
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
        btn.title = `Новая задача (${modKeySymbol}J)`; 
        const textSpan = btn.querySelector('span');
        if (textSpan) {
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

    await MeetingController.loadMeetingTypes();
    await MeetingController.loadAll();

    updateTaskSelects(contacts, ProjectController.getData());
    MeetingController.populateParticipantSelect(contacts);

    // Populate project select in meeting modal
    updateMeetingProjectSelect(ProjectController.getData());

    // Обновляем счётчик inbox
    await updateInboxBadge();
}

async function updateInboxBadge() {
    const tasks = await API.getTasks();
    const inboxCount = (tasks || []).filter(t => {
        const isDone = t.status && t.status.name === 'Готово';
        return !isDone && (!t.assignee_id || !t.due_date);
    }).length;

    const badge = document.getElementById('inbox-badge');
    if (badge) {
        if (inboxCount > 0) {
            badge.textContent = inboxCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

window.updateInboxBadge = updateInboxBadge;

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

function updateMeetingProjectSelect(projects) {
    const select = document.querySelector('#meeting-form select[name="project_id"]');
    if (select) {
        select.innerHTML = `<option value="">-- Без проекта --</option>` +
            projects.map(p => `<option value="${p.id}">${p.title}</option>`).join('');
    }
}

// Export MeetingController for cross-controller access
window.MeetingController = MeetingController;

function handleUrlRouting(addToHistory = false) {
    const path = window.location.pathname;
    let initialView = 'dashboard';

    if (path === '/inbox') {
        initialView = 'inbox';
        Inbox.init();
    }
    else if (path === '/contacts') initialView = 'contacts';
    else if (path === '/tasks') initialView = 'tasks';
    else if (path === '/projects') initialView = 'projects';
    else if (path === '/kb') initialView = 'kb';
    else if (path === '/meetings') {
        initialView = 'meetings';
        MeetingController.loadAll();
    }
    else if (path === '/reports/weekly') {
        initialView = 'reports-weekly';
        ReportController.loadWeeklyReport();
    }

    // Meeting Detail
    const meetingMatch = path.match(/^\/meetings\/(\d+)$/);
    if (meetingMatch) {
        const meetingId = meetingMatch[1];
        switchView('meetings', false);
        MeetingController.openMeetingDetail(parseInt(meetingId));
        return;
    }

    // Project Detail
    const projectMatch = path.match(/^\/projects\/(\d+)$/);
    if (projectMatch) {
        const projectId = projectMatch[1];
        switchView('projects', false); 
        ProjectController.openProjectDetail(projectId);
        return; 
    }

    // Contact Detail
    const contactMatch = path.match(/^\/contacts\/(\d+)$/);
    if (contactMatch) {
        const contactId = contactMatch[1];
        switchView('contacts', false); 
        ContactController.openContactDetail(contactId);
        return; 
    }

    // Task Detail
    const taskMatch = path.match(/^\/tasks\/(\d+)$/);
    if (taskMatch) {
        const taskId = taskMatch[1];
        switchView('tasks', false);
        TaskController.openTaskDetail(taskId);
        return; 
    }
    
    if (initialView === 'dashboard') {
        Dashboard.init();
    }

    switchView(initialView, addToHistory);
}
