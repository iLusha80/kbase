"""Тесты для API роутов."""
import pytest


class TestMainRoutes:
    """Тесты главных страниц."""

    def test_index_page(self, client):
        """Главная страница доступна."""
        response = client.get('/')
        assert response.status_code == 200


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
        """Создание задачи без заголовка должно вернуть ошибку."""
        response = client.post('/api/tasks', json={
            'description': 'Только описание'
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_get_task_detail(self, client):
        """Получение деталей задачи."""
        # Создаём задачу
        create_resp = client.post('/api/tasks', json={'title': 'Детальная задача'})
        task_id = create_resp.get_json()['id']

        # Получаем детали
        response = client.get(f'/api/tasks/{task_id}')
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == 'Детальная задача'
        assert 'comments' in data
        assert 'history' in data

    def test_update_task(self, client):
        """Обновление задачи."""
        # Создаём
        create_resp = client.post('/api/tasks', json={'title': 'Старое название'})
        task_id = create_resp.get_json()['id']

        # Обновляем
        response = client.put(f'/api/tasks/{task_id}', json={'title': 'Новое название'})
        assert response.status_code == 200
        data = response.get_json()
        assert data['title'] == 'Новое название'

    def test_delete_task(self, client):
        """Удаление задачи."""
        # Создаём
        create_resp = client.post('/api/tasks', json={'title': 'Удаляемая задача'})
        task_id = create_resp.get_json()['id']

        # Удаляем
        response = client.delete(f'/api/tasks/{task_id}')
        assert response.status_code == 200

        # Проверяем, что задача удалена
        get_resp = client.get(f'/api/tasks/{task_id}')
        assert get_resp.status_code == 404


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
        # Дефолтные типы из init_db
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

    def test_project_lifecycle(self, client):
        """Полный цикл: создание, чтение, обновление, удаление."""
        # Create
        create_resp = client.post('/api/projects', json={'title': 'Lifecycle Project'})
        assert create_resp.status_code == 201
        project_id = create_resp.get_json()['id']

        # Read
        get_resp = client.get(f'/api/projects/{project_id}')
        assert get_resp.status_code == 200
        assert get_resp.get_json()['title'] == 'Lifecycle Project'

        # Update
        update_resp = client.put(f'/api/projects/{project_id}', json={'title': 'Updated Project'})
        assert update_resp.status_code == 200
        assert update_resp.get_json()['title'] == 'Updated Project'

        # Delete
        delete_resp = client.delete(f'/api/projects/{project_id}')
        assert delete_resp.status_code == 200

        # Verify deleted
        verify_resp = client.get(f'/api/projects/{project_id}')
        assert verify_resp.status_code == 404
