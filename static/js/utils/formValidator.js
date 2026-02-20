/**
 * Клиентская валидация форм.
 *
 * Использование:
 *   import { validateForm, showServerErrors, clearFormErrors } from '../utils/formValidator.js';
 *
 *   // Перед отправкой:
 *   if (!validateForm(formEl, TASK_RULES)) return;
 *
 *   // При ошибке 400 от сервера:
 *   showServerErrors(formEl, response.details);
 */

// --- Правила валидации (зеркало серверных схем) ---

export const TASK_RULES = {
    title: { required: true, maxLength: 200, label: 'Название' },
};

export const CONTACT_RULES = {
    last_name: { required: true, maxLength: 100, label: 'Фамилия' },
    email: { type: 'email', label: 'Email' },
};

export const PROJECT_RULES = {
    title: { required: true, maxLength: 200, label: 'Название' },
};

export const MEETING_RULES = {
    date: { required: true, label: 'Дата' },
};

export const QUICK_LINK_RULES = {
    title: { required: true, maxLength: 100, label: 'Название' },
    url: { required: true, maxLength: 500, label: 'URL' },
};

export const TAG_RULES = {
    name: { required: true, maxLength: 50, label: 'Название' },
};

// --- Core ---

const ERROR_CLASS = 'form-field-error';
const MSG_CLASS = 'form-error-msg';

/**
 * Валидирует форму по правилам. Показывает ошибки inline.
 * @returns {boolean} true если ок
 */
export function validateForm(form, rules) {
    clearFormErrors(form);
    let valid = true;

    for (const [field, rule] of Object.entries(rules)) {
        const input = form.querySelector(`[name="${field}"]`);
        if (!input) continue;

        const value = input.value.trim();
        const errors = [];

        if (rule.required && !value) {
            errors.push(`${rule.label || field} — обязательное поле`);
        }

        if (value && rule.maxLength && value.length > rule.maxLength) {
            errors.push(`Максимум ${rule.maxLength} символов`);
        }

        if (value && rule.type === 'email' && value.indexOf('@') === -1) {
            errors.push('Неверный формат email');
        }

        if (errors.length > 0) {
            showFieldError(input, errors[0]);
            valid = false;
        }
    }

    return valid;
}

/**
 * Показывает серверные ошибки валидации ({field: [messages]}) в форме.
 */
export function showServerErrors(form, details) {
    if (!details || typeof details !== 'object') return;

    clearFormErrors(form);

    for (const [field, messages] of Object.entries(details)) {
        if (field === '_') continue; // общая ошибка
        const input = form.querySelector(`[name="${field}"]`);
        if (input && messages.length > 0) {
            showFieldError(input, messages[0]);
        }
    }
}

/**
 * Очищает все ошибки из формы.
 */
export function clearFormErrors(form) {
    form.querySelectorAll(`.${ERROR_CLASS}`).forEach(el => {
        el.classList.remove(ERROR_CLASS, 'border-red-400', 'dark:border-red-500');
    });
    form.querySelectorAll(`.${MSG_CLASS}`).forEach(el => el.remove());
}

// --- Internal ---

function showFieldError(input, message) {
    input.classList.add(ERROR_CLASS, 'border-red-400', 'dark:border-red-500');

    const msg = document.createElement('p');
    msg.className = `${MSG_CLASS} text-xs text-red-500 mt-1`;
    msg.textContent = message;

    // Вставляем после input (или после его parent-div если input внутри обертки)
    const target = input.parentElement.classList.contains('relative') ? input.parentElement : input;
    target.insertAdjacentElement('afterend', msg);

    // Убираем ошибку при изменении
    const handler = () => {
        input.classList.remove(ERROR_CLASS, 'border-red-400', 'dark:border-red-500');
        if (msg.parentElement) msg.remove();
        input.removeEventListener('input', handler);
        input.removeEventListener('change', handler);
    };
    input.addEventListener('input', handler);
    input.addEventListener('change', handler);
}
