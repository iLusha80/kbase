function switchView(viewName, addToHistory = true, path) {
    // 1. Скрываем все секции
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    // 2. Показываем нужную
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');

    // 3. Обновляем кнопки навигации
    const activeClasses = [
        'bg-primary-50',        // Светлая тема: фон активной
        'text-primary-600',     // Светлая тема: текст активной
        'dark:bg-slate-700',    // Темная тема: фон активной (исправляет белый квадрат)
        'dark:text-primary-400' // Темная тема: текст активной
    ];

    const inactiveClasses = [
        'text-slate-600',       // Светлая тема: текст неактивной
        'hover:bg-slate-50',    // Светлая тема: ховер
        'dark:text-slate-300',  // Темная тема: текст неактивной
        'dark:hover:bg-slate-700/50' // Темная тема: ховер
    ];

    document.querySelectorAll('.nav-btn').forEach(btn => {
        // Сначала всем делаем "неактивный" вид
        btn.classList.remove(...activeClasses);
        btn.classList.add(...inactiveClasses);
    });

    // Теперь красим активную кнопку
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) {
        activeBtn.classList.remove(...inactiveClasses);
        activeBtn.classList.add(...activeClasses);
    }

    // 4. История браузера
    if (addToHistory && path) {
        history.pushState({ view: viewName }, '', path);
    }
}

/**
 * Навигация «назад» к списку — использует replaceState,
 * чтобы не засорять историю дублями (detail → список → detail → список).
 */
function navigateBack(viewName, path) {
    switchView(viewName, false);
    history.replaceState({ view: viewName }, '', path);
}

export { switchView, navigateBack };