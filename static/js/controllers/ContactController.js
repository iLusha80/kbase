import API from '../api.js';
import { renderContacts } from '../components/ContactList.js';
import { closeModal } from '../components/Modal.js';
import { switchView } from '../utils/router.js';

let contactsData = [];

export const ContactController = {
    init() {
        const form = document.getElementById('contact-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchValue = e.target.value.toLowerCase();
                renderContacts(contactsData, searchValue);
            });
        }

        // Global exports
        window.editContact = this.editContact.bind(this);
        window.deleteContact = this.deleteContact.bind(this);
        window.openModal = this.openModal.bind(this); 
        
        // NEW: Open Details
        window.openContactDetail = this.openContactDetail.bind(this);
        
        // NEW: Tab switching logic for Contact Details
        window.switchContactTaskTab = function(tabName) {
            const assignedList = document.getElementById('c-detail-tasks-assigned');
            const authoredList = document.getElementById('c-detail-tasks-authored');
            const btnAssigned = document.getElementById('tab-btn-assigned');
            const btnAuthored = document.getElementById('tab-btn-authored');

            if (tabName === 'assigned') {
                assignedList.classList.remove('hidden');
                authoredList.classList.add('hidden');
                
                btnAssigned.classList.add('border-primary-600', 'text-primary-600');
                btnAssigned.classList.remove('border-transparent', 'text-slate-500');
                
                btnAuthored.classList.remove('border-primary-600', 'text-primary-600');
                btnAuthored.classList.add('border-transparent', 'text-slate-500');
            } else {
                assignedList.classList.add('hidden');
                authoredList.classList.remove('hidden');
                
                btnAuthored.classList.add('border-primary-600', 'text-primary-600');
                btnAuthored.classList.remove('border-transparent', 'text-slate-500');
                
                btnAssigned.classList.remove('border-primary-600', 'text-primary-600');
                btnAssigned.classList.add('border-transparent', 'text-slate-500');
            }
        };
    },

    async loadAll() {
        contactsData = await API.getContacts();
        renderContacts(contactsData);
        if (window.projectContactManager) {
            window.projectContactManager.contactsList = contactsData;
        }
        return contactsData;
    },

    getData() {
        return contactsData;
    },

    // --- NEW: DETAIL VIEW LOGIC ---
    async openContactDetail(id) {
        // Fetch fresh detailed data (with tasks and projects)
        const response = await fetch(`/api/contacts/${id}`);
        if (!response.ok) return;
        const c = await response.json();

        // 1. Sidebar Info
        const fullName = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
        document.getElementById('c-detail-name').innerText = fullName;
        document.getElementById('c-detail-role').innerText = `${c.role || 'Нет должности'} • ${c.department || 'Нет отдела'}`;
        
        // Avatar color based on type
        const initial = c.last_name ? c.last_name.charAt(0).toUpperCase() : '?';
        const avatarEl = document.getElementById('c-detail-avatar');
        avatarEl.innerText = initial;
        
        // Set dynamic colors
        const typeColor = c.type ? c.type.render_color : '#cbd5e1';
        document.getElementById('c-detail-header-bg').style.backgroundColor = typeColor + '40'; // 25% opacity
        avatarEl.style.backgroundColor = typeColor;
        avatarEl.style.color = '#fff';

        // Badges
        const badgesContainer = document.getElementById('c-detail-badges');
        let badgesHtml = '';
        if (c.type) {
            badgesHtml += `<span class="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">${c.type.name_type}</span>`;
        }
        if (c.tags && c.tags.length > 0) {
            badgesHtml += c.tags.map(t => `<span class="px-2 py-0.5 text-xs rounded border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400">#${t.name}</span>`).join('');
        }
        badgesContainer.innerHTML = badgesHtml;

        // Edit Button Action
        document.getElementById('c-detail-edit-btn').onclick = () => this.editContact(c.id);

        // Contact Data
        document.getElementById('c-detail-email').innerText = c.email || '-';
        document.getElementById('c-detail-phone').innerText = c.phone || '-';
        
        const linkContainer = document.getElementById('c-detail-link');
        if (c.link) {
            linkContainer.innerHTML = `<a href="${c.link}" target="_blank" class="flex items-center gap-1"><i data-lucide="external-link" class="w-3 h-3"></i> Открыть</a>`;
        } else {
            linkContainer.innerText = '-';
        }

        // Notes
        const notesBlock = document.getElementById('c-detail-notes-block');
        const notesContent = document.getElementById('c-detail-notes');
        if (c.notes) {
            notesContent.innerText = c.notes;
            notesBlock.classList.remove('hidden');
        } else {
            notesBlock.classList.add('hidden');
        }

        // 2. Projects Block
        const projectsContainer = document.getElementById('c-detail-projects');
        if (c.projects && c.projects.length > 0) {
            projectsContainer.innerHTML = c.projects.map(p => `
                <div onclick="openProjectDetail(${p.id})" class="cursor-pointer group bg-white border border-slate-200 rounded-lg p-3 hover:border-primary-500 transition-colors dark:bg-slate-800 dark:border-slate-700">
                    <div class="flex justify-between items-start">
                        <div class="font-bold text-sm text-slate-800 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400 truncate">${p.title}</div>
                        <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 dark:bg-slate-700 dark:text-slate-400">${p.status}</span>
                    </div>
                    <div class="mt-2 text-xs text-slate-500 flex items-center dark:text-slate-400">
                        <i data-lucide="user" class="w-3 h-3 mr-1"></i>
                        Роль: <span class="font-medium text-slate-700 ml-1 dark:text-slate-300">${p.role_in_project || 'Участник'}</span>
                    </div>
                </div>
            `).join('');
        } else {
            projectsContainer.innerHTML = `<div class="col-span-full text-center text-sm text-slate-400 italic py-4">Не участвует в проектах</div>`;
        }

        // 3. Tasks Block
        this.renderTaskTab(c.tasks_assigned, 'c-detail-tasks-assigned', 'Назначено задач нет');
        this.renderTaskTab(c.tasks_authored, 'c-detail-tasks-authored', 'Поручений нет');
        
        document.getElementById('count-assigned').innerText = c.tasks_assigned ? c.tasks_assigned.length : 0;
        document.getElementById('count-authored').innerText = c.tasks_authored ? c.tasks_authored.length : 0;

        // Reset tab view
        window.switchContactTaskTab('assigned');

        if (window.lucide) lucide.createIcons();
        switchView('contact-detail', true, `/contacts/${id}`);
    },

    renderTaskTab(tasks, containerId, emptyMsg) {
        const container = document.getElementById(containerId);
        if (!tasks || tasks.length === 0) {
            container.innerHTML = `<div class="text-center text-sm text-slate-400 italic py-4">${emptyMsg}</div>`;
            return;
        }
        container.innerHTML = tasks.map(t => `
            <div class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/50 transition-colors group">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${t.status ? t.status.color : '#ccc'}"></div>
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-slate-800 truncate dark:text-white cursor-pointer hover:text-primary-600" onclick="editTask(${t.id})">${t.title}</div>
                        <div class="text-xs text-slate-500 flex gap-2 dark:text-slate-400">
                            ${t.due_date ? `<span><i data-lucide="calendar" class="w-3 h-3 inline"></i> ${t.due_date}</span>` : ''}
                            ${t.project_title ? `<span class="bg-slate-100 px-1 rounded dark:bg-slate-700">${t.project_title}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button onclick="editTask(${t.id})" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary-600"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
            </div>
        `).join('');
    },

    openModal() {
        const form = document.getElementById('contact-form');
        if(form) { form.reset(); form.querySelector('[name="id"]').value = ""; }
        if (window.contactTagManager) window.contactTagManager.clear();
        document.getElementById('contact-modal').classList.remove('hidden');
    },

    editContact(id) {
        // Мы ищем контакт в общем списке, так как в modal нужны только базовые поля
        const contact = contactsData.find(c => c.id === id); 
        // Если данные не найдены (например, зашли по прямой ссылке и список еще не грузился или фильтрован), надо подгрузить
        // Для простоты предполагаем, что loadAll вызывается при старте. Если нет - можно сделать fetch.
        
        if (!contact) {
            // Fallback fetch, если в списке нет
             this.fetchAndEdit(id);
             return;
        }
        this.populateModal(contact);
    },
    
    async fetchAndEdit(id) {
         const response = await fetch(`/api/contacts/${id}`);
         if (response.ok) {
             const data = await response.json();
             this.populateModal(data);
         }
    },

    populateModal(contact) {
        this.openModal();
        const form = document.getElementById('contact-form');

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
        
        if (contact.tags && window.contactTagManager) {
            window.contactTagManager.addTags(contact.tags.map(t => t.name));
        }
    },

    async deleteContact(id) {
        if (confirm('Вы уверены?')) { 
            if (await API.deleteContact(id)) {
                await this.loadAll(); 
                switchView('contacts'); // Return to list if we were in detail
            }
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (window.contactTagManager) {
            data.tags = window.contactTagManager.getTags();
        }

        const id = data.id;
        let success = id ? await API.updateContact(id, data) : await API.createContact(data);
        
        if (success) { 
            closeModal('contact-modal'); 
            e.target.reset(); 
            await this.loadAll(); 
            if (window.loadAllTags) window.loadAllTags();
            
            // Если мы находимся в деталях этого контакта, обновим их
            if (id && !document.getElementById('view-contact-detail').classList.contains('hidden')) {
                this.openContactDetail(id);
            }
        } 
        else { 
            alert('Ошибка при сохранении контактов'); 
        }
    }
};