import os
import sqlite3 # New import
from flask import Flask
from sqlalchemy import event # New import
from sqlalchemy.engine import Engine # New import
from database import db
# Импортируем новую модель FavoriteContact, чтобы db.create_all() её увидел
from models import ContactType, TaskStatus, FavoriteContact
from config import Config

from routes.main import main_bp
from routes.tasks import tasks_bp
from routes.contacts import contacts_bp
from routes.tags import tags_bp
from routes.projects import projects_bp
from routes.dashboard import dashboard_bp


app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)

# --- NEW: FIX FOR SQLITE CYRILLIC SEARCH ---
@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    # Проверяем, что это действительно SQLite
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        # 1. Включаем поддержку внешних ключей (полезно для целостности)
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        
        # 2. ВАЖНО: Переопределяем функцию lower SQL-движка на Python-функцию
        # Теперь SQLite будет использовать str.lower() из питона, который знает про 'А'->'а'
        dbapi_connection.create_function("lower", 1, lambda x: x.lower() if x else None)

# --- INITIALIZATION ---
def init_db():
    db.create_all()
    # Init Contact Types
    if not ContactType.query.first():
        defaults = [
            {'name': 'Руководство', 'color': '#ef4444'},
            {'name': 'Моя команда', 'color': '#10b981'},
            {'name': 'Контрагенты', 'color': '#3b82f6'},
            {'name': 'Другое', 'color': '#94a3b8'}
        ]
        for item in defaults:
            db.session.add(ContactType(name_type=item['name'], render_color=item['color']))
        db.session.commit()

    # Init Task Statuses
    if not TaskStatus.query.first():
        statuses = [
            {'name': 'К выполнению', 'color': '#64748b'},
            {'name': 'В работе', 'color': '#f59e0b'},
            {'name': 'Жду ответа', 'color': '#8b5cf6'},
            {'name': 'Готово', 'color': '#22c55e'}
        ]
        for item in statuses:
            db.session.add(TaskStatus(name=item['name'], color=item['color']))
        db.session.commit()

# Register Blueprints
app.register_blueprint(main_bp)
app.register_blueprint(tasks_bp, url_prefix='/api')
app.register_blueprint(contacts_bp, url_prefix='/api')
app.register_blueprint(tags_bp, url_prefix='/api')
app.register_blueprint(projects_bp, url_prefix='/api')
app.register_blueprint(dashboard_bp, url_prefix='/api')

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True)