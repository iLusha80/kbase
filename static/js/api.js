const API = {
    // --- CONTACTS ---
    async getContacts() {
        try {
            const response = await fetch('/api/contacts');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },
    async getContactTypes() {
        try {
            const response = await fetch('/api/contact-types');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },
    async createContact(data) {
        try {
            const response = await fetch('/api/contacts', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async updateContact(id, data) {
        try {
            const response = await fetch(`/api/contacts/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async deleteContact(id) {
        try {
            const response = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },

    // --- TASKS ---
    async getTaskStatuses() {
        try {
            const response = await fetch('/api/task-statuses');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },
    async getTasks() {
        try {
            const response = await fetch('/api/tasks');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },
    async createTask(data) {
        try {
            const response = await fetch('/api/tasks', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async updateTask(id, data) {
        try {
            const response = await fetch(`/api/tasks/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async deleteTask(id) {
        try {
            const response = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    }
};