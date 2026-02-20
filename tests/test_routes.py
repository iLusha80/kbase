"""Тесты для API роутов."""
import pytest


class TestMainRoutes:
    """Тесты главных страниц."""

    def test_index_page(self, client):
        """Главная страница доступна."""
        response = client.get('/')
        assert response.status_code == 200

    def test_spa_routes_return_200(self, client):
        """Все SPA-роуты возвращают 200 (отдают index.html)."""
        for path in ['/tasks', '/contacts', '/projects', '/meetings',
                     '/inbox', '/daily-standup',
                     '/menu', '/reports/weekly']:
            response = client.get(path)
            assert response.status_code == 200, f"Failed: {path}"


# =========================================================================
# Tasks API
# =========================================================================

class TestTasksAPI:
    """Тесты API задач."""

    def test_get_tasks_empty(self, client):
        """Получение пустого списка задач."""
        response = client.get('/api/tasks')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_task_statuses(self, client):
        """Получение статусов задач."""
        response = client.get('/api/task-statuses')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        # Дефолтные статусы из init_db
        assert len(data) == 4
        assert data[0]['name'] == 'К выполнению'

    def test_create_task(self, client):
        """Создание новой задачи."""
        response = client.post('/api/tasks', json={
            'title': 'Тестовая задача',
            'description': 'Описание тестовой задачи'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'Тестовая задача'
        assert data['id'] is not None

    def test_create_task_without_title(self, client):
        """Создание задачи без заголовка должно вернуть ошибку валидации."""
        response = client.post('/api/tasks', json={
            'description': 'Только описание'
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'details' in data
        assert 'title' in data['details']

    def test_create_task_empty_body(self, client):
        """Создание задачи с пустым телом."""
        response = client.post('/api/tasks',
                               data='', content_type='application/json')
        assert response.status_code == 400

    def test_get_task_detail(self, client):
        """Получение деталей задачи."""
        create_resp = client.post('/api/tasks', json={'title': 'Детальная задача'})
        task_id = create_resp.get_json()['id']

        response = client.get(f'/api/tasks/{task_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == 'Детальная задача'
        assert 'comments' in data
        assert 'history' in data

    def test_get_nonexistent_task(self, client):
        response = client.get('/api/tasks/99999')
        assert response.status_code == 404

    def test_update_task(self, client):
        """Обновление задачи."""
        create_resp = client.post('/api/tasks', json={'title': 'Старое название'})
        task_id = create_resp.get_json()['id']

        response = client.put(f'/api/tasks/{task_id}', json={'title': 'Новое название'})
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == 'Новое название'

    def test_update_nonexistent_task(self, client):
        response = client.put('/api/tasks/99999', json={'title': 'X'})
        assert response.status_code == 404

    def test_delete_task(self, client):
        """Удаление задачи."""
        create_resp = client.post('/api/tasks', json={'title': 'Удаляемая задача'})
        task_id = create_resp.get_json()['id']

        response = client.delete(f'/api/tasks/{task_id}')
        assert response.status_code == 200

        get_resp = client.get(f'/api/tasks/{task_id}')
        assert get_resp.status_code == 404

    def test_delete_nonexistent_task(self, client):
        response = client.delete('/api/tasks/99999')
        assert response.status_code == 404

    def test_task_comments_crud(self, client):
        """CRUD комментариев к задаче."""
        # Создаём задачу
        task_resp = client.post('/api/tasks', json={'title': 'С комментариями'})
        task_id = task_resp.get_json()['id']

        # Добавляем комментарий
        comment_resp = client.post(f'/api/tasks/{task_id}/comments',
                                   json={'text': 'Первый комментарий'})
        assert comment_resp.status_code == 201
        comment_id = comment_resp.get_json()['id']

        # Удаляем комментарий
        del_resp = client.delete(f'/api/comments/{comment_id}')
        assert del_resp.status_code == 200

    def test_task_comment_validation(self, client):
        """Комментарий без текста — ошибка валидации."""
        task_resp = client.post('/api/tasks', json={'title': 'X'})
        task_id = task_resp.get_json()['id']
        response = client.post(f'/api/tasks/{task_id}/comments', json={'text': ''})
        assert response.status_code == 400

    def test_task_with_tags(self, client):
        """Создание задачи с тегами."""
        response = client.post('/api/tasks', json={
            'title': 'С тегами',
            'tags': ['важно', 'срочно']
        })
        assert response.status_code == 201
        data = response.get_json()
        assert len(data['tags']) == 2

    def test_task_validation_title_too_long(self, client):
        """Слишком длинное название задачи."""
        response = client.post('/api/tasks', json={'title': 'x' * 201})
        assert response.status_code == 400
        data = response.get_json()
        assert 'title' in data['details']


# =========================================================================
# Contacts API
# =========================================================================

class TestContactsAPI:
    """Тесты API контактов."""

    def test_get_contacts_empty(self, client):
        """Получение пустого списка контактов."""
        response = client.get('/api/contacts')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_get_contact_types(self, client):
        """Получение типов контактов."""
        response = client.get('/api/contact-types')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) == 4

    def test_create_contact(self, client):
        """Создание нового контакта."""
        response = client.post('/api/contacts', json={
            'last_name': 'Иванов',
            'first_name': 'Иван',
            'department': 'IT'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['last_name'] == 'Иванов'

    def test_create_contact_without_lastname(self, client):
        """Создание контакта без фамилии должно вернуть ошибку."""
        response = client.post('/api/contacts', json={
            'first_name': 'Иван'
        })
        assert response.status_code == 400

    def test_update_contact(self, client):
        resp = client.post('/api/contacts', json={'last_name': 'Старый'})
        cid = resp.get_json()['id']
        update_resp = client.put(f'/api/contacts/{cid}', json={'last_name': 'Новый'})
        assert update_resp.status_code == 200
        assert update_resp.get_json()['last_name'] == 'Новый'

    def test_delete_contact(self, client):
        resp = client.post('/api/contacts', json={'last_name': 'Удалить'})
        cid = resp.get_json()['id']
        del_resp = client.delete(f'/api/contacts/{cid}')
        assert del_resp.status_code == 200

    def test_contact_detail(self, client):
        resp = client.post('/api/contacts', json={'last_name': 'Детальный'})
        cid = resp.get_json()['id']
        detail = client.get(f'/api/contacts/{cid}')
        assert detail.status_code == 200
        data = detail.get_json()
        assert 'projects' in data
        assert 'tasks_assigned_active' in data

    def test_self_contact(self, client):
        """Установка и получение self-контакта."""
        resp = client.post('/api/contacts', json={'last_name': 'Я'})
        cid = resp.get_json()['id']

        # Пока нет self
        self_resp = client.get('/api/contacts/self')
        assert self_resp.get_json() is None

        # Устанавливаем
        set_resp = client.post(f'/api/contacts/{cid}/set-self')
        assert set_resp.status_code == 200

        # Проверяем
        self_resp = client.get('/api/contacts/self')
        assert self_resp.get_json()['id'] == cid

    def test_toggle_team(self, client):
        resp = client.post('/api/contacts', json={'last_name': 'Команда'})
        cid = resp.get_json()['id']

        toggle = client.post(f'/api/contacts/{cid}/toggle-team')
        assert toggle.get_json()['is_team'] is True

        toggle2 = client.post(f'/api/contacts/{cid}/toggle-team')
        assert toggle2.get_json()['is_team'] is False

    def test_team_list(self, client):
        client.post('/api/contacts', json={'last_name': 'Нет'})
        resp = client.post('/api/contacts', json={'last_name': 'Да'})
        cid = resp.get_json()['id']
        client.post(f'/api/contacts/{cid}/toggle-team')

        team = client.get('/api/contacts/team')
        data = team.get_json()
        assert len(data) == 1
        assert data[0]['last_name'] == 'Да'

    def test_toggle_favorite(self, client):
        resp = client.post('/api/contacts', json={'last_name': 'Избранный'})
        cid = resp.get_json()['id']
        fav = client.post(f'/api/contacts/{cid}/favorite')
        assert fav.get_json()['is_favorite'] is True


# =========================================================================
# Projects API
# =========================================================================

class TestProjectsAPI:
    """Тесты API проектов."""

    def test_get_projects_empty(self, client):
        """Получение пустого списка проектов."""
        response = client.get('/api/projects')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_create_project(self, client):
        """Создание нового проекта."""
        response = client.post('/api/projects', json={
            'title': 'Тестовый проект',
            'description': 'Описание проекта'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'Тестовый проект'

    def test_create_project_without_title(self, client):
        """Проект без названия — ошибка валидации."""
        response = client.post('/api/projects', json={'description': 'Без названия'})
        assert response.status_code == 400
        data = response.get_json()
        assert 'details' in data
        assert 'title' in data['details']

    def test_create_project_invalid_status(self, client):
        """Проект с невалидным статусом."""
        response = client.post('/api/projects', json={
            'title': 'X', 'status': 'InvalidStatus'
        })
        assert response.status_code == 400
        assert 'status' in response.get_json()['details']

    def test_project_lifecycle(self, client):
        """Полный цикл: создание, чтение, обновление, удаление."""
        create_resp = client.post('/api/projects', json={'title': 'Lifecycle Project'})
        assert create_resp.status_code == 201
        project_id = create_resp.get_json()['id']

        get_resp = client.get(f'/api/projects/{project_id}')
        assert get_resp.status_code == 200
        assert get_resp.get_json()['title'] == 'Lifecycle Project'

        update_resp = client.put(f'/api/projects/{project_id}', json={'title': 'Updated Project'})
        assert update_resp.status_code == 200
        assert update_resp.get_json()['title'] == 'Updated Project'

        delete_resp = client.delete(f'/api/projects/{project_id}')
        assert delete_resp.status_code == 200

        verify_resp = client.get(f'/api/projects/{project_id}')
        assert verify_resp.status_code == 404


# =========================================================================
# Tags API
# =========================================================================

class TestTagsAPI:
    """Тесты API тегов."""

    def test_get_tags_empty(self, client):
        response = client.get('/api/tags')
        assert response.status_code == 200
        assert isinstance(response.get_json(), list)

    def test_create_tag(self, client):
        response = client.post('/api/tags', json={'name': 'важно'})
        assert response.status_code == 201
        assert response.get_json()['name'] == 'важно'

    def test_create_tag_without_name(self, client):
        response = client.post('/api/tags', json={})
        assert response.status_code == 400

    def test_update_tag(self, client):
        resp = client.post('/api/tags', json={'name': 'old'})
        tag_id = resp.get_json()['id']
        update = client.put(f'/api/tags/{tag_id}', json={'name': 'new'})
        assert update.status_code == 200
        assert update.get_json()['name'] == 'new'

    def test_delete_tag(self, client):
        resp = client.post('/api/tags', json={'name': 'temp'})
        tag_id = resp.get_json()['id']
        del_resp = client.delete(f'/api/tags/{tag_id}')
        assert del_resp.status_code == 200

    def test_delete_nonexistent_tag(self, client):
        response = client.delete('/api/tags/99999')
        assert response.status_code == 404


# =========================================================================
# Meetings API
# =========================================================================

class TestMeetingsAPI:
    """Тесты API встреч."""

    def test_get_meetings_empty(self, client):
        response = client.get('/api/meetings')
        assert response.status_code == 200
        assert isinstance(response.get_json(), list)

    def test_get_meeting_types(self, client):
        response = client.get('/api/meeting-types')
        assert response.status_code == 200
        types = response.get_json()
        assert isinstance(types, list)
        assert len(types) > 0
        names = [t['name'] for t in types]
        assert 'Дейлик' in names

    def test_create_meeting(self, client):
        response = client.post('/api/meetings', json={
            'title': 'Тестовая встреча',
            'date': '2025-06-15',
            'time': '10:00'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['title'] == 'Тестовая встреча'
        assert data['date'] == '2025-06-15'

    def test_create_meeting_without_date(self, client):
        """Встреча без даты — ошибка валидации."""
        response = client.post('/api/meetings', json={'title': 'Без даты'})
        assert response.status_code == 400
        assert 'details' in response.get_json()

    def test_meeting_lifecycle(self, client):
        """CRUD встречи."""
        # Create
        create_resp = client.post('/api/meetings', json={
            'date': '2025-06-15', 'title': 'Weekly'
        })
        assert create_resp.status_code == 201
        mid = create_resp.get_json()['id']

        # Read
        get_resp = client.get(f'/api/meetings/{mid}')
        assert get_resp.status_code == 200

        # Update
        update_resp = client.put(f'/api/meetings/{mid}', json={'title': 'Updated'})
        assert update_resp.status_code == 200
        assert update_resp.get_json()['title'] == 'Updated'

        # Delete
        del_resp = client.delete(f'/api/meetings/{mid}')
        assert del_resp.status_code == 200

    def test_meeting_notes(self, client):
        """CRUD заметок к встрече."""
        # Создаём встречу
        m = client.post('/api/meetings', json={'date': '2025-06-15'})
        mid = m.get_json()['id']

        # Добавляем заметку
        note_resp = client.post(f'/api/meetings/{mid}/notes',
                                json={'text': 'Важная заметка'})
        assert note_resp.status_code == 201
        note_id = note_resp.get_json()['id']

        # Обновляем
        upd = client.put(f'/api/meetings/{mid}/notes/{note_id}',
                         json={'text': 'Обновлённая'})
        assert upd.status_code == 200

        # Удаляем
        d = client.delete(f'/api/meetings/{mid}/notes/{note_id}')
        assert d.status_code == 200

    def test_meeting_note_validation(self, client):
        """Заметка без текста."""
        m = client.post('/api/meetings', json={'date': '2025-06-15'})
        mid = m.get_json()['id']
        resp = client.post(f'/api/meetings/{mid}/notes', json={'text': ''})
        assert resp.status_code == 400

    def test_meeting_action_items(self, client):
        """CRUD action items."""
        m = client.post('/api/meetings', json={'date': '2025-06-15'})
        mid = m.get_json()['id']

        # Создание
        ai_resp = client.post(f'/api/meetings/{mid}/action-items',
                              json={'text': 'Сделать отчёт'})
        assert ai_resp.status_code == 201
        ai_id = ai_resp.get_json()['id']

        # Обновление
        upd = client.put(f'/api/meetings/{mid}/action-items/{ai_id}',
                         json={'is_done': True})
        assert upd.status_code == 200

        # Удаление
        d = client.delete(f'/api/meetings/{mid}/action-items/{ai_id}')
        assert d.status_code == 200

    def test_upcoming_meetings(self, client):
        """Получение предстоящих встреч."""
        response = client.get('/api/meetings/upcoming')
        assert response.status_code == 200
        assert isinstance(response.get_json(), list)


# =========================================================================
# Dashboard & Search API
# =========================================================================

class TestDashboardAPI:
    """Тесты API дашборда."""

    def test_get_dashboard(self, client):
        response = client.get('/api/dashboard')
        assert response.status_code == 200
        data = response.get_json()
        assert 'priority_tasks' in data
        assert 'top_projects' in data
        assert 'recent_activity' in data

    def test_search_empty(self, client):
        response = client.get('/api/search?q=test')
        assert response.status_code == 200
        data = response.get_json()
        assert 'tasks' in data
        assert 'contacts' in data
        assert 'projects' in data

    def test_search_finds_task(self, client):
        """Поиск находит созданную задачу."""
        client.post('/api/tasks', json={'title': 'Уникальная задача для поиска'})
        response = client.get('/api/search?q=Уникальная')
        data = response.get_json()
        assert len(data['tasks']) >= 1

    def test_log_view(self, client):
        response = client.post('/api/views', json={
            'entity_type': 'task', 'entity_id': 1
        })
        assert response.status_code == 201

    def test_log_view_invalid_type(self, client):
        response = client.post('/api/views', json={
            'entity_type': 'invalid', 'entity_id': 1
        })
        assert response.status_code == 400

    def test_daily_standup(self, client):
        response = client.get('/api/daily-standup')
        assert response.status_code == 200
        data = response.get_json()
        assert 'generated_at' in data

    def test_one_on_one_prep(self, client):
        response = client.get('/api/one-on-one-prep')
        assert response.status_code == 200
        data = response.get_json()
        assert 'projects_progress' in data
        assert 'overdue_tasks' in data


# =========================================================================
# Quick Links API
# =========================================================================

class TestQuickLinksAPI:
    """Тесты API быстрых ссылок."""

    def test_create_quick_link(self, client):
        response = client.post('/api/quick-links', json={
            'title': 'Jira', 'url': 'https://jira.example.com'
        })
        assert response.status_code == 201
        assert response.get_json()['title'] == 'Jira'

    def test_create_quick_link_without_url(self, client):
        response = client.post('/api/quick-links', json={'title': 'Jira'})
        assert response.status_code == 400

    def test_quick_link_lifecycle(self, client):
        # Create
        resp = client.post('/api/quick-links', json={
            'title': 'Git', 'url': 'https://github.com'
        })
        link_id = resp.get_json()['id']

        # Update
        upd = client.put(f'/api/quick-links/{link_id}', json={'title': 'GitHub'})
        assert upd.status_code == 200
        assert upd.get_json()['title'] == 'GitHub'

        # Delete
        d = client.delete(f'/api/quick-links/{link_id}')
        assert d.status_code == 200


# =========================================================================
# Validation Error Format
# =========================================================================

class TestValidationErrorFormat:
    """Проверка единообразного формата ошибок валидации."""

    def test_task_validation_format(self, client):
        response = client.post('/api/tasks', json={})
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Ошибка валидации'
        assert isinstance(data['details'], dict)
        assert 'title' in data['details']
        assert isinstance(data['details']['title'], list)

    def test_contact_validation_format(self, client):
        response = client.post('/api/contacts', json={})
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Ошибка валидации'
        assert 'last_name' in data['details']

    def test_project_validation_format(self, client):
        response = client.post('/api/projects', json={})
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Ошибка валидации'
        assert 'title' in data['details']

    def test_meeting_validation_format(self, client):
        response = client.post('/api/meetings', json={})
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Ошибка валидации'
        assert 'date' in data['details']

    def test_tag_validation_format(self, client):
        response = client.post('/api/tags', json={})
        assert response.status_code == 400
        data = response.get_json()
        assert data['error'] == 'Ошибка валидации'
        assert 'name' in data['details']


# =========================================================================
# Reports API
# =========================================================================

class TestReportsAPI:
    """Тесты API отчётов."""

    def test_weekly_report(self, client):
        response = client.get('/api/reports/weekly')
        assert response.status_code == 200
        data = response.get_json()
        assert 'date_range' in data
        assert 'completed' in data
        assert 'in_progress' in data
