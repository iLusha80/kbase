function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

function initModals() {
    // Находим все кнопки, которые должны открывать модальные окна
    document.querySelectorAll('[data-modal-target]').forEach(button => {
        button.addEventListener('click', () => {
            const modalId = button.getAttribute('data-modal-target');
            openModal(modalId);
        });
    });

    // Находим все кнопки, которые должны закрывать модальные окна
    document.querySelectorAll('[data-modal-close]').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.fixed.inset-0.z-50');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Закрытие модального окна при клике на фон
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.fixed.inset-0.z-50');
        modals.forEach(modal => {
            if (event.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // --- NEW: Закрытие по нажатию Esc ---
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Ищем любое открытое модальное окно (у которого нет класса hidden)
            // Селектор ищет элементы с фиксированным позиционированием (наши модалки), которые видимы
            const visibleModal = document.querySelector('.fixed.inset-0.z-50:not(.hidden)');
            if (visibleModal) {
                closeModal(visibleModal.id);
            }
        }
    });
}

export { initModals, openModal, closeModal };