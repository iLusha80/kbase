"""
Серверная валидация входящих данных.

Лёгкий движок без внешних зависимостей (marshmallow/pydantic не нужны
для текущего масштаба проекта).

Использование в routes:
    from services.validators import validate, TASK_CREATE_SCHEMA
    errors = validate(data, TASK_CREATE_SCHEMA)
    if errors:
        return validation_error(errors)
"""

import re
from datetime import date, time
from flask import jsonify

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
_TIME_RE = re.compile(r'^\d{2}:\d{2}(:\d{2})?$')


def _parse_date(value):
    """Проверяет и парсит дату в формате YYYY-MM-DD."""
    if isinstance(value, date):
        return True
    if not isinstance(value, str) or not _DATE_RE.match(value):
        return False
    try:
        parts = value.split('-')
        date(int(parts[0]), int(parts[1]), int(parts[2]))
        return True
    except (ValueError, IndexError):
        return False


def _parse_time(value):
    """Проверяет время в формате HH:MM или HH:MM:SS."""
    if isinstance(value, time):
        return True
    if not isinstance(value, str) or not _TIME_RE.match(value):
        return False
    try:
        parts = value.split(':')
        time(int(parts[0]), int(parts[1]))
        return True
    except (ValueError, IndexError):
        return False


# ---------------------------------------------------------------------------
# Core: validate(data, schema) → dict of errors  (empty = ok)
# ---------------------------------------------------------------------------

def validate(data, schema, partial=False):
    """
    Валидирует dict `data` по `schema`.

    schema — dict вида:
        {
            'field_name': {
                'required': True,       # обязательное (только для create)
                'type': 'str',          # str | int | bool | list | date | time
                'max_length': 200,      # макс. длина строки
                'choices': [...],       # допустимые значения
                'min': 0,              # мин. значение (int)
                'max': 9999,           # макс. значение (int)
            },
            ...
        }

    partial=True — пропускаются отсутствующие поля (для PUT/PATCH).

    Возвращает dict {field: [messages]} — пустой если ок.
    """
    if data is None:
        return {'_': ['Тело запроса не может быть пустым']}

    errors = {}

    for field, rules in schema.items():
        value = data.get(field)
        field_errors = []

        # --- required ---
        is_required = rules.get('required', False)
        if is_required and not partial:
            if value is None or (isinstance(value, str) and not value.strip()):
                field_errors.append('Обязательное поле')
                errors[field] = field_errors
                continue  # остальные проверки бессмысленны

        # Если поле отсутствует / None / пустая строка для необязательных полей —
        # пропускаем остальные проверки
        if value is None:
            continue
        if isinstance(value, str) and not value.strip() and not is_required:
            continue

        # --- type ---
        expected_type = rules.get('type')
        if expected_type:
            if expected_type == 'str' and not isinstance(value, str):
                field_errors.append('Должно быть строкой')
            elif expected_type == 'int':
                if not isinstance(value, int) or isinstance(value, bool):
                    field_errors.append('Должно быть целым числом')
            elif expected_type == 'bool' and not isinstance(value, bool):
                field_errors.append('Должно быть true/false')
            elif expected_type == 'list' and not isinstance(value, list):
                field_errors.append('Должно быть массивом')
            elif expected_type == 'date':
                if not _parse_date(value):
                    field_errors.append('Неверный формат даты (YYYY-MM-DD)')
            elif expected_type == 'time':
                if not _parse_time(value):
                    field_errors.append('Неверный формат времени (HH:MM)')

        # --- max_length ---
        max_len = rules.get('max_length')
        if max_len and isinstance(value, str) and len(value) > max_len:
            field_errors.append(f'Максимум {max_len} символов')

        # --- choices ---
        choices = rules.get('choices')
        if choices and value not in choices:
            field_errors.append(f'Допустимые значения: {", ".join(str(c) for c in choices)}')

        # --- min / max (int) ---
        if isinstance(value, int) and not isinstance(value, bool):
            min_val = rules.get('min')
            if min_val is not None and value < min_val:
                field_errors.append(f'Минимальное значение: {min_val}')
            max_val = rules.get('max')
            if max_val is not None and value > max_val:
                field_errors.append(f'Максимальное значение: {max_val}')

        if field_errors:
            errors[field] = field_errors

    return errors


def validation_error(errors):
    """Формирует единообразный JSON-ответ 400 с деталями ошибок валидации."""
    return jsonify({
        'error': 'Ошибка валидации',
        'details': errors
    }), 400


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

# --- Tasks ---
TASK_CREATE_SCHEMA = {
    'title': {'required': True, 'type': 'str', 'max_length': 200},
    'description': {'type': 'str'},
    'status_id': {'type': 'int', 'min': 1},
    'priority': {'type': 'str', 'max_length': 50},
    'project_id': {'type': 'int', 'min': 1},
    'assignee_id': {'type': 'int', 'min': 1},
    'author_id': {'type': 'int', 'min': 1},
    'due_date': {'type': 'date'},
    'tags': {'type': 'list'},
}

TASK_UPDATE_SCHEMA = TASK_CREATE_SCHEMA  # partial=True при вызове

TASK_COMMENT_SCHEMA = {
    'text': {'required': True, 'type': 'str', 'max_length': 5000},
}

# --- Contacts ---
CONTACT_CREATE_SCHEMA = {
    'last_name': {'required': True, 'type': 'str', 'max_length': 100},
    'first_name': {'type': 'str', 'max_length': 100},
    'middle_name': {'type': 'str', 'max_length': 100},
    'department': {'type': 'str', 'max_length': 100},
    'role': {'type': 'str', 'max_length': 100},
    'email': {'type': 'str', 'max_length': 100},
    'phone': {'type': 'str', 'max_length': 50},
    'link': {'type': 'str', 'max_length': 256},
    'notes': {'type': 'str'},
    'type_id': {'type': 'int', 'min': 1},
    'is_self': {'type': 'bool'},
    'is_team': {'type': 'bool'},
    'tags': {'type': 'list'},
}

CONTACT_UPDATE_SCHEMA = CONTACT_CREATE_SCHEMA

# --- Projects ---
PROJECT_CREATE_SCHEMA = {
    'title': {'required': True, 'type': 'str', 'max_length': 200},
    'description': {'type': 'str'},
    'status': {'type': 'str', 'choices': ['Active', 'Archived', 'Planning', 'On Hold', 'Done']},
    'link': {'type': 'str', 'max_length': 256},
}

PROJECT_UPDATE_SCHEMA = PROJECT_CREATE_SCHEMA

# --- Tags ---
TAG_CREATE_SCHEMA = {
    'name': {'required': True, 'type': 'str', 'max_length': 50},
}

TAG_UPDATE_SCHEMA = TAG_CREATE_SCHEMA

# --- Quick Links ---
QUICK_LINK_CREATE_SCHEMA = {
    'title': {'required': True, 'type': 'str', 'max_length': 100},
    'url': {'required': True, 'type': 'str', 'max_length': 500},
    'icon': {'type': 'str', 'max_length': 50},
}

QUICK_LINK_UPDATE_SCHEMA = QUICK_LINK_CREATE_SCHEMA

# --- View Log ---
VIEW_LOG_SCHEMA = {
    'entity_type': {'required': True, 'type': 'str', 'choices': ['task', 'project', 'contact']},
    'entity_id': {'required': True, 'type': 'int', 'min': 1},
}

# --- Meetings ---
MEETING_CREATE_SCHEMA = {
    'title': {'type': 'str', 'max_length': 200},
    'date': {'type': 'date'},
    'time': {'type': 'time'},
    'duration_minutes': {'type': 'int', 'min': 1, 'max': 1440},
    'type_id': {'type': 'int', 'min': 1},
    'agenda': {'type': 'str'},
    'notes': {'type': 'str'},
    'project_id': {'type': 'int', 'min': 1},
    'status': {'type': 'str', 'choices': ['planned', 'in_progress', 'completed', 'cancelled']},
    'participants': {'type': 'list'},
    'participant_ids': {'type': 'list'},
}

MEETING_UPDATE_SCHEMA = MEETING_CREATE_SCHEMA

MEETING_NOTE_SCHEMA = {
    'text': {'required': True, 'type': 'str', 'max_length': 5000},
    'source': {'type': 'str', 'choices': ['manual', 'voice', 'ai']},
    'category': {'type': 'str', 'choices': ['note', 'decision', 'question', 'task']},
}

MEETING_ACTION_ITEM_SCHEMA = {
    'text': {'required': True, 'type': 'str', 'max_length': 500},
    'assignee_id': {'type': 'int', 'min': 1},
    'is_done': {'type': 'bool'},
}
