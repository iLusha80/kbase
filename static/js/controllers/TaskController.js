import API from '../api.js';
import { renderTasks } from '../components/TaskList.js';
import { closeModal } from '../components/Modal.js';
import Dashboard from '../components/Dashboard.js';
import { switchView } from '../utils/router.js'; 

let tasksData = [];
let currentTaskId = null; // Для хранения ID текущей открытой задачи

export const TaskController = {
    init() {
        const form = document.getElementById('task-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        window.editTask = this.editTask.bind(this);
        window.deleteTask = this.deleteTask.bind(this);
        window.openTaskModal = this.openModal.bind(this);
        window.closeTaskModal = () => closeModal('task-modal');
        
        window.openTaskDetail = this.openTaskDetail.bind(this);

        // NEW: Comment listeners
        const commentBtn = document.getElementById('comment-submit-btn');
        if (commentBtn) {
            commentBtn.addEventListener('click', () => this.submitComment());
        }
        
        // Удаление комментариев (глобально)
        window.deleteTaskComment = this.deleteTaskComment.bind(this);
    },

    async loadAll() {
        tasksData = await API.getTasks();
        renderTasks(tasksData);
        return tasksData;
    },

    getData() { return tasksData; },

    async openTaskDetail(id) {
        currentTaskId = id; // Сохраняем ID

        const response = await fetch(`/api/tasks/${id}`);
        if (!response.ok) return;
        const t = await response.json();

        // --- RENDER MAIN INFO (как в шаге 1) ---
        document.getElementById('t-detail-id').innerText = `#${t.id}`;
        const statusEl = document.getElementById('t-detail-status');
        if (t.status) {
            statusEl.innerText = t.status.name;
            statusEl.style.backgroundColor = t.status.color;
        }

        document.getElementById('t-detail-edit-btn').onclick = () => this.editTask(t.id);
        document.getElementById('t-detail-delete-btn').onclick = async () => {
            if (await this.deleteTask(t.id)) switchView('tasks');
        };

        document.getElementById('t-detail-title').innerText = t.title;
        document.getElementById('t-detail-desc').innerText = t.description || 'Нет описания';

        // Sidebar
        const projContainer = document.getElementById('t-detail-project');
        if (t.project_id) {
            projContainer.innerHTML = `<div class="flex items-center gap-2 cursor-pointer hover:text-primary-600 transition-colors" onclick="openProjectDetail(${t.project_id})"><i data-lucide="briefcase" class="w-4 h-4 text-slate-400"></i><span class="font-medium">${t.project_title}</span></div>`;
        } else {
            projContainer.innerHTML = '<span class="text-slate-400 italic">Без проекта</span>';
        }

        this.renderUser(t.assignee, 't-detail-assignee');
        this.renderUser(t.author, 't-detail-author');

        const dueEl = document.getElementById('t-detail-due');
        if (t.due_date) {
            const isOverdue = new Date(t.due_date) < new Date().setHours(0,0,0,0);
            dueEl.innerHTML = `<span class="${isOverdue ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}">${t.due_date}</span>`;
        } else {
            dueEl.innerText = 'Нет срока';
        }

        const tagsContainer = document.getElementById('t-detail-tags');
        if (t.tags && t.tags.length > 0) {
            tagsContainer.innerHTML = t.tags.map(tag => `<span class="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">#${tag.name}</span>`).join('');
        } else {
            tagsContainer.innerHTML = '<span class="text-slate-400 text-xs">-</span>';
        }

        // --- NEW: RENDER COMMENTS ---
        this.renderComments(t.comments);

        if (window.lucide) lucide.createIcons();
        switchView('task-detail', true, `/tasks/${id}`);
    },

    renderComments(comments) {
        const container = document.getElementById('t-detail-comments-list');
        if (!comments || comments.length === 0) {
            container.innerHTML = `<div class="text-center text-sm text-slate-400 italic py-4">Нет комментариев</div>`;
            return;
        }

        container.innerHTML = comments.map(c => `
            <div class="flex gap-3 group">
                <div class="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-500 text-xs dark:bg-slate-700">
                    <i data-lucide="message-square" class="w-4 h-4"></i>
                </div>
                <div class="flex-grow">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Вы (User)</span>
                        <span class="text-[10px] text-slate-400">${c.created_at}</span>
                        <button onclick="deleteTaskComment(${c.id})" class="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity ml-auto">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                    <div class="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed bg-white p-3 rounded-br-lg rounded-bl-lg rounded-tr-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">${c.text}</div>
                </div>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    },

    async submitComment() {
        if (!currentTaskId) return;
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        if (!text) return;

        try {
            const response = await fetch(`/api/tasks/${currentTaskId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                input.value = ''; // Очистка
                // Перезагружаем только данные задачи, чтобы обновить список
                this.openTaskDetail(currentTaskId);
            }
        } catch (err) {
            console.error(err);
        }
    },

    async deleteTaskComment(commentId) {
        if (!confirm('Удалить комментарий?')) return;
        try {
            const response = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' });
            if (response.ok) {
                this.openTaskDetail(currentTaskId);
            }
        } catch (err) { console.error(err); }
    },

    // ... (renderUser, openModal, editTask, fetchAndEdit, populateModal, deleteTask, handleFormSubmit - без изменений, кроме того что handleFormSubmit обновляет detail view если открыт)
    
    renderUser(user, containerId) {
        const container = document.getElementById(containerId);
        if (!user) {
            container.innerHTML = `<div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 dark:bg-slate-700"><i data-lucide="user" class="w-3 h-3"></i></div><span class="text-slate-400 italic">Не указан</span></div>`;
            return;
        }
        const initial = user.last_name ? user.last_name.charAt(0) : '?';
        container.innerHTML = `<div class="flex items-center gap-2 cursor-pointer hover:text-primary-600" onclick="openContactDetail(${user.id})"><div class="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-bold border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-800">${initial}</div><span class="truncate">${user.last_name} ${user.first_name || ''}</span></div>`;
    },
    
    openModal() {
        const form = document.getElementById('task-form');
        if (form) { form.reset(); form.querySelector('[name="id"]').value = ""; }
        if (window.taskTagManager) window.taskTagManager.clear();
        document.getElementById('task-modal').classList.remove('hidden');
    },

    editTask(id) {
        const task = tasksData.find(t => t.id === id);
        if (!task) { this.fetchAndEdit(id); return; }
        this.populateModal(task);
    },
    
    async fetchAndEdit(id) {
         const response = await fetch(`/api/tasks/${id}`);
         if(response.ok) {
             const t = await response.json();
             this.populateModal(t);
         }
    },

    populateModal(task) {
        const form = document.getElementById('task-form');
        this.openModal();
        form.querySelector('[name="id"]').value = task.id;
        form.querySelector('[name="title"]').value = task.title;
        form.querySelector('[name="due_date"]').value = task.due_date || '';
        form.querySelector('[name="description"]').value = task.description || '';
        if (task.status_id) form.querySelector('select[name="status_id"]').value = task.status_id;
        form.querySelector('select[name="assignee_id"]').value = task.assignee_id || '';
        form.querySelector('select[name="author_id"]').value = task.author_id || '';
        if (task.project_id) form.querySelector('select[name="project_id"]').value = task.project_id;
        if (task.tags && window.taskTagManager) {
            window.taskTagManager.addTags(task.tags.map(t => t.name));
        }
    },

    async deleteTask(id) {
        if (confirm('Вы уверены?')) { 
            if (await API.deleteTask(id)) {
                await this.loadAll();
                Dashboard.init();
                return true;
            }
        }
        return false;
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        if (window.taskTagManager) data.tags = window.taskTagManager.getTags();
        const id = data.id;
        let success = id ? await API.updateTask(id, data) : await API.createTask(data);
        if (success) { 
            closeModal('task-modal'); 
            e.target.reset(); 
            await this.loadAll(); 
            if (id && !document.getElementById('view-task-detail').classList.contains('hidden')) {
                 this.openTaskDetail(id);
            } else if (data.project_id && !document.getElementById('view-project-detail').classList.contains('hidden')) {
                 if (window.openProjectDetail) window.openProjectDetail(data.project_id);
            }
            Dashboard.init();
        } 
        else { alert('Ошибка при сохранении задачи'); }
    }
};