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
    },
    async getContacts() { /* ... */ try { const r = await fetch('/api/contacts'); return await r.json(); } catch (e) { return []; } },
    async getContactTypes() { /* ... */ try { const r = await fetch('/api/contact-types'); return await r.json(); } catch (e) { return []; } },
    async createContact(data) { /* ... */ try { const r = await fetch('/api/contacts', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}); return r.ok; } catch (e) { return false; } },
    async updateContact(id, data) { /* ... */ try { const r = await fetch(`/api/contacts/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}); return r.ok; } catch (e) { return false; } },
    async deleteContact(id) { /* ... */ try { const r = await fetch(`/api/contacts/${id}`, { method: 'DELETE'}); return r.ok; } catch (e) { return false; } },
    
    async getTaskStatuses() { /* ... */ try { const r = await fetch('/api/task-statuses'); return await r.json(); } catch (e) { return []; } },
    async getTasks() { /* ... */ try { const r = await fetch('/api/tasks'); return await r.json(); } catch (e) { return []; } },
    async createTask(data) { /* ... */ try { const r = await fetch('/api/tasks', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}); return r.ok; } catch (e) { return false; } },
    async updateTask(id, data) { /* ... */ try { const r = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data)}); return r.ok; } catch (e) { return false; } },
    async deleteTask(id) { /* ... */ try { const r = await fetch(`/api/tasks/${id}`, { method: 'DELETE'}); return r.ok; } catch (e) { return false; } },

    // NEW TAGS METHOD
    async getTags() {
        try {
            const response = await fetch('/api/tags');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    }
};