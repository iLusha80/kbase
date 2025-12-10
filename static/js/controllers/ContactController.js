import API from '../api.js';
import { renderContacts } from '../components/ContactList.js';
import { closeModal } from '../components/Modal.js';

let contactsData = [];

export const ContactController = {
    init() {
        const form = document.getElementById('contact-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Поиск контактов
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const searchValue = e.target.value.toLowerCase();
                renderContacts(contactsData, searchValue);
            });
        }

        window.editContact = this.editContact.bind(this);
        window.deleteContact = this.deleteContact.bind(this);
        window.openModal = this.openModal.bind(this); // openModal в app.js был для контактов
        // closeModal глобальный, его не переопределяем, или можно:
        // window.closeContactModal = () => closeModal('contact-modal');
    },

    async loadAll() {
        contactsData = await API.getContacts();
        renderContacts(contactsData);
        
        // Обновляем список контактов в менеджере проектной команды (если он уже создан)
        if (window.projectContactManager) {
            window.projectContactManager.contactsList = contactsData;
        }
        
        return contactsData;
    },

    getData() {
        return contactsData;
    },

    openModal() {
        const form = document.getElementById('contact-form');
        if(form) { form.reset(); form.querySelector('[name="id"]').value = ""; }
        if (window.contactTagManager) window.contactTagManager.clear();
        document.getElementById('contact-modal').classList.remove('hidden');
    },

    editContact(id) {
        const contact = contactsData.find(c => c.id === id);
        if (!contact) return;

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
            if (await API.deleteContact(id)) await this.loadAll(); 
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
            // Нужно обновить списки тегов, если были новые
            if (window.loadAllTags) window.loadAllTags();
        } 
        else { 
            alert('Ошибка при сохранении контактов'); 
        }
    }
};