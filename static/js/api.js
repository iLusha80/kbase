const API = {
    // --- DASHBOARD & SEARCH ---
    async getDashboard() {
        try {
            const response = await fetch('/api/dashboard');
            return await response.json();
        } catch (err) { console.error(err); return null; }
    },
    async search(query) {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            return await response.json();
        } catch (err) { console.error(err); return {}; }
    },
    
    // Quick Links
    async createQuickLink(data) {
        try {
            const response = await fetch('/api/quick-links', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async updateQuickLink(id, data) {
        try {
            const response = await fetch(`/api/quick-links/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async deleteQuickLink(id) {
        try {
            const response = await fetch(`/api/quick-links/${id}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },

    // --- NEW: REPORTS ---
    async getWeeklyReport() {
        try {
            const response = await fetch('/api/reports/weekly');
            return await response.json();
        } catch (err) { console.error(err); return null; }
    },

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
    // NEW: Toggle Favorite
    async toggleContactFavorite(id) {
        try {
            const response = await fetch(`/api/contacts/${id}/favorite`, { method: 'POST' });
            return await response.json();
        } catch (err) { console.error(err); return { is_favorite: false }; }
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

    // --- PROJECTS ---
    async getProjects() {
        try {
            const response = await fetch('/api/projects');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },
    async getProject(id) {
        try {
            const response = await fetch(`/api/projects/${id}`);
            return await response.json();
        } catch (err) { console.error(err); return null; }
    },
    async createProject(data) {
        try {
            const response = await fetch('/api/projects', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async updateProject(id, data) {
        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async deleteProject(id) {
        try {
            const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },

    // --- TAGS ---
    async getTags() {
        try {
            const response = await fetch('/api/tags');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    }
};
export default API;