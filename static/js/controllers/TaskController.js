import API from '../api.js';
import { renderTasks } from '../components/TaskList.js';
import { closeModal } from '../components/Modal.js';
import Dashboard from '../components/Dashboard.js';

let tasksData = [];

export const TaskController = {
    init() {
        // Слушатель формы
        const form = document.getElementById('task-form');
        if (form) {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Экспорт методов в глобальную область (для onclick в HTML)
        window.editTask = this.editTask.bind(this);
        window.deleteTask = this.deleteTask.bind(this);
        window.openTaskModal = this.openModal.bind(this);
        window.closeTaskModal = () => closeModal('task-modal');
    },

    async loadAll() {
        tasksData = await API.getTasks();
        renderTasks(tasksData);
        return tasksData; // Возвращаем для внешнего использования
    },

    getData() {
        return tasksData;
    },

    openModal() {
        const form = document.getElementById('task-form');
        if (form) { 
            form.reset(); 
            form.querySelector('[name="id"]').value = ""; 
        }
        if (window.taskTagManager) window.taskTagManager.clear();
        document.getElementById('task-modal').classList.remove('hidden');
    },

    editTask(id) {
        const task = tasksData.find(t => t.id === id);
        if (!task) return;

        const form = document.getElementById('task-form');
        this.openModal(); // Открываем и сбрасываем, потом заполняем
        
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
                Dashboard.init(); // Обновляем дашборд, вдруг задача была там
            }
        }
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        
        if (window.taskTagManager) {
            data.tags = window.taskTagManager.getTags();
        }
        
        const id = data.id;
        let success = id ? await API.updateTask(id, data) : await API.createTask(data);
        
        if (success) { 
            closeModal('task-modal'); 
            e.target.reset(); 
            await this.loadAll(); 
            
            // Если мы находимся в деталях проекта, нужно обновить и его
            if (data.project_id && !document.getElementById('view-project-detail').classList.contains('hidden')) {
                 if (window.openProjectDetail) window.openProjectDetail(data.project_id);
            }
            
            // Обновляем дашборд
            Dashboard.init();
        } 
        else { 
            alert('Ошибка при сохранении задачи'); 
        }
    }
};