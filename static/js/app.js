import API from './api.js';
import { switchView } from './utils/router.js';
import { initModals, openModal, closeModal } from './components/Modal.js';
import { renderTasks } from './components/TaskList.js';
import { renderContacts } from './components/ContactList.js';
import TagManager from './components/TagManager.js';

let contactsData = [];
let tasksData = [];

document.addEventListener('DOMContentLoaded', async () => {
    const api = new API();
    window.api = api; // Сделаем api глобальным для доступа из любого места

    if (window.lucide) {
        lucide.createIcons();
    }

    initModals();

    // Инициализация менеджеров тегов
    window.contactTagManager = new TagManager('contact-tags-container');
    window.taskTagManager = new TagManager('task-tags-container');

    // Настройка навигации
    document.querySelectorAll('[data-view]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(button.dataset.view);
        });
    });
    
    // Обработчики отправки форм
    const contactForm = document.getElementById('contact-form');
    if (contactForm) contactForm.addEventListener('submit', handleContactFormSubmit);
    
    const taskForm = document.getElementById('task-form');
    if (taskForm) taskForm.addEventListener('submit', handleTaskFormSubmit);

    // Загрузка начальных данных
    await loadInitialData();

    // Первоначальное отображение
    const path = window.location.pathname;
    let initialView = 'dashboard';
    if (path === '/contacts') initialView = 'contacts';
    if (path === '/tasks') initialView = 'tasks';
    switchView(initialView, false);
});

async function loadInitialData() {
    await Promise.all([
        loadContactTypes(),
        loadTaskStatuses(),
        loadAllTags(),
        loadContacts(),
        loadTasks()
    ]);
}

async function loadContacts() {
    contactsData = await api.getContacts();
    renderContacts(contactsData);
    updateTaskContactSelects();
}

async function loadTasks() {
    tasksData = await api.getTasks();
    renderTasks(tasksData);
}

async function loadContactTypes() {
    const contactTypes = await api.getContactTypes();
    const select = document.querySelector('select[name="type_id"]');
    if (select) {
        select.innerHTML = contactTypes.map(t => `<option value="${t.id}">${t.name_type}</option>`).join('');
    }
}

async function loadTaskStatuses() {
    const taskStatuses = await api.getTaskStatuses();
    const select = document.querySelector('select[name="status_id"]');
    if (select) {
        select.innerHTML = taskStatuses.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
}

async function loadAllTags() {
    // В будущем можно использовать для автодополнения
    window.allTags = await api.getTags();
}

function updateTaskContactSelects() {
    const assigneeSelect = document.querySelector('select[name="assignee_id"]');
    const authorSelect = document.querySelector('select[name="author_id"]');
    const options = `<option value="">-- Не выбрано --</option>` + contactsData.map(c => `<option value="${c.id}">${c.last_name} ${c.first_name || ''}</option>`).join('');
    if (assigneeSelect) assigneeSelect.innerHTML = options;
    if (authorSelect) authorSelect.innerHTML = options;
}

// --- ОБРАБОТКА ФОРМ ---

async function handleContactFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.tags = window.contactTagManager.getTags();

    const id = data.id;
    let success = id ? await api.updateContact(id, data) : await api.createContact(data);
    if (success) {
        closeModal('contact-modal');
        e.target.reset();
        loadContacts();
        loadAllTags();
    } else {
        alert('Ошибка при сохранении контакта');
    }
}

async function handleTaskFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.tags = window.taskTagManager.getTags();

    const id = data.id;
    let success = id ? await api.updateTask(id, data) : await api.createTask(data);
    if (success) {
        closeModal('task-modal');
        e.target.reset();
        loadTasks();
        loadAllTags();
    } else {
        alert('Ошибка при сохранении задачи');
    }
}

// --- ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ВЫЗОВА ИЗ HTML ---

window.removeTag = function(containerId, index) {
    if (containerId === 'contact-tags-container') window.contactTagManager.removeTag(index);
    if (containerId === 'task-tags-container') window.taskTagManager.removeTag(index);
};

window.editContact = (id) => {
    const form = document.getElementById('contact-form');
    openModal('contact-modal');
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
    
    if (contact.tags) {
        window.contactTagManager.addTags(contact.tags.map(t => t.name));
    }
};

window.deleteContact = async (id) => {
    if (confirm('Вы уверены, что хотите удалить этот контакт?')) {
        if (await api.deleteContact(id)) {
            loadContacts();
        }
    }
};

window.editTask = (id) => {
    const form = document.getElementById('task-form');
    openModal('task-modal');
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
    
    if (task.tags) {
        window.taskTagManager.addTags(task.tags.map(t => t.name));
    }
};

window.deleteTask = async (id) => {
    if (confirm('Вы уверены, что хотите удалить эту задачу?')) {
        if (await api.deleteTask(id)) {
            loadTasks();
        }
    }
};