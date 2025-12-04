class TagManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.tags = []; // Массив строк
        if (this.container) {
            this.input = this.container.querySelector('input');
            this.renderArea = this.container.querySelector('.tags-render-area');
            this.initEvents();
        }
    }

    initEvents() {
        if (!this.input) return;
        
        // Обработка ввода
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addTagFromInput();
            }
        });
        
        // Добавление по потере фокуса (опционально)
        this.input.addEventListener('blur', () => {
            this.addTagFromInput();
        });
    }

    addTagFromInput() {
        const val = this.input.value.trim();
        if (val) {
            // Не добавляем дубликаты
            if (!this.tags.includes(val.toLowerCase())) {
                this.tags.push(val.toLowerCase());
                this.render();
            }
            this.input.value = '';
        }
    }

    addTags(tagsArray) {
        // Принимает массив строк
        this.tags = tagsArray.map(t => t.toLowerCase());
        this.render();
    }
    
    clear() {
        this.tags = [];
        this.input.value = '';
        this.render();
    }
    
    getTags() {
        // Если что-то осталось в инпуте, тоже считаем тегом
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

export default TagManager;