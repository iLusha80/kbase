class TagManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tags = []; // Массив строк текущих тегов
        if (this.container) {
            this.input = this.container.querySelector('input');
            this.renderArea = this.container.querySelector('.tags-render-area');
            
            // Создаем контейнер для выпадающего списка
            this.dropdown = document.createElement('div');
            this.dropdown.className = 'hidden absolute z-[60] mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-40 overflow-y-auto dark:bg-slate-800 dark:border-slate-700';
            this.container.classList.add('relative');
            this.container.appendChild(this.dropdown);

            this.initEvents();
        }
    }

    initEvents() {
        if (!this.input) return;
        
        this.input.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (val.length >= 2) {
                this.showSuggestions(val);
            } else {
                this.hideSuggestions();
            }
        });

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Если есть активная подсказка (первая в списке), можно было бы выбрать её,
                // но для простоты просто добавляем то, что введено
                this.addTagFromInput();
                this.hideSuggestions();
            }
            if (e.key === 'Escape') {
                this.hideSuggestions();
            }
        });

        // Закрытие при клике вне
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    showSuggestions(query) {
        // Берем все теги из глобального хранилища, исключая уже добавленные
        const allSystemTags = window.allTags || [];
        const filtered = allSystemTags
            .filter(t => t.name.includes(query) && !this.tags.includes(t.name.toLowerCase()))
            .slice(0, 10); // Ограничим список

        if (filtered.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.dropdown.innerHTML = filtered.map(t => `
            <div class="suggestion-item px-3 py-2 cursor-pointer hover:bg-primary-50 text-sm text-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                 onclick="window.selectTagSuggestion('${this.container.id}', '${t.name}')">
                #${t.name}
            </div>
        `).join('');
        
        this.dropdown.classList.remove('hidden');
    }

    hideSuggestions() {
        this.dropdown.classList.add('hidden');
    }

    addTagFromInput() {
        const val = this.input.value.trim();
        if (val) {
            this.addSingleTag(val);
            this.input.value = '';
        }
    }

    addSingleTag(tagName) {
        const cleanName = tagName.toLowerCase();
        if (!this.tags.includes(cleanName)) {
            this.tags.push(cleanName);
            this.render();
        }
    }

    addTags(tagsArray) {
        this.tags = tagsArray.map(t => t.toLowerCase());
        this.render();
    }
    
    clear() {
        this.tags = [];
        this.input.value = '';
        this.render();
    }
    
    getTags() {
        this.addTagFromInput();
        return this.tags;
    }

    removeTag(index) {
        this.tags.splice(index, 1);
        this.render();
    }

    render() {
        if (!this.renderArea) return;
        this.renderArea.innerHTML = this.tags.map((tag, index) => `
            <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-700 mr-2 mb-1">
                ${tag}
                <button type="button" onclick="window.removeTag('${this.container.id}', ${index})" class="ml-1 text-primary-500 hover:text-primary-900 focus:outline-none">
                    <i data-lucide="x" class="w-3 h-3"></i>
                </button>
            </span>
        `).join('');
        if (window.lucide) lucide.createIcons();
    }
}

// Глобальные хелперы
window.removeTag = function(containerId, index) {
    if (containerId === 'contact-tags-container') window.contactTagManager.removeTag(index);
    if (containerId === 'task-tags-container') window.taskTagManager.removeTag(index);
};

window.selectTagSuggestion = function(containerId, tagName) {
    let manager = (containerId === 'contact-tags-container') ? window.contactTagManager : window.taskTagManager;
    if (manager) {
        manager.addSingleTag(tagName);
        manager.input.value = '';
        manager.hideSuggestions();
    }
};

export default TagManager;