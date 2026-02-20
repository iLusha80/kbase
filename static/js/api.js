/**
 * Обёртка для POST/PUT запросов с обработкой ошибок валидации.
 * Возвращает: { ok: true } | { ok: false, details: {...} } | { ok: false }
 */
async function apiMutate(url, method, data) {
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            return { ok: true, data: await response.json().catch(() => null) };
        }
        // Пробуем получить детали ошибки валидации
        const body = await response.json().catch(() => null);
        if (body && body.details) {
            return { ok: false, status: response.status, details: body.details, error: body.error };
        }
        return { ok: false, status: response.status, error: body?.error || 'Unknown error' };
    } catch (err) {
        console.error(err);
        return { ok: false, error: err.message };
    }
}

const API = {
    // --- DASHBOARD & SEARCH ---
    async getDashboard() {
        try {
            const response = await fetch('/api/dashboard');
            return await response.json();
        } catch (err) { console.error(err); return null; }
    },
    async getDailyStandup() {
        try {
            const response = await fetch('/api/daily-standup');
            return await response.json();
        } catch (err) { console.error(err); return null; }
    },
    async getOneOnOnePrep() {
        try {
            const response = await fetch('/api/one-on-one-prep');
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

    // View Logging
    async logView(entityType, entityId) {
        try {
            await fetch('/api/views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entity_type: entityType, entity_id: entityId })
            });
        } catch (err) { /* silent */ }
    },

    // --- NEW: REPORTS ---
    async getWeeklyReport(dateFrom = null, dateTo = null) {
        try {
            let url = '/api/reports/weekly';
            const params = new URLSearchParams();
            if (dateFrom) params.append('from', dateFrom);
            if (dateTo) params.append('to', dateTo);
            if (params.toString()) url += '?' + params.toString();
            const response = await fetch(url);
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
        const res = await apiMutate('/api/contacts', 'POST', data);
        if (res.details) return res; // вернём объект с ошибками для формы
        return res.ok;
    },
    async updateContact(id, data) {
        const res = await apiMutate(`/api/contacts/${id}`, 'PUT', data);
        if (res.details) return res;
        return res.ok;
    },
    async deleteContact(id) {
        try {
            const response = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    // Self contact (cached)
    _selfContact: undefined,
    async getSelfContact(forceRefresh = false) {
        if (this._selfContact !== undefined && !forceRefresh) return this._selfContact;
        try {
            const response = await fetch('/api/contacts/self');
            this._selfContact = await response.json();
            return this._selfContact;
        } catch (err) { console.error(err); return null; }
    },
    invalidateSelfCache() { this._selfContact = undefined; },

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
        const res = await apiMutate('/api/tasks', 'POST', data);
        if (res.details) return res;
        return res.ok;
    },
    async updateTask(id, data) {
        const res = await apiMutate(`/api/tasks/${id}`, 'PUT', data);
        if (res.details) return res;
        return res.ok;
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
        const res = await apiMutate('/api/projects', 'POST', data);
        if (res.details) return res;
        return res.ok;
    },
    async updateProject(id, data) {
        const res = await apiMutate(`/api/projects/${id}`, 'PUT', data);
        if (res.details) return res;
        return res.ok;
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
    },

    // --- MEETINGS ---
    async getMeetingTypes() {
        try {
            const response = await fetch('/api/meeting-types');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },
    async getMeetings() {
        try {
            const response = await fetch('/api/meetings');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },
    async getMeeting(id) {
        try {
            const response = await fetch(`/api/meetings/${id}`);
            return await response.json();
        } catch (err) { console.error(err); return null; }
    },
    async createMeeting(data) {
        try {
            const response = await fetch('/api/meetings', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            if (response.ok) return await response.json();
            return null;
        } catch (err) { console.error(err); return null; }
    },
    async updateMeeting(id, data) {
        try {
            const response = await fetch(`/api/meetings/${id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async deleteMeeting(id) {
        try {
            const response = await fetch(`/api/meetings/${id}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async addMeetingActionItem(meetingId, data) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/action-items`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            if (response.ok) return await response.json();
            return null;
        } catch (err) { console.error(err); return null; }
    },
    async updateMeetingActionItem(meetingId, itemId, data) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/action-items/${itemId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            if (response.ok) return await response.json();
            return null;
        } catch (err) { console.error(err); return null; }
    },
    async deleteMeetingActionItem(meetingId, itemId) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/action-items/${itemId}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async convertActionItemToTask(meetingId, itemId) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/action-items/${itemId}/convert`, {
                method: 'POST'
            });
            if (response.ok) return await response.json();
            return null;
        } catch (err) { console.error(err); return null; }
    },
    async getUpcomingMeetings() {
        try {
            const response = await fetch('/api/meetings/upcoming');
            return await response.json();
        } catch (err) { console.error(err); return []; }
    },

    // --- MEETING NOTES ---
    async addMeetingNote(meetingId, data) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/notes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            if (response.ok) return await response.json();
            return null;
        } catch (err) { console.error(err); return null; }
    },
    async updateMeetingNote(meetingId, noteId, data) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/notes/${noteId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            if (response.ok) return await response.json();
            return null;
        } catch (err) { console.error(err); return null; }
    },
    async deleteMeetingNote(meetingId, noteId) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/notes/${noteId}`, { method: 'DELETE' });
            return response.ok;
        } catch (err) { console.error(err); return false; }
    },
    async convertNoteToTask(meetingId, noteId) {
        try {
            const response = await fetch(`/api/meetings/${meetingId}/notes/${noteId}/convert`, {
                method: 'POST'
            });
            if (response.ok) return await response.json();
            return null;
        } catch (err) { console.error(err); return null; }
    }
};
export default API;