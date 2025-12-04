class ThemeManager {
    constructor(buttonId) {
        this.button = document.getElementById(buttonId);
        if (this.button) {
            this.init();
        }
    }

    init() {
        this.button.addEventListener('click', () => {
            // Переключаем класс
            document.documentElement.classList.toggle('dark');
            
            // Сохраняем выбор
            if (document.documentElement.classList.contains('dark')) {
                localStorage.theme = 'dark';
            } else {
                localStorage.theme = 'light';
            }
        });
    }
}

export default ThemeManager;