// Объект для работы с API
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
    }
};