import pytest
import sys
import os

# Добавляем корень проекта в PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app as flask_app, init_db
from core.database import db


@pytest.fixture
def app():
    """Создаёт тестовое приложение с in-memory БД."""
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['TESTING'] = True

    with flask_app.app_context():
        db.create_all()
        init_db()
        yield flask_app
        db.drop_all()


@pytest.fixture
def client(app):
    """Тестовый клиент Flask."""
    return app.test_client()


@pytest.fixture
def db_session(app):
    """Сессия БД для прямой работы с моделями."""
    with app.app_context():
        yield db.session
