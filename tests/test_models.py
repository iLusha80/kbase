"""Тесты для моделей данных."""
import pytest
from core.models import Task, TaskStatus, Contact, Project, Tag


class TestTaskModel:
    """Тесты модели Task."""

    def test_create_task(self, db_session):
        """Создание задачи через модель."""
        status = TaskStatus.query.first()
        task = Task(title='Тестовая задача', status_id=status.id)
        db_session.add(task)
        db_session.commit()

        assert task.id is not None
        assert task.title == 'Тестовая задача'
        assert task.status.name == 'К выполнению'

    def test_task_to_dict(self, db_session):
        """Метод to_dict возвращает словарь."""
        status = TaskStatus.query.first()
        task = Task(title='Задача', status_id=status.id)
        db_session.add(task)
        db_session.commit()

        data = task.to_dict()
        assert isinstance(data, dict)
        assert data['title'] == 'Задача'
        assert 'status' in data
        assert 'tags' in data


class TestContactModel:
    """Тесты модели Contact."""

    def test_create_contact(self, db_session):
        """Создание контакта."""
        contact = Contact(last_name='Петров', first_name='Пётр')
        db_session.add(contact)
        db_session.commit()

        assert contact.id is not None
        assert contact.last_name == 'Петров'

    def test_contact_with_tags(self, db_session):
        """Контакт с тегами."""
        tag = Tag(name='VIP')
        contact = Contact(last_name='Сидоров')
        contact.tags.append(tag)
        db_session.add(contact)
        db_session.commit()

        assert len(contact.tags) == 1
        assert contact.tags[0].name == 'VIP'


class TestProjectModel:
    """Тесты модели Project."""

    def test_create_project(self, db_session):
        """Создание проекта."""
        project = Project(title='Новый проект', status='Active')
        db_session.add(project)
        db_session.commit()

        assert project.id is not None
        assert project.status == 'Active'

    def test_project_with_tasks(self, db_session):
        """Проект с задачами."""
        status = TaskStatus.query.first()
        project = Project(title='Проект')
        task = Task(title='Задача проекта', status_id=status.id, project=project)
        db_session.add_all([project, task])
        db_session.commit()

        assert len(project.tasks) == 1
        assert project.tasks[0].title == 'Задача проекта'

    def test_project_to_dict(self, db_session):
        """Метод to_dict считает задачи."""
        status = TaskStatus.query.first()
        project = Project(title='Проект')
        task = Task(title='Задача', status_id=status.id, project=project)
        db_session.add_all([project, task])
        db_session.commit()

        data = project.to_dict()
        assert data['tasks_count'] == 1


class TestTagModel:
    """Тесты модели Tag."""

    def test_create_tag(self, db_session):
        """Создание тега."""
        tag = Tag(name='important')
        db_session.add(tag)
        db_session.commit()

        assert tag.id is not None
        assert tag.name == 'important'

    def test_tag_unique_name(self, db_session):
        """Имя тега уникально."""
        tag1 = Tag(name='unique')
        db_session.add(tag1)
        db_session.commit()

        tag2 = Tag(name='unique')
        db_session.add(tag2)
        with pytest.raises(Exception):
            db_session.commit()
