let contactsData = [];
let contactTypes = [];
let tasksData = [];
let taskStatuses = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    
    // Грузим справочники
    await Promise.all([
        loadContactTypes(),
        loadTaskStatuses()
    ]);
    
    // Грузим данные
    await loadContacts();
    await loadTasks();
    
    // Forms
    const contactForm = document.getElementById('contact-form');
    if (contactForm) contactForm.addEventListener('submit', handleContactFormSubmit);
    
    const taskForm = document.getElementById('task-form');
    if (taskForm) taskForm.addEventListener('submit', handleTaskFormSubmit);

    // Nav logic
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const path = new URL(e.currentTarget.href).pathname;
            e.preventDefault();
            const viewName = e.currentTarget.id.replace('nav-', '');
            switchView(viewName, true, path);
        });
    });

    // Routing
    const path = window.location.pathname;
    let initialView = 'dashboard';
    if (path === '/contacts') initialView = 'contacts';
    if (path === '/tasks') initialView = 'tasks';
    switchView(initialView, false);
});

// --- UI LOGIC ---
function switchView(viewName, addToHistory = true, path) {
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

    if (addToHistory && path) {
        history.pushState({ view: viewName }, '', path);
    }
}

window.onpopstate = function(event) {
    const path = window.location.pathname;
    let view = 'dashboard';
    if (path === '/contacts') view = 'contacts';
    if (path === '/tasks') view = 'tasks';
    switchView(view, false);
};


// --- LOADERS ---
async function loadContactTypes() {
    contactTypes = await API.getContactTypes();
    const select = document.querySelector('select[name="type_id"]');
    if (select && contactTypes.length) {
        select.innerHTML = contactTypes.map(t => `<option value="${t.id}">${t.name_type}</option>`).join('');
    }
}

async function loadTaskStatuses() {
    taskStatuses = await API.getTaskStatuses();
    const select = document.querySelector('select[name="status_id"]');
    if (select && taskStatuses.length) {
        select.innerHTML = taskStatuses.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }
}

// --- CONTACTS LOGIC ---
async function loadContacts() {
    contactsData = await API.getContacts();
    renderContactList();
    
    // Обновляем селекты в форме задач (исполнитель/заказчик)
    updateTaskContactSelects();
}

function updateTaskContactSelects() {
    const assigneeSelect = document.querySelector('select[name="assignee_id"]');
    const authorSelect = document.querySelector('select[name="author_id"]');
    
    const options = `<option value="">-- Не выбрано --</option>` + 
        contactsData.map(c => {
            const name = `${c.last_name} ${c.first_name || ''}`.trim();
            return `<option value="${c.id}">${name}</option>`;
        }).join('');
        
    if (assigneeSelect) assigneeSelect.innerHTML = options;
    if (authorSelect) authorSelect.innerHTML = options;
}

function renderContactList() {
    const tbody = document.getElementById('contacts-table-body');
    if (!tbody) return;
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';

    const filtered = contactsData.filter(c => {
        const fullName = `${c.last_name || ''} ${c.first_name || ''} ${c.middle_name || ''}`.toLowerCase();
        return fullName.includes(search) || (c.department && c.department.toLowerCase().includes(search));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">Ничего не найдено</td></tr>';
        return;
    }

    const getLinkHtml = (link) => link ? 
        `<a href="${link}" target="_blank" class="text-primary-600 hover:underline ml-2" title="Открыть ссылку"><i data-lucide="external-link" class="w-3 h-3 inline"></i></a>` : '';

    tbody.innerHTML = filtered.map(c => {
        const fullName = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
        const initial = c.last_name ? c.last_name.charAt(0).toUpperCase() : '?';
        const typeColor = c.type ? c.type.render_color : '#cbd5e1';
        const typeName = c.type ? c.type.name_type : '';
        
        return `
        <tr class="hover:bg-slate-50 transition-colors group" style="border-left: 4px solid ${typeColor};">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600">
                        ${initial}
                    </div>
                    <div>
                        <div class="text-sm font-medium text-slate-900">${fullName}${getLinkHtml(c.link)}</div>
                        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${typeName}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-slate-900">${c.department || '-'}</div>
                <div class="text-xs text-slate-500">${c.role || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500">
                <div>${c.email || ''}</div>
                <div>${c.phone || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">${c.notes || ''}</td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editContact(${c.id})" class="p-1 text-slate-400 hover:text-primary-600"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="deleteContact(${c.id})" class="p-1 text-slate-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>
        </tr>
    `}).join('');
    if (window.lucide) lucide.createIcons();
}

// --- TASKS LOGIC ---
async function loadTasks() {
    tasksData = await API.getTasks();
    renderTaskList();
}

function renderTaskList() {
    const container = document.getElementById('tasks-container');
    if (!container) return;

    if (tasksData.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-slate-400">Нет задач. Создайте первую!</div>`;
        return;
    }

    container.innerHTML = tasksData.map(t => {
        const statusColor = t.status ? t.status.color : '#cbd5e1';
        const statusName = t.status ? t.status.name : 'Unknown';
        
        // Date formatting
        let dateHtml = '';
        if (t.due_date) {
            const dateObj = new Date(t.due_date);
            const isOverdue = dateObj < new Date().setHours(0,0,0,0) && statusName !== 'Готово';
            const dateClass = isOverdue ? 'text-red-600 font-medium' : 'text-slate-500';
            dateHtml = `<div class="flex items-center text-xs ${dateClass} mt-2"><i data-lucide="calendar" class="w-3 h-3 mr-1"></i> ${t.due_date}</div>`;
        }

        // Contacts visualization
        let contactsHtml = '';
        if (t.assignee || t.author) {
            contactsHtml += '<div class="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1">';
            if (t.assignee) {
                contactsHtml += `
                <div class="flex items-center text-xs text-slate-600" title="Исполнитель">
                    <i data-lucide="user" class="w-3 h-3 mr-2 text-primary-600"></i> 
                    <span class="truncate">${t.assignee.last_name} ${t.assignee.first_name || ''}</span>
                </div>`;
            }
            if (t.author) {
                contactsHtml += `
                <div class="flex items-center text-xs text-slate-600" title="Заказчик">
                    <i data-lucide="crown" class="w-3 h-3 mr-2 text-amber-500"></i> 
                    <span class="truncate">${t.author.last_name} ${t.author.first_name || ''}</span>
                </div>`;
            }
            contactsHtml += '</div>';
        }

        return `
        <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow relative group" 
             style="border-left: 4px solid ${statusColor}">
            
            <div class="flex justify-between items-start mb-2">
                <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white tracking-wider" style="background-color: ${statusColor}">
                    ${statusName}
                </span>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editTask(${t.id})" class="text-slate-400 hover:text-primary-600"><i data-lucide="edit-2" class="w-3 h-3"></i></button>
                    <button onclick="deleteTask(${t.id})" class="text-slate-400 hover:text-red-600"><i data-lucide="trash-2" class="w-3 h-3"></i></button>
                </div>
            </div>

            <h3 class="font-semibold text-slate-800 text-sm leading-tight mb-1">${t.title}</h3>
            ${t.description ? `<p class="text-xs text-slate-500 line-clamp-2">${t.description}</p>` : ''}
            
            ${dateHtml}
            ${contactsHtml}
        </div>
        `;
    }).join('');

    if (window.lucide) lucide.createIcons();
}

// --- MODALS ---

// Contact Modal
function openModal(contactId = null) {
    const modal = document.getElementById('contact-modal');
    const form = document.getElementById('contact-form');
    const titleText = document.getElementById('modal-title-text');
    const typeSelect = form.querySelector('select[name="type_id"]');

    modal.classList.remove('hidden');

    if (contactId) {
        const contact = contactsData.find(c => c.id === contactId);
        if (!contact) return;
        titleText.textContent = "Редактировать контакт";
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
        if (contact.type_id) typeSelect.value = contact.type_id;
    } else {
        titleText.textContent = "Новый контакт";
        form.reset();
        form.querySelector('[name="id"]').value = "";
        const defaultType = contactTypes.find(t => t.name_type === 'Контрагенты');
        if (defaultType) typeSelect.value = defaultType.id;
    }
}

// Task Modal
function openTaskModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    const titleText = document.getElementById('task-modal-title-text');
    const statusSelect = form.querySelector('select[name="status_id"]');

    modal.classList.remove('hidden');

    if (taskId) {
        const task = tasksData.find(t => t.id === taskId);
        if (!task) return;
        titleText.textContent = "Редактировать задачу";
        form.querySelector('[name="id"]').value = task.id;
        form.querySelector('[name="title"]').value = task.title;
        form.querySelector('[name="due_date"]').value = task.due_date || '';
        form.querySelector('[name="description"]').value = task.description || '';
        
        if (task.status_id) statusSelect.value = task.status_id;
        form.querySelector('select[name="assignee_id"]').value = task.assignee_id || '';
        form.querySelector('select[name="author_id"]').value = task.author_id || '';

    } else {
        titleText.textContent = "Новая задача";
        form.reset();
        form.querySelector('[name="id"]').value = "";
        const defaultStatus = taskStatuses.find(s => s.name === 'К выполнению');
        if (defaultStatus) statusSelect.value = defaultStatus.id;
    }
}

// Actions
window.editContact = (id) => openModal(id);
window.deleteContact = async (id) => {
    if (confirm('Удалить контакт?')) {
        if (await API.deleteContact(id)) loadContacts();
    }
};

window.editTask = (id) => openTaskModal(id);
window.deleteTask = async (id) => {
    if (confirm('Удалить задачу?')) {
        if (await API.deleteTask(id)) loadTasks();
    }
};

function closeModal() { document.getElementById('contact-modal').classList.add('hidden'); }
function closeTaskModal() { document.getElementById('task-modal').classList.add('hidden'); }

// Submits
async function handleContactFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const id = data.id;
    let success = id ? await API.updateContact(id, data) : await API.createContact(data);
    
    if (success) { closeModal(); e.target.reset(); loadContacts(); }
    else alert('Ошибка');
}

async function handleTaskFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const id = data.id;
    let success = id ? await API.updateTask(id, data) : await API.createTask(data);
    
    if (success) { closeTaskModal(); e.target.reset(); loadTasks(); }
    else alert('Ошибка');
}