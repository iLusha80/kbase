let contactsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация иконок
    if (window.lucide) lucide.createIcons();
    
    // Загрузка данных
    await loadContacts();
    
    // Навешиваем обработчик на форму
    const form = document.getElementById('contact-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Управление навигацией
    window.addEventListener('popstate', handlePopState);
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const viewName = e.currentTarget.id.replace('nav-', '');
            switchView(viewName, true); 
        });
    });

    // Первоначальная загрузка вида
    const initialView = location.hash.replace('#', '') || 'dashboard';
    switchView(initialView, false);
});

// --- UI LOGIC ---
function switchView(viewName, addToHistory = true) {
    // Скрываем все секции
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    
    // Показываем нужную
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');
    
    // Обновляем навигацию (подсветка кнопок)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        // Сброс стилей
        btn.classList.remove('text-primary-600', 'bg-primary-50');
        btn.classList.add('text-slate-600');
    });
    
    // Активная кнопка
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) {
        activeBtn.classList.add('text-primary-600', 'bg-primary-50');
        activeBtn.classList.remove('text-slate-600');
    }

    // Управление историей браузера
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
    
    if (!tbody) {
        console.warn('Таблица контактов не найдена!'); 
        return; 
    }

    const filtered = contactsData.filter(c => 
        (c.name && c.name.toLowerCase().includes(search)) ||
        (c.department && c.department.toLowerCase().includes(search))
    );

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-slate-400">Ничего не найдено</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-3 text-slate-600">
                        ${c.name.charAt(0)}
                    </div>
                    <div class="text-sm font-medium text-slate-900">${c.name}</div>
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
        </tr>
    `).join('');
}

// --- MODAL LOGIC ---
function openModal() {
    document.getElementById('contact-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('contact-modal').classList.add('hidden');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const success = await API.createContact(data);
    if (success) {
        closeModal();
        e.target.reset();
        loadContacts(); // Обновляем таблицу
    } else {
        alert('Ошибка при сохранении контакта');
    }
}