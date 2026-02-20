"""Unit-тесты для сервисов."""
import pytest
from core.models import (
    Task, TaskStatus, TaskComment, Contact, ContactType,
    Project, Tag, FavoriteContact, Meeting, MeetingType
)
from services.task_service import (
    create_task, get_all_tasks, get_task_by_id,
    update_task, delete_task, add_comment_to_task, delete_comment,
    get_task_statuses
)
from services.contact_service import (
    create_contact, get_all_contacts, update_contact, delete_contact,
    get_contact_types, set_self, unset_self, get_self_contact,
    toggle_team, get_team_contacts, toggle_favorite_status,
    get_contact_full_details
)
from services.project_service import (
    create_project, get_all_projects, get_project_by_id,
    update_project, delete_project
)
from services.tag_service import (
    process_tags, get_all_tags, create_tag, update_tag, delete_tag
)


# =========================================================================
# Task Service
# =========================================================================

class TestTaskService:

    def test_create_task_minimal(self, db_session):
        """Создание задачи с минимальными данными."""
        task = create_task({'title': 'Минимальная задача'})
        assert task.id is not None
        assert task.title == 'Минимальная задача'
        assert task.status.name == 'К выполнению'

    def test_create_task_with_all_fields(self, db_session):
        """Создание задачи со всеми полями."""
        contact = Contact(last_name='Тест')
        db_session.add(contact)
        db_session.commit()

        project = Project(title='Проект')
        db_session.add(project)
        db_session.commit()

        task = create_task({
            'title': 'Полная задача',
            'description': 'Описание',
            'due_date': '2025-12-31',
            'assignee_id': contact.id,
            'author_id': contact.id,
            'project_id': project.id,
            'tags': ['важно', 'срочно']
        })

        assert task.description == 'Описание'
        assert task.due_date is not None
        assert task.assignee_id == contact.id
        assert task.project_id == project.id
        assert len(task.tags) == 2

    def test_get_all_tasks(self, db_session):
        create_task({'title': 'Задача 1'})
        create_task({'title': 'Задача 2'})
        tasks = get_all_tasks()
        assert len(tasks) == 2

    def test_update_task_title(self, db_session):
        task = create_task({'title': 'Старое'})
        updated = update_task(task.id, {'title': 'Новое'})
        assert updated.title == 'Новое'

    def test_update_nonexistent_task(self, db_session):
        result = update_task(9999, {'title': 'X'})
        assert result is None

    def test_delete_task(self, db_session):
        task = create_task({'title': 'Удаляемая'})
        assert delete_task(task.id) is True
        assert get_task_by_id(task.id) is None

    def test_delete_nonexistent_task(self, db_session):
        assert delete_task(9999) is False

    def test_get_task_statuses(self, db_session):
        statuses = get_task_statuses()
        assert len(statuses) == 4
        names = [s.name for s in statuses]
        assert 'К выполнению' in names
        assert 'Готово' in names

    def test_add_comment(self, db_session):
        task = create_task({'title': 'С комментарием'})
        comment = add_comment_to_task(task.id, 'Тестовый комментарий')
        assert comment is not None
        assert comment.text == 'Тестовый комментарий'
        assert comment.task_id == task.id

    def test_add_empty_comment(self, db_session):
        task = create_task({'title': 'Пустой коммент'})
        comment = add_comment_to_task(task.id, '')
        assert comment is None

    def test_add_whitespace_comment(self, db_session):
        task = create_task({'title': 'Пробел коммент'})
        comment = add_comment_to_task(task.id, '   ')
        assert comment is None

    def test_delete_comment(self, db_session):
        task = create_task({'title': 'T'})
        comment = add_comment_to_task(task.id, 'Удалить')
        assert delete_comment(comment.id) is True
        assert delete_comment(comment.id) is False  # уже удален

    def test_create_task_with_invalid_date(self, db_session):
        """Невалидная дата не вызывает ошибку — просто None."""
        task = create_task({'title': 'Плохая дата', 'due_date': 'not-a-date'})
        assert task.due_date is None


# =========================================================================
# Contact Service
# =========================================================================

class TestContactService:

    def test_create_contact_minimal(self, db_session):
        contact = create_contact({'last_name': 'Иванов'})
        assert contact.id is not None
        assert contact.last_name == 'Иванов'

    def test_create_contact_default_type(self, db_session):
        """Контакт без type_id получает тип 'Контрагенты'."""
        contact = create_contact({'last_name': 'Петров'})
        ct = ContactType.query.get(contact.type_id)
        assert ct.name_type == 'Контрагенты'

    def test_create_contact_with_tags(self, db_session):
        contact = create_contact({'last_name': 'С тегом', 'tags': ['vip', 'partner']})
        assert len(contact.tags) == 2

    def test_get_all_contacts_ordered(self, db_session):
        create_contact({'last_name': 'Яковлев'})
        create_contact({'last_name': 'Абрамов'})
        contacts = get_all_contacts()
        assert contacts[0].last_name == 'Абрамов'
        assert contacts[1].last_name == 'Яковлев'

    def test_update_contact(self, db_session):
        contact = create_contact({'last_name': 'Старый'})
        updated = update_contact(contact.id, {'last_name': 'Новый', 'department': 'IT'})
        assert updated.last_name == 'Новый'
        assert updated.department == 'IT'

    def test_update_nonexistent_contact(self, db_session):
        result = update_contact(9999, {'last_name': 'X'})
        assert result is None

    def test_delete_contact(self, db_session):
        contact = create_contact({'last_name': 'Удалить'})
        assert delete_contact(contact.id) is True
        assert delete_contact(contact.id) is False

    def test_get_contact_types(self, db_session):
        types = get_contact_types()
        assert len(types) == 4
        names = [t.name_type for t in types]
        assert 'Руководство' in names

    def test_set_self(self, db_session):
        c1 = create_contact({'last_name': 'Я'})
        result = set_self(c1.id)
        assert result.is_self is True
        assert get_self_contact().id == c1.id

    def test_set_self_replaces_previous(self, db_session):
        c1 = create_contact({'last_name': 'Первый'})
        c2 = create_contact({'last_name': 'Второй'})
        set_self(c1.id)
        set_self(c2.id)
        assert get_self_contact().id == c2.id
        # Первый больше не self
        from core.models import Contact
        first = Contact.query.get(c1.id)
        assert first.is_self is False

    def test_unset_self(self, db_session):
        c = create_contact({'last_name': 'Сброс'})
        set_self(c.id)
        unset_self(c.id)
        assert get_self_contact() is None

    def test_toggle_team(self, db_session):
        c = create_contact({'last_name': 'Команда'})
        assert c.is_team is False
        result = toggle_team(c.id)
        assert result is True
        result = toggle_team(c.id)
        assert result is False

    def test_get_team_contacts(self, db_session):
        c1 = create_contact({'last_name': 'Команда1', 'is_team': True})
        c2 = create_contact({'last_name': 'НеКоманда'})
        team = get_team_contacts()
        assert len(team) == 1
        assert team[0].last_name == 'Команда1'

    def test_toggle_favorite(self, db_session):
        c = create_contact({'last_name': 'Избранный'})
        # Добавляем
        result = toggle_favorite_status(c.id)
        assert result is True
        # Убираем
        result = toggle_favorite_status(c.id)
        assert result is False

    def test_contact_full_details(self, db_session):
        c = create_contact({'last_name': 'Детальный', 'first_name': 'Тест'})
        details = get_contact_full_details(c.id)
        assert details is not None
        assert details['last_name'] == 'Детальный'
        assert 'projects' in details
        assert 'tasks_assigned_active' in details
        assert 'is_favorite' in details

    def test_contact_full_details_nonexistent(self, db_session):
        assert get_contact_full_details(9999) is None


# =========================================================================
# Project Service
# =========================================================================

class TestProjectService:

    def test_create_project_minimal(self, db_session):
        p = create_project({'title': 'Проект'})
        assert p.id is not None
        assert p.status == 'Active'

    def test_create_project_with_fields(self, db_session):
        p = create_project({
            'title': 'Полный',
            'description': 'Описание',
            'status': 'Planning',
            'link': 'https://jira.example.com'
        })
        assert p.description == 'Описание'
        assert p.status == 'Planning'
        assert p.link == 'https://jira.example.com'

    def test_get_all_projects(self, db_session):
        create_project({'title': 'P1'})
        create_project({'title': 'P2'})
        projects = get_all_projects()
        assert len(projects) == 2

    def test_update_project(self, db_session):
        p = create_project({'title': 'Старый'})
        updated = update_project(p.id, {'title': 'Новый', 'status': 'On Hold'})
        assert updated.title == 'Новый'
        assert updated.status == 'On Hold'

    def test_update_nonexistent_project(self, db_session):
        result = update_project(9999, {'title': 'X'})
        assert result is None

    def test_delete_project(self, db_session):
        p = create_project({'title': 'Удалить'})
        assert delete_project(p.id) is True
        assert get_project_by_id(p.id) is None

    def test_delete_nonexistent_project(self, db_session):
        assert delete_project(9999) is False

    def test_project_to_dict_with_tasks(self, db_session):
        p = create_project({'title': 'С задачами'})
        create_task({'title': 'T1', 'project_id': p.id})
        create_task({'title': 'T2', 'project_id': p.id})
        p_fresh = get_project_by_id(p.id)
        data = p_fresh.to_dict()
        assert data['tasks_count'] == 2


# =========================================================================
# Tag Service
# =========================================================================

class TestTagService:

    def test_create_tag(self, db_session):
        tag = create_tag('новый')
        assert tag.id is not None
        assert tag.name == 'новый'

    def test_get_all_tags_sorted(self, db_session):
        create_tag('beta')
        create_tag('alpha')
        tags = get_all_tags()
        assert tags[0].name == 'alpha'
        assert tags[1].name == 'beta'

    def test_update_tag(self, db_session):
        tag = create_tag('old')
        updated = update_tag(tag.id, 'new')
        assert updated.name == 'new'

    def test_update_nonexistent_tag(self, db_session):
        result = update_tag(9999, 'x')
        assert result is None

    def test_delete_tag(self, db_session):
        tag = create_tag('temp')
        assert delete_tag(tag.id) is True
        assert delete_tag(tag.id) is False

    def test_process_tags_creates_new(self, db_session):
        tags = process_tags(['new1', 'new2'])
        db_session.commit()
        assert len(tags) == 2
        assert all(t.id is not None for t in tags)

    def test_process_tags_reuses_existing(self, db_session):
        create_tag('existing')
        tags = process_tags(['existing', 'brand_new'])
        db_session.commit()
        assert len(tags) == 2
        # Убедимся что 'existing' не продублирован
        all_tags = get_all_tags()
        existing_count = sum(1 for t in all_tags if t.name == 'existing')
        assert existing_count == 1

    def test_process_tags_empty(self, db_session):
        tags = process_tags([])
        assert tags == []

    def test_process_tags_strips_whitespace(self, db_session):
        tags = process_tags(['  spaced  ', ''])
        db_session.commit()
        assert len(tags) == 1
        assert tags[0].name == 'spaced'
