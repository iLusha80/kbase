class ProjectContactManager {
    constructor(containerId, contactsList) {
        this.container = document.getElementById(containerId);
        this.contactsList = contactsList; // Все доступные контакты для селекта
        this.items = []; // [{contact_id, role}]
        if (this.container) {
            this.renderArea = this.container.querySelector('.team-render-area');
            this.addBtn = this.container.querySelector('.add-member-btn');
            this.initEvents();
        }
    }

    initEvents() {
        if (this.addBtn) {
            this.addBtn.addEventListener('click', () => {
                this.addEmptyRow();
            });
        }
    }

    setTeam(teamArray) {
        this.items = teamArray.map(m => ({
            contact_id: m.contact_id,
            role: m.role || ''
        }));
        this.render();
    }

    getTeam() {
        // Собираем данные из DOM перед отправкой
        const rows = this.renderArea.querySelectorAll('.team-row');
        const result = [];
        rows.forEach(row => {
            const select = row.querySelector('select');
            const input = row.querySelector('input');
            if (select.value) {
                result.push({
                    contact_id: select.value,
                    role: input.value
                });
            }
        });
        return result;
    }

    clear() {
        this.items = [];
        this.render();
    }

    addEmptyRow() {
        this.items.push({ contact_id: '', role: '' });
        this.render();
    }

    removeRow(index) {
        this.items.splice(index, 1);
        this.render();
    }

    render() {
        if (!this.renderArea) return;
        
        // Генерация списка опций для селекта
        const optionsHtml = `<option value="">Выберите сотрудника</option>` + 
            this.contactsList.map(c => `<option value="${c.id}">${c.last_name} ${c.first_name || ''}</option>`).join('');

        this.renderArea.innerHTML = this.items.map((item, index) => `
            <div class="team-row flex gap-2 mb-2 items-center">
                <select class="w-1/2 border border-slate-300 rounded text-sm p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white" onchange="window.updateTeamMember(${index}, 'contact_id', this.value)">
                    ${optionsHtml}
                </select>
                <input type="text" placeholder="Роль (напр. Заказчик)" value="${item.role}" 
                    class="w-1/2 border border-slate-300 rounded text-sm p-2 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    onchange="window.updateTeamMember(${index}, 'role', this.value)">
                <button type="button" onclick="window.removeTeamMember(${index})" class="text-red-500 hover:text-red-700"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `).join('');
        
        // Восстанавливаем выбранные значения в селектах (так как innerHTML сбрасывает)
        const selects = this.renderArea.querySelectorAll('select');
        selects.forEach((sel, idx) => {
            sel.value = this.items[idx].contact_id;
        });

        if (window.lucide) lucide.createIcons();
    }
}

// Глобальные хелперы для обработки событий внутри сгенерированного HTML
window.updateTeamMember = function(index, field, value) {
    if (window.projectContactManager.items[index]) {
        window.projectContactManager.items[index][field] = value;
    }
};

window.removeTeamMember = function(index) {
    window.projectContactManager.removeRow(index);
};

export default ProjectContactManager;