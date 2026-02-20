import os
import sqlite3 
from flask import Flask, request
from sqlalchemy import event 
from sqlalchemy.engine import Engine 
from core.database import db
from core.models import ContactType, TaskStatus, FavoriteContact, MeetingType, MeetingNote
from core.config import Config

from routes.main import main_bp
from routes.tasks import tasks_bp
from routes.contacts import contacts_bp
from routes.tags import tags_bp
from routes.projects import projects_bp
from routes.dashboard import dashboard_bp
from routes.reports import reports_bp
from routes.meetings import meetings_bp


app = Flask(__name__)
app.config.from_object(Config)

db.init_app(app)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

        dbapi_connection.create_function("lower", 1, lambda x: x.lower() if x else None)


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

    # Init Meeting Types
    if not MeetingType.query.first():
        meeting_types = [
            {'name': '1-1', 'color': '#8b5cf6',
             'agenda': '1. Прогресс по задачам\n2. Блокеры и риски\n3. Вопросы к руководителю\n4. Планы на следующую неделю'},
            {'name': 'Дейлик', 'color': '#f59e0b',
             'agenda': '1. Что сделал вчера\n2. Что планирую сегодня\n3. Блокеры'},
            {'name': 'Еженедельник', 'color': '#10b981',
             'agenda': '1. Итоги недели\n2. Ключевые метрики\n3. Планы на следующую неделю\n4. Ресурсы'},
            {'name': 'Другое', 'color': '#64748b', 'agenda': ''}
        ]
        for item in meeting_types:
            db.session.add(MeetingType(
                name=item['name'], color=item['color'],
                default_agenda=item['agenda']
            ))
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
app.register_blueprint(reports_bp, url_prefix='/api')
app.register_blueprint(meetings_bp, url_prefix='/api')

@app.errorhandler(404)
def page_not_found(e):
    print(f"DEBUG: 404 error for path: {request.path}")
    return e

if __name__ == '__main__':
    with app.app_context():
        init_db()

    # Автобэкап БД при запуске
    from services.backup_service import auto_backup
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'kbase.db')
    auto_backup(db_path)

    app.run(debug=True)
