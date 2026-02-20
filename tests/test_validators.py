"""Тесты для модуля валидации данных."""
import pytest
from services.validators import (
    validate, validation_error,
    TASK_CREATE_SCHEMA, TASK_COMMENT_SCHEMA,
    CONTACT_CREATE_SCHEMA, PROJECT_CREATE_SCHEMA,
    MEETING_CREATE_SCHEMA, TAG_CREATE_SCHEMA,
    QUICK_LINK_CREATE_SCHEMA, VIEW_LOG_SCHEMA,
    MEETING_NOTE_SCHEMA, MEETING_ACTION_ITEM_SCHEMA,
)


class TestValidateCore:
    """Базовая логика validate()."""

    def test_none_data_returns_error(self):
        errors = validate(None, TASK_CREATE_SCHEMA)
        assert '_' in errors

    def test_empty_dict_with_required_field(self):
        errors = validate({}, TASK_CREATE_SCHEMA)
        assert 'title' in errors
        assert 'Обязательное поле' in errors['title']

    def test_valid_data_returns_empty(self):
        errors = validate({'title': 'Test'}, TASK_CREATE_SCHEMA)
        assert errors == {}

    def test_partial_mode_skips_required(self):
        errors = validate({}, TASK_CREATE_SCHEMA, partial=True)
        assert errors == {}

    def test_partial_mode_still_validates_types(self):
        errors = validate({'due_date': 'not-a-date'}, TASK_CREATE_SCHEMA, partial=True)
        assert 'due_date' in errors

    def test_empty_string_skipped_for_optional(self):
        """Пустая строка из формы для необязательных полей не вызывает ошибку типа."""
        errors = validate({'title': 'T', 'project_id': ''}, TASK_CREATE_SCHEMA)
        assert errors == {}

    def test_empty_string_fails_for_required(self):
        errors = validate({'title': '   '}, TASK_CREATE_SCHEMA)
        assert 'title' in errors


class TestTypeValidation:
    """Проверка типов данных."""

    def test_str_type_valid(self):
        errors = validate({'title': 'hello'}, {'title': {'type': 'str'}})
        assert errors == {}

    def test_str_type_invalid(self):
        errors = validate({'title': 123}, {'title': {'type': 'str'}})
        assert 'title' in errors

    def test_int_type_valid(self):
        errors = validate({'count': 5}, {'count': {'type': 'int'}})
        assert errors == {}

    def test_int_type_invalid_string(self):
        errors = validate({'count': 'five'}, {'count': {'type': 'int'}})
        assert 'count' in errors

    def test_int_type_invalid_bool(self):
        """bool не должен считаться int."""
        errors = validate({'count': True}, {'count': {'type': 'int'}})
        assert 'count' in errors

    def test_bool_type_valid(self):
        errors = validate({'flag': True}, {'flag': {'type': 'bool'}})
        assert errors == {}

    def test_bool_type_invalid(self):
        errors = validate({'flag': 1}, {'flag': {'type': 'bool'}})
        assert 'flag' in errors

    def test_list_type_valid(self):
        errors = validate({'items': [1, 2]}, {'items': {'type': 'list'}})
        assert errors == {}

    def test_list_type_invalid(self):
        errors = validate({'items': 'not a list'}, {'items': {'type': 'list'}})
        assert 'items' in errors

    def test_date_valid(self):
        errors = validate({'d': '2025-12-31'}, {'d': {'type': 'date'}})
        assert errors == {}

    def test_date_invalid_format(self):
        errors = validate({'d': '31/12/2025'}, {'d': {'type': 'date'}})
        assert 'd' in errors

    def test_date_invalid_value(self):
        errors = validate({'d': '2025-13-01'}, {'d': {'type': 'date'}})
        assert 'd' in errors

    def test_time_valid(self):
        errors = validate({'t': '14:30'}, {'t': {'type': 'time'}})
        assert errors == {}

    def test_time_with_seconds(self):
        errors = validate({'t': '14:30:00'}, {'t': {'type': 'time'}})
        assert errors == {}

    def test_time_invalid(self):
        errors = validate({'t': '25:00'}, {'t': {'type': 'time'}})
        assert 't' in errors


class TestConstraints:
    """Проверка ограничений: max_length, choices, min, max."""

    def test_max_length_ok(self):
        errors = validate({'name': 'abc'}, {'name': {'type': 'str', 'max_length': 10}})
        assert errors == {}

    def test_max_length_exceeded(self):
        errors = validate({'name': 'x' * 201}, {'name': {'type': 'str', 'max_length': 200}})
        assert 'name' in errors
        assert '200' in errors['name'][0]

    def test_choices_valid(self):
        errors = validate({'status': 'Active'}, {'status': {'type': 'str', 'choices': ['Active', 'Archived']}})
        assert errors == {}

    def test_choices_invalid(self):
        errors = validate({'status': 'Unknown'}, {'status': {'type': 'str', 'choices': ['Active', 'Archived']}})
        assert 'status' in errors

    def test_min_value(self):
        errors = validate({'count': 0}, {'count': {'type': 'int', 'min': 1}})
        assert 'count' in errors

    def test_max_value(self):
        errors = validate({'count': 9999}, {'count': {'type': 'int', 'max': 100}})
        assert 'count' in errors

    def test_min_max_ok(self):
        errors = validate({'count': 50}, {'count': {'type': 'int', 'min': 1, 'max': 100}})
        assert errors == {}


class TestSchemas:
    """Тесты конкретных схем."""

    def test_task_create_valid(self):
        errors = validate({'title': 'Buy milk', 'due_date': '2025-06-01'}, TASK_CREATE_SCHEMA)
        assert errors == {}

    def test_task_create_missing_title(self):
        errors = validate({'description': 'no title'}, TASK_CREATE_SCHEMA)
        assert 'title' in errors

    def test_task_comment_valid(self):
        errors = validate({'text': 'Great job!'}, TASK_COMMENT_SCHEMA)
        assert errors == {}

    def test_task_comment_empty(self):
        errors = validate({'text': ''}, TASK_COMMENT_SCHEMA)
        assert 'text' in errors

    def test_contact_create_valid(self):
        errors = validate({'last_name': 'Иванов', 'email': 'ivan@mail.ru'}, CONTACT_CREATE_SCHEMA)
        assert errors == {}

    def test_contact_create_missing_lastname(self):
        errors = validate({'first_name': 'Иван'}, CONTACT_CREATE_SCHEMA)
        assert 'last_name' in errors

    def test_project_create_valid(self):
        errors = validate({'title': 'Project X', 'status': 'Active'}, PROJECT_CREATE_SCHEMA)
        assert errors == {}

    def test_project_create_invalid_status(self):
        errors = validate({'title': 'X', 'status': 'WrongStatus'}, PROJECT_CREATE_SCHEMA)
        assert 'status' in errors

    def test_meeting_create_valid(self):
        errors = validate({'date': '2025-06-01', 'time': '10:00'}, MEETING_CREATE_SCHEMA)
        assert errors == {}

    def test_meeting_create_missing_date(self):
        errors = validate({'title': 'Meeting'}, MEETING_CREATE_SCHEMA)
        assert 'date' in errors

    def test_tag_create_valid(self):
        errors = validate({'name': 'important'}, TAG_CREATE_SCHEMA)
        assert errors == {}

    def test_tag_create_empty_name(self):
        errors = validate({'name': ''}, TAG_CREATE_SCHEMA)
        assert 'name' in errors

    def test_quick_link_valid(self):
        errors = validate({'title': 'Jira', 'url': 'https://jira.example.com'}, QUICK_LINK_CREATE_SCHEMA)
        assert errors == {}

    def test_quick_link_missing_url(self):
        errors = validate({'title': 'Jira'}, QUICK_LINK_CREATE_SCHEMA)
        assert 'url' in errors

    def test_view_log_valid(self):
        errors = validate({'entity_type': 'task', 'entity_id': 1}, VIEW_LOG_SCHEMA)
        assert errors == {}

    def test_view_log_invalid_type(self):
        errors = validate({'entity_type': 'invalid', 'entity_id': 1}, VIEW_LOG_SCHEMA)
        assert 'entity_type' in errors

    def test_meeting_note_valid(self):
        errors = validate({'text': 'Important point', 'source': 'manual'}, MEETING_NOTE_SCHEMA)
        assert errors == {}

    def test_meeting_note_invalid_source(self):
        errors = validate({'text': 'Note', 'source': 'unknown'}, MEETING_NOTE_SCHEMA)
        assert 'source' in errors

    def test_action_item_valid(self):
        errors = validate({'text': 'Do this'}, MEETING_ACTION_ITEM_SCHEMA)
        assert errors == {}

    def test_action_item_missing_text(self):
        errors = validate({}, MEETING_ACTION_ITEM_SCHEMA)
        assert 'text' in errors


class TestValidationError:
    """Тест формата ответа validation_error."""

    def test_returns_json_400(self, app):
        with app.test_request_context():
            response, status_code = validation_error({'title': ['Обязательное поле']})
            assert status_code == 400
            data = response.get_json()
            assert data['error'] == 'Ошибка валидации'
            assert 'title' in data['details']
