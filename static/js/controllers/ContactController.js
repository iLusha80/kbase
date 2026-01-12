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

        window.editContact = this.editContact.bind(this);
        window.deleteContact = this.deleteContact.bind(this);
        window.openModal = this.openModal.bind(this); 
        window.openContactDetail = this.openContactDetail.bind(this);
        
        // --- UPDATED TAB SWITCHER ---
        window.switchContactTaskTab = function(tabName) {
            const tabs = ['active', 'done', 'authored'];
            
            tabs.forEach(t => {
                const container = document.getElementById(`c-detail-tasks-${t}`);
                const btn = document.getElementById(`tab-btn-${t}`);
                
                if (container) {
                    if (t === tabName) {
                        container.classList.remove('hidden');
                    } else {
                        container.classList.add('hidden');
                    }
                }

                if (btn) {
                    if (t === tabName) {
                        btn.classList.add('border-primary-600', 'text-primary-600');
                        btn.classList.remove('border-transparent', 'text-slate-500');
                    } else {
                        btn.classList.remove('border-primary-600', 'text-primary-600');
                        btn.classList.add('border-transparent', 'text-slate-500');
                    }
                }
            });
        };

        // NEW: Toggle Favorite Handler
        window.toggleDetailFavorite = async (id) => {
            const res = await API.toggleContactFavorite(id);
            this.updateStarButton(res.is_favorite);
        };
    },

    updateStarButton(isFavorite) {
        const btn = document.getElementById('c-detail-star-btn');
        if (!btn) return; // Защита от отсутствия кнопки
        
        const icon = btn.querySelector('i');
        
        if (isFavorite) {
            btn.classList.add('text-yellow-500');
            btn.classList.remove('text-slate-400', 'hover:text-yellow-500');
            if(icon) icon.setAttribute('fill', 'currentColor');
        } else {
            btn.classList.remove('text-yellow-500');
            btn.classList.add('text-slate-400', 'hover:text-yellow-500');
            if(icon) icon.setAttribute('fill', 'none');
        }
        if (window.lucide) lucide.createIcons();
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

    async openContactDetail(id) {
        try {
            const response = await fetch(`/api/contacts/${id}`);
            if (!response.ok) {
                console.error("Failed to load contact detail:", response.status);
                alert("Ошибка загрузки контакта. Возможно, требуется обновление базы данных.");
                return;
            }
            const c = await response.json();

            // Helper to safe set text
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.innerText = text;
            };

            const fullName = [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ');
            setText('c-detail-name', fullName);
            setText('c-detail-role', `${c.role || 'Нет должности'} • ${c.department || 'Нет отдела'}`);
            
            const initial = c.last_name ? c.last_name.charAt(0).toUpperCase() : '?';
            const avatarEl = document.getElementById('c-detail-avatar');
            if (avatarEl) {
                avatarEl.innerText = initial;
                const typeColor = c.type ? c.type.render_color : '#cbd5e1';
                avatarEl.style.backgroundColor = typeColor;
                avatarEl.style.color = '#fff';
                
                const headerBg = document.getElementById('c-detail-header-bg');
                if (headerBg) headerBg.style.backgroundColor = typeColor + '40';
            }

            const badgesContainer = document.getElementById('c-detail-badges');
            if (badgesContainer) {
                let badgesHtml = '';
                if (c.type) {
                    badgesHtml += `<span class="px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">${c.type.name_type}</span>`;
                }
                if (c.tags && c.tags.length > 0) {
                    badgesHtml += c.tags.map(t => `<span class="px-2 py-0.5 text-xs rounded border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-400">#${t.name}</span>`).join('');
                }
                badgesContainer.innerHTML = badgesHtml;
            }

            const editBtn = document.getElementById('c-detail-edit-btn');
            if (editBtn) editBtn.onclick = () => this.editContact(c.id);

            // NEW: Star Button with safety check
            const starBtn = document.getElementById('c-detail-star-btn');
            if (starBtn) {
                starBtn.onclick = () => window.toggleDetailFavorite(c.id);
                this.updateStarButton(c.is_favorite);
            }

            setText('c-detail-email', c.email || '-');
            setText('c-detail-phone', c.phone || '-');
            
            const linkContainer = document.getElementById('c-detail-link');
            if (linkContainer) {
                if (c.link) {
                    linkContainer.innerHTML = `<a href="${c.link}" target="_blank" class="flex items-center gap-1"><i data-lucide="external-link" class="w-3 h-3"></i> Открыть</a>`;
                } else {
                    linkContainer.innerText = '-';
                }
            }

            const notesBlock = document.getElementById('c-detail-notes-block');
            const notesContent = document.getElementById('c-detail-notes');
            if (notesBlock && notesContent) {
                if (c.notes) {
                    notesContent.innerText = c.notes;
                    notesBlock.classList.remove('hidden');
                } else {
                    notesBlock.classList.add('hidden');
                }
            }

            const projectsContainer = document.getElementById('c-detail-projects');
            if (projectsContainer) {
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
            }

            // --- UPDATED TASK RENDERING ---
            this.renderTaskTab(c.tasks_assigned_active, 'c-detail-tasks-active', 'Нет активных задач');
            this.renderTaskTab(c.tasks_assigned_done, 'c-detail-tasks-done', 'Нет завершенных задач');
            this.renderTaskTab(c.tasks_authored, 'c-detail-tasks-authored', 'Поручений нет');
            
            setText('count-active', c.tasks_assigned_active ? c.tasks_assigned_active.length : 0);
            setText('count-done', c.tasks_assigned_done ? c.tasks_assigned_done.length : 0);
            setText('count-authored', c.tasks_authored ? c.tasks_authored.length : 0);

            if (typeof window.switchContactTaskTab === 'function') {
                window.switchContactTaskTab('active');
            }

            if (window.lucide) lucide.createIcons();
            
            // Наконец, переключаем вид
            switchView('contact-detail', true, `/contacts/${id}`);
            
        } catch (e) {
            console.error("Error in openContactDetail:", e);
        }
    },

    renderTaskTab(tasks, containerId, emptyMsg) {
        const container = document.getElementById(containerId);
        if (!container) return; // Защита
        
        if (!tasks || tasks.length === 0) {
            container.innerHTML = `<div class="text-center text-sm text-slate-400 italic py-4">${emptyMsg}</div>`;
            return;
        }
        container.innerHTML = tasks.map(t => {
            const isDone = t.status && t.status.name === 'Готово';
            const opacityClass = isDone ? 'opacity-60 grayscale' : '';
            const statusColor = t.status ? t.status.color : '#ccc';
            
            return `
            <div onclick="openTaskDetail(${t.id})" class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer ${opacityClass}">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-2 h-2 rounded-full flex-shrink-0" style="background-color: ${statusColor}"></div>
                    <div class="min-w-0">
                        <div class="text-sm font-medium text-slate-800 truncate dark:text-white group-hover:text-primary-600 transition-colors">${t.title}</div>
                        <div class="text-xs text-slate-500 flex gap-2 dark:text-slate-400">
                            ${t.due_date ? `<span><i data-lucide="calendar" class="w-3 h-3 inline"></i> ${t.due_date}</span>` : ''}
                            ${t.project_title ? `<span onclick="event.stopPropagation(); openProjectDetail(${t.project_id})" class="bg-slate-100 px-1 rounded dark:bg-slate-700 hover:bg-primary-50 hover:text-primary-600 transition-colors">${t.project_title}</span>` : ''}
                            ${isDone ? '<span class="text-green-600 font-bold dark:text-green-400">Завершено</span>' : ''}
                        </div>
                    </div>
                </div>
                <button class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-primary-600"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
            </div>
        `}).join('');
    },

    openModal() {
        const form = document.getElementById('contact-form');
        if(form) { form.reset(); form.querySelector('[name="id"]').value = ""; }
        if (window.contactTagManager) window.contactTagManager.clear();
        document.getElementById('contact-modal').classList.remove('hidden');
    },

    editContact(id) {
        const contact = contactsData.find(c => c.id === id); 
        if (!contact) {
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
        if (!form) return;
        
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
                switchView('contacts');
            }
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        if (window.contactTagManager) data.tags = window.contactTagManager.getTags();
        const id = data.id;
        let success = id ? await API.updateContact(id, data) : await API.createContact(data);
        if (success) { 
            closeModal('contact-modal'); 
            e.target.reset(); 
            await this.loadAll(); 
            if (window.loadAllTags) window.loadAllTags();
            if (id && !document.getElementById('view-contact-detail').classList.contains('hidden')) {
                this.openContactDetail(id);
            }
        } else { alert('Ошибка при сохранении контактов'); }
    }
};