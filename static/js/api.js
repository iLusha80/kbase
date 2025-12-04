const API = {
    async getContacts() {
        try {
            const response = await fetch('/api/contacts');
            return await response.json();
        } catch (err) {
            console.error("API Error:", err);
            return [];
        }
    },

    // Новый метод для типов
    async getContactTypes() {
        try {
            const response = await fetch('/api/contact-types');
            return await response.json();
        } catch (err) {
            console.error("API Error:", err);
            return [];
        }
    },

    async createContact(data) {
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) {
            console.error("API Error:", err);
            return false;
        }
    },

    async updateContact(id, data) {
        try {
            const response = await fetch(`/api/contacts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) {
            console.error("API Error:", err);
            return false;
        }
    },

    async deleteContact(id) {
        try {
            const response = await fetch(`/api/contacts/${id}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (err) {
            console.error("API Error:", err);
            return false;
        }
    }
};