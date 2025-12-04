let contactsData = [];
let contactTypes = [];
let tasksData = [];
let taskStatuses = [];
let allTags = []; // Кэш всех тегов для автокомплита

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    
    await Promise.all([
        loadContactTypes(),
        loadTaskStatuses(),
        loadAllTags()
    ]);
    
    await loadContacts();
    await loadTasks();
    
    // Инициализация менеджеров тегов для форм
    window.contactTagManager = new TagManager('contact-tags-container');
    window.taskTagManager = new TagManager('task-tags-container');

    const contactForm = document.getElementById('contact-form');
    if (contactForm) contactForm.addEventListener('submit', handleContactFormSubmit);
    
    const taskForm = document.getElementById('task-form');
    if (taskForm) taskForm.addEventListener('submit', handleTaskFormSubmit);

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.currentTarget.id.replace('nav-', '');
            switchView(viewName, true, new URL(e.currentTarget.href).pathname);
        });
    });

    const path = window.location.pathname;
    let initialView = 'dashboard';
    if (path === '/contacts') initialView = 'contacts';
    if (path === '/tasks') initialView = 'tasks';
    switchView(initialView, false);
});

// --- TAG MANAGER CLASS (Chips Input Logic) ---
class TagManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tags = []; // Массив строк
        if (this.container) {
            this.input = this.container.querySelector('input');
            this.renderArea = this.container.querySelector('.tags-render-area');
            this.initEvents();
        }
    }

    initEvents() {
        if (!this.input) return;
        
        // Обработка ввода
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTagFromInput();
            }
        });
        
        // Добавление по потере фокуса (опционально)
        this.input.addEventListener('blur', () => {
            this.addTagFromInput();
        });
    }

    addTagFromInput() {
        const val = this.input.value.trim();
        if (val) {
            // Не добавляем дубликаты
            if (!this.tags.includes(val.toLowerCase())) {
                this.tags.push(val.toLowerCase());
                this.render();
            }
            this.input.value = '';
        }
    }

    addTags(tagsArray) {
        // Принимает массив строк
        this.tags = tagsArray.map(t => t.toLowerCase());
        this.render();
    }
    
    clear() {
        this.tags = [];
        this.input.value = '';
        this.render();
    }
    
    getTags() {
        // Если что-то осталось в инпуте, тоже считаем тегом
        this.addTagFromInput();
        return this.tags;
    }

    removeTag(index) {
        this.tags.splice(index, 1);
        this.render();
    }

    render() {
        if (!this.renderArea) return;
        this.renderArea.innerHTML = this.tags.map((tag, index) => `
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-700 mr-2 mb-1">
                ${tag}
                <button type="button" onclick="window.removeTag('${this.container.id}', ${index})" class="ml-1 text-primary-500 hover:text-primary-900 focus:outline-none">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </span>
        `).join('');
        if (window.lucide) lucide.createIcons();
    }
}

// Глобальная функция для удаления тега (так как HTML генерится строкой)
window.removeTag = function(containerId, index) {
    if (containerId === 'contact-tags-container') window.contactTagManager.removeTag(index);
    if (containerId === 'task-tags-container') window.taskTagManager.removeTag(index);
};

// --- HELPERS ---
async function loadAllTags() { allTags = await API.getTags(); } // Можно использовать для автокомплита в будущем

// --- RENDER HELPERS (Badges) ---
function renderTagsHtml(tagsList) {
    if (!tagsList || !tagsList.length) return '';
    return `<div class="flex flex-wrap gap-1 mt-1">` + 
           tagsList.map(t => `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">#${t.name}</span>`).join('') + 
           `</div>`;
}

// --- UPDATED RENDER FUNCTIONS ---
function renderContactList() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    const search = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : '';

    const filtered = contactsData.filter(c => {
        const fullName = `${c.last_name} ${c.first_name} ${c.middle_name}`.toLowerCase();
        // Поиск также по тегам
        const tagsString = c.tags ? c.tags.map(t => t.name).join(' ') : '';
        return fullName.includes(search) || (c.department && c.department.toLowerCase().includes(search)) || tagsString.includes(search);
    });

    if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="px-6 text-center py-8 text-slate-400">Ничего не найдено</td></tr>'; return; }

    tbody.innerHTML = filtered.map(c => {
        const fullName = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
        const initial = c.last_name ? c.last_name.charAt(0).toUpperCase() : '?';
        const typeColor = c.type ? c.type.render_color : '#cbd5e1';
        
        return `
        <tr class="hover:bg-slate-50 transition-colors group" style="border-left: 4px solid ${typeColor};">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600">${initial}</div>
                    <div>
                        <div class="text-sm font-medium text-slate-900">${fullName} ${c.link ? `<a href="${c.link}" target="_blank" class="text-primary-600 ml-1"><i data-lucide="external-link" class="w-3 h-3 inline"></i></a>` : ''}</div>
                        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${c.type ? c.type.name_type : ''}</div>
                    </div>
                </div>
                ${renderTagsHtml(c.tags)} <!-- TAGS HERE -->
            </td>
            <td class="px-6 py-4"><div class="text-sm">${c.department || '-'}</div><div class="text-xs text-slate-500">${c.role || ''}</div></td>
            <td class="px-6 py-4 text-sm text-slate-500"><div>${c.email || ''}</div><div>${c.phone || ''}</div></td>
            <td class="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">${c.notes || ''}</td>
            <td class="px-6 py-4 text-right">
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editContact(${c.id})" class="p-1 text-slate-400 hover:text-primary-600"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteContact(${c.id})" class="p-1 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function renderTaskList() {
    const container = document.getElementById('tasks-container');
    if (!container) return;
    if (tasksData.length === 0) { container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400">Нет задач.</div>`; return; }

    container.innerHTML = tasksData.map(t => {
        const statusColor = t.status ? t.status.color : '#cbd5e1';
        let contactsHtml = '';
        if (t.assignee || t.author) {
            contactsHtml += '<div class="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1">';
            if (t.assignee) contactsHtml += `<div class="flex items-center text-xs text-slate-600"><i data-lucide="user" class="w-3 h-3 mr-2 text-primary-600"></i>${t.assignee.last_name}</div>`;
            if (t.author) contactsHtml += `<div class="flex items-center text-xs text-slate-600"><i data-lucide="crown" class="w-3 h-3 mr-2 text-amber-500"></i>${t.author.last_name}</div>`;
            contactsHtml += '</div>';
        }

        return `
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative group" style="border-left: 4px solid ${statusColor}">
            <div class="flex justify-between items-start mb-2">
                <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white tracking-wider" style="background-color: ${statusColor}">${t.status ? t.status.name : ''}</span>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onclick="editTask(${t.id})" class="text-slate-400 hover:text-primary-600"><i data-lucide="edit-2" class="w-3 h-3"></i></button>
                    <button onclick="deleteTask(${t.id})" class="text-slate-400 hover:text-red-600"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                </div>
            </div>
            <h3 class="font-semibold text-slate-800 text-sm leading-tight mb-1">${t.title}</h3>
            ${renderTagsHtml(t.tags)} <!-- TAGS HERE -->
            ${t.description ? `<p class="text-xs text-slate-500 line-clamp-2 mt-2">${t.description}</p>` : ''}
            ${t.due_date ? `<div class="flex items-center text-xs text-slate-500 mt-2"><i data-lucide="calendar" class="w-3 h-3 mr-1"></i> ${t.due_date}</div>` : ''}
            ${contactsHtml}
        </div>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

// --- MODALS UPDATE ---
function openModal(contactId = null) {
    const modal = document.getElementById('contact-modal');
    const form = document.getElementById('contact-form');
    modal.classList.remove('hidden');
    window.contactTagManager.clear(); // Сброс тегов

    if (contactId) {
        const contact = contactsData.find(c => c.id === contactId);
        if (!contact) return;
        // Заполнение полей... (как было)
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
        
        // Заполнение тегов
        if (contact.tags) {
            window.contactTagManager.addTags(contact.tags.map(t => t.name));
        }
    } else {
        form.reset();
        form.querySelector('[name="id"]').value = "";
    }
}

function openTaskModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    modal.classList.remove('hidden');
    window.taskTagManager.clear(); // Сброс тегов

    if (taskId) {
        const task = tasksData.find(t => t.id === taskId);
        if (!task) return;
        // Заполнение полей... (как было)
        form.querySelector('[name="id"]').value = task.id;
        form.querySelector('[name="title"]').value = task.title;
        form.querySelector('[name="due_date"]').value = task.due_date || '';
        form.querySelector('[name="description"]').value = task.description || '';
        if (task.status_id) form.querySelector('select[name="status_id"]').value = task.status_id;
        form.querySelector('select[name="assignee_id"]').value = task.assignee_id || '';
        form.querySelector('select[name="author_id"]').value = task.author_id || '';
        
        // Заполнение тегов
        if (task.tags) {
            window.taskTagManager.addTags(task.tags.map(t => t.name));
        }
    } else {
        form.reset();
        form.querySelector('[name="id"]').value = "";
    }
}

// --- SUBMITS UPDATE ---
async function handleContactFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Добавляем теги в данные
    data.tags = window.contactTagManager.getTags();

    const id = data.id;
    let success = id ? await API.updateContact(id, data) : await API.createContact(data);
    if (success) { closeModal(); e.target.reset(); loadContacts(); loadAllTags(); } // Обновляем и теги
    else alert('Ошибка');
}

async function handleTaskFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Добавляем теги в данные
    data.tags = window.taskTagManager.getTags();

    const id = data.id;
    let success = id ? await API.updateTask(id, data) : await API.createTask(data);
    if (success) { closeTaskModal(); e.target.reset(); loadTasks(); loadAllTags(); }
    else alert('Ошибка');
}

// ... остальное (switchView, loaders) без изменений, но убедитесь что они есть ...
function switchView(viewName, addToHistory = true, path) { /* ... из старого main.js */ 
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-primary-600', 'bg-primary-50');
        btn.classList.add('text-slate-600');
    });
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) {
        activeBtn.classList.add('text-primary-600', 'bg-primary-50');
        activeBtn.classList.remove('text-slate-600');
    }
    if (addToHistory && path) history.pushState({ view: viewName }, '', path);
}
window.onpopstate = function(event) { /* ... */ };
async function loadContactTypes() { /* ... */ contactTypes = await API.getContactTypes(); const s = document.querySelector('select[name="type_id"]'); if(s) s.innerHTML = contactTypes.map(t=>`<option value="${t.id}">${t.name_type}</option>`).join(''); }
async function loadTaskStatuses() { /* ... */ taskStatuses = await API.getTaskStatuses(); const s = document.querySelector('select[name="status_id"]'); if(s) s.innerHTML = taskStatuses.map(t=>`<option value="${t.id}">${t.name}</option>`).join(''); }
async function loadContacts() { contactsData = await API.getContacts(); renderContactList(); updateTaskContactSelects(); }
function updateTaskContactSelects() { /* ... */ const assigneeSelect = document.querySelector('select[name="assignee_id"]'); const authorSelect = document.querySelector('select[name="author_id"]'); const options = `<option value="">-- Не выбрано --</option>` + contactsData.map(c => `<option value="${c.id}">${c.last_name} ${c.first_name || ''}</option>`).join(''); if(assigneeSelect) assigneeSelect.innerHTML = options; if(authorSelect) authorSelect.innerHTML = options;}
async function loadTasks() { tasksData = await API.getTasks(); renderTaskList(); }
function closeModal() { document.getElementById('contact-modal').classList.add('hidden'); }
function closeTaskModal() { document.getElementById('task-modal').classList.add('hidden'); }
window.editContact = (id) => openModal(id);
window.deleteContact = async (id) => { if (confirm('Удалить?')) { if (await API.deleteContact(id)) loadContacts(); } };
window.editTask = (id) => openTaskModal(id);
window.deleteTask = async (id) => { if (confirm('Удалить?')) { if (await API.deleteTask(id)) loadTasks(); } };