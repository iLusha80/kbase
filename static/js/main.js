let contactsData = [];
let contactTypes = []; // Глобальная переменная для типов

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    
    // Сначала грузим справочники, потом данные
    await loadContactTypes(); 
    await loadContacts();
    
    const form = document.getElementById('contact-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Nav logic
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const path = new URL(e.currentTarget.href).pathname;
            if (path === '/contacts') {
                e.preventDefault();
                switchView('contacts', true, '/contacts');
            } else if (path === '/') {
                e.preventDefault();
                switchView('dashboard', true, '/');
            }
        });
    });

    const path = window.location.pathname;
    let initialView = 'dashboard';
    if (path === '/contacts') {
        initialView = 'contacts';
    }
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

    if (addToHistory && path && window.location.pathname !== path) {
        history.pushState({ view: viewName }, '', path);
    }
}

window.onpopstate = function(event) {
    const path = window.location.pathname;
    let view = 'dashboard';
    if (path === '/contacts') {
        view = 'contacts';
    }
    switchView(view, false);
};


// --- DATA LOGIC ---

async function loadContactTypes() {
    contactTypes = await API.getContactTypes();
    // Наполняем селект в модалке один раз при загрузке
    const select = document.querySelector('select[name="type_id"]');
    if (select && contactTypes.length > 0) {
        select.innerHTML = contactTypes.map(t => 
            `<option value="${t.id}">${t.name_type}</option>`
        ).join('');
    }
}

async function loadContacts() {
    contactsData = await API.getContacts();
    renderContactList();
}

function renderContactList() {
    const tbody = document.getElementById('contacts-table-body');
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (!tbody) return;

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
        
        // Логика цвета
        const typeColor = c.type ? c.type.render_color : '#cbd5e1'; // дефолтный серый
        const typeName = c.type ? c.type.name_type : '';
        
        // Применяем стиль border-left прямо к строке
        return `
        <tr class="hover:bg-slate-50 transition-colors group" style="border-left: 4px solid ${typeColor};">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600">
                        ${initial}
                    </div>
                    <div>
                        <div class="text-sm font-medium text-slate-900">
                            ${fullName}
                            ${getLinkHtml(c.link)}
                        </div>
                        <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">${typeName}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-slate-900">${c.department || '-'}
                <div class="text-xs text-slate-500">${c.role || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500">
                <div>${c.email || ''}</div>
                <div>${c.phone || ''}</div>
            </td>
            <td class="px-6 py-4 text-sm text-slate-500 italic max-w-xs truncate">
                ${c.notes || ''}
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="editContact(${c.id})" class="p-1 text-slate-400 hover:text-primary-600" title="Редактировать">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteContact(${c.id})" class="p-1 text-slate-400 hover:text-red-600" title="Удалить">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `}).join('');
    
    if (window.lucide) lucide.createIcons();
}

// --- MODAL & ACTIONS LOGIC ---

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
        
        // Установка типа
        if (contact.type_id) {
            typeSelect.value = contact.type_id;
        }

    } else {
        titleText.textContent = "Новый контакт";
        form.reset();
        form.querySelector('[name="id"]').value = "";
        
        // Установка дефолтного значения (Контрагенты)
        const defaultType = contactTypes.find(t => t.name_type === 'Контрагенты');
        if (defaultType) {
            typeSelect.value = defaultType.id;
        }
    }
}

window.editContact = function(id) {
    openModal(id);
};

window.deleteContact = async function(id) {
    if (confirm('Вы уверены, что хотите удалить этот контакт?')) {
        const success = await API.deleteContact(id);
        if (success) {
            await loadContacts();
        } else {
            alert('Ошибка при удалении');
        }
    }
};

function closeModal() {
    document.getElementById('contact-modal').classList.add('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const id = data.id;
    let success = false;

    if (id) {
        success = await API.updateContact(id, data);
    } else {
        delete data.id;
        success = await API.createContact(data);
    }

    if (success) {
        closeModal();
        e.target.reset();
        loadContacts();
    } else {
        alert('Ошибка при сохранении');
    }
}