class ThemeManager {
    constructor(buttonId) {
        this.button = document.getElementById(buttonId);
        if (this.button) {
            this.init();
        }
    }

    init() {
        // Установить правильную иконку при загрузке
        this.updateIcon();

        this.button.addEventListener('click', () => {
            // Переключаем класс
            document.documentElement.classList.toggle('dark');

            // Сохраняем выбор
            if (document.documentElement.classList.contains('dark')) {
                localStorage.theme = 'dark';
            } else {
                localStorage.theme = 'light';
            }

            // Обновить иконку
            this.updateIcon();
        });
    }

    updateIcon() {
        const isDark = document.documentElement.classList.contains('dark');
        const iconContainer = document.getElementById('theme-icon');

        if (iconContainer) {
            // Заменяем SVG на новый элемент с нужной иконкой
            const newIcon = document.createElement('i');
            newIcon.id = 'theme-icon';
            newIcon.className = 'w-5 h-5';
            newIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');

            iconContainer.replaceWith(newIcon);

            // Пересоздаём иконки Lucide
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    }
}

export default ThemeManager;