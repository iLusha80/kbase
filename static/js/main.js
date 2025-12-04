let contactsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    await loadContacts();
    
    const form = document.getElementById('contact-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    window.addEventListener('popstate', handlePopState);
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.currentTarget.id.replace('nav-', '');
            switchView(viewName, true); 
        });
    });

    const initialView = location.hash.replace('#', '') || 'dashboard';
    switchView(initialView, false);
});

// --- UI LOGIC ---
function switchView(viewName, addToHistory = true) {
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

    if (addToHistory) {
        history.pushState({ view: viewName }, '', `#${viewName}`);
    }
}

function handlePopState(event) {
    const view = (event.state && event.state.view) || 'dashboard';
    switchView(view, false);
}

// --- DATA LOGIC ---
async function loadContacts() {
    contactsData = await API.getContacts();
    renderContactList();
}

function renderContactList() {
    const tbody = document.getElementById('contacts-table-body');
    const searchInput = document.getElementById('searchInput');
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (!tbody) return;

    const filtered = contactsData.filter(c => 
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.department && c.department.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-8 text-center text-slate-400">Ничего не найдено</td></tr>';
        return;
    }

    // Вставляем иконку ссылки, если она есть
    const getLinkHtml = (link) => link ? 
        `<a href="${link}" target="_blank" class="text-primary-600 hover:underline ml-2" title="Открыть ссылку"><i data-lucide="external-link" class="w-3 h-3 inline"></i></a>` : '';

    tbody.innerHTML = filtered.map(c => `
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600">
                        ${c.name.charAt(0)}
                    </div>
                    <div class="text-sm font-medium text-slate-900">
                        ${c.name}
                        ${getLinkHtml(c.link)}
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
    `).join('');
    
    // Переинициализация иконок после рендера
    if (window.lucide) lucide.createIcons();
}

// --- MODAL & ACTIONS LOGIC ---

// Функция открытия модалки. Теперь принимает ID контакта (если редактирование)
function openModal(contactId = null) {
    const modal = document.getElementById('contact-modal');
    const form = document.getElementById('contact-form');
    const titleText = document.getElementById('modal-title-text');

    modal.classList.remove('hidden');

    if (contactId) {
        // РЕЖИМ РЕДАКТИРОВАНИЯ
        const contact = contactsData.find(c => c.id === contactId);
        if (!contact) return;

        titleText.textContent = "Редактировать контакт";
        // Заполняем поля
        form.querySelector('[name="id"]').value = contact.id;
        form.querySelector('[name="name"]').value = contact.name;
        form.querySelector('[name="department"]').value = contact.department || '';
        form.querySelector('[name="role"]').value = contact.role || '';
        form.querySelector('[name="email"]').value = contact.email || '';
        form.querySelector('[name="phone"]').value = contact.phone || '';
        form.querySelector('[name="link"]').value = contact.link || '';
        form.querySelector('[name="notes"]').value = contact.notes || '';
    } else {
        // РЕЖИМ СОЗДАНИЯ
        titleText.textContent = "Новый контакт";
        form.reset();
        form.querySelector('[name="id"]').value = ""; // Очищаем ID
    }
}

// Глобальные функции для вызова из HTML (onclick)
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
    
    // Проверяем, есть ли ID (редактирование или создание)
    const id = data.id;
    let success = false;

    if (id) {
        success = await API.updateContact(id, data);
    } else {
        delete data.id; // Удаляем пустой ID перед отправкой
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