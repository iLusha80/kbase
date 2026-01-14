import argparse
import sys
import os
import shutil
import sqlite3
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.sql import sqltypes

from app import app
from core.database import db
from core.models import (
    ContactType, TaskStatus, Tag, Contact, Project, ProjectContact,
    Task, QuickLink, contact_tags, task_tags, TaskComment, ActivityLog,
    FavoriteContact
)

# --- CONFIGURATION ---
DB_FILENAME = 'instance/kbase.db'

def get_db_path():
    return DB_FILENAME

# --- ACTIONS ---

def clean_db():
    print("🧹 Очистка базы данных (DROP ALL)...")
    db.drop_all()
    print("🏗  Создание новой схемы (CREATE ALL)...")
    db.create_all()

def populate_test_data():
    print("🎲 Генерация данных для разработки проекта KBase...")
    
    # --- 1. СПРАВОЧНИКИ (ТИПЫ И СТАТУСЫ) ---
    ct_human = ContactType(name_type='Human', render_color='#ef4444')     # Красный
    ct_ai_smart = ContactType(name_type='AI Model (Smart)', render_color='#8b5cf6') # Фиолетовый
    ct_ai_fast = ContactType(name_type='AI Model (Fast)', render_color='#f59e0b')  # Оранжевый
    db.session.add_all([ct_human, ct_ai_smart, ct_ai_fast])

    st_todo = TaskStatus(name='К выполнению', color='#64748b') # Slate
    st_prog = TaskStatus(name='В работе', color='#3b82f6')     # Blue
    st_wait = TaskStatus(name='Жду ответа', color='#8b5cf6')   # Purple
    st_review = TaskStatus(name='Code Review', color='#eab308')# Yellow (New!)
    st_done = TaskStatus(name='Готово', color='#22c55e')       # Green
    db.session.add_all([st_todo, st_prog, st_wait, st_review, st_done])
    
    db.session.commit()

    # --- 2. ТЕГИ ---
    tags_list = [
        'refactoring', 'bug', 'feature', 'frontend', 'backend', 
        'database', 'devops', 'urgent', 'idea', 'ui/ux'
    ]
    tags_map = {name: Tag(name=name) for name in tags_list}
    db.session.add_all(tags_map.values())
    db.session.commit()

    # --- 3. КОНТАКТЫ (НАША КОМАНДА) ---
    # Человекус
    c_human = Contact(
        last_name='Человекус', first_name='Разработчик', middle_name='',
        role='Project Lead', department='Reality', type_id=ct_human.id,
        email="me@kbase.dev", phone="N/A",
        notes="Инициатор проекта. Пишет промпты, проверяет код."
    )
    # Gemini Pro 3
    c_pro = Contact(
        last_name='Gemini', first_name='Pro', middle_name='1.5',
        role='Senior Architect', department='Google DeepMind', type_id=ct_ai_smart.id,
        email="gemini.pro@api.google", link="https://aistudio.google.com/",
        notes="Использовать для сложной логики, архитектуры БД и рефакторинга."
    )
    # Gemini Flash 3
    c_flash = Contact(
        last_name='Gemini', first_name='Flash', middle_name='8b',
        role='Junior Developer', department='Google DeepMind', type_id=ct_ai_fast.id,
        email="gemini.flash@api.google", link="https://aistudio.google.com/",
        notes="Быстрый кодинг, генерация HTML/CSS, рутинные задачи."
    )
    
    c_human.tags = [tags_map['devops'], tags_map['backend']]
    c_pro.tags = [tags_map['backend'], tags_map['database'], tags_map['refactoring']]
    c_flash.tags = [tags_map['frontend'], tags_map['ui/ux']]

    contacts = [c_human, c_pro, c_flash]
    db.session.add_all(contacts)
    db.session.commit()

    # --- 4. ПРОЕКТЫ (ПОДМОДУЛИ) ---
    p_core = Project(
        title='KBase Core (Backend)', 
        description='Основная логика на Flask + SQLAlchemy. API endpoints, работа с БД, сервисный слой.', 
        status='Active', link='https://github.com/flask'
    )
    p_ui = Project(
        title='KBase UI (Frontend)', 
        description='Vanilla JS SPA. Компоненты, роутинг, Tailwind CSS. Без npm сборки.', 
        status='Active', link='https://tailwindcss.com'
    )
    p_infra = Project(
        title='DevOps & Tooling', 
        description='Скрипты сборки, деплой, Docker, генераторы данных, оффлайн режим.', 
        status='Planning'
    )
    p_kb = Project(
        title='Module: Knowledge Base', 
        description='Разработка раздела /kb. Вики-движок, markdown рендеринг, связи статей.', 
        status='On Hold'
    )

    projects = [p_core, p_ui, p_infra, p_kb]
    db.session.add_all(projects)
    db.session.commit()

    # Связи команды с проектами
    # Core: Pro (Arch), Human (Lead)
    db.session.add(ProjectContact(project=p_core, contact=c_pro, role='Architect'))
    db.session.add(ProjectContact(project=p_core, contact=c_human, role='Maintainer'))
    
    # UI: Flash (Dev), Human (Reviewer)
    db.session.add(ProjectContact(project=p_ui, contact=c_flash, role='Main Dev'))
    db.session.add(ProjectContact(project=p_ui, contact=c_human, role='Designer'))
    
    # Infra: Human (Devops)
    db.session.add(ProjectContact(project=p_infra, contact=c_human, role='DevOps'))

    db.session.commit()

    # --- 5. ЗАДАЧИ (РЕАЛЬНЫЕ ПРОБЛЕМЫ ПРОЕКТА) ---
    
    tasks_data = [
        # --- Backend Tasks ---
        {
            'title': 'Добавить поддержку миграций (Alembic)',
            'desc': 'Сейчас используется db.create_all(), что плохо для продакшена. Нужно внедрить Flask-Migrate.',
            'proj': p_core, 'status': st_todo, 'author': c_human, 'assignee': c_pro,
            'tags': ['database', 'backend'], 'due_delta': 5
        },
        {
            'title': 'Рефакторинг routes/*.py',
            'desc': 'Файлы роутов слишком разрослись. Нужно вынести валидацию в Pydantic или Marshmallow схемы.',
            'proj': p_core, 'status': st_wait, 'author': c_human, 'assignee': c_pro,
            'tags': ['refactoring'], 'due_delta': 2
        },
        {
            'title': 'Логирование ошибок',
            'desc': 'Заменить print() на нормальный logging config с ротацией файлов.',
            'proj': p_core, 'status': st_todo, 'author': c_flash, 'assignee': c_human,
            'tags': ['backend'], 'due_delta': 10
        },

        # --- Frontend Tasks ---
        {
            'title': 'Убрать мерцание при загрузке',
            'desc': 'При переходе по вкладкам виден FOUC или пустые блоки. Нужно внедрить скелетоны или оптимистичный UI.',
            'proj': p_ui, 'status': st_prog, 'author': c_human, 'assignee': c_flash,
            'tags': ['frontend', 'ui/ux'], 'due_delta': 1
        },
        {
            'title': 'Рефакторинг TaskList.js',
            'desc': 'Файл стал слишком большим. Логику фильтрации нужно вынести в отдельный helper-класс.',
            'proj': p_ui, 'status': st_review, 'author': c_pro, 'assignee': c_flash,
            'tags': ['refactoring', 'frontend'], 'due_delta': -1
        },
        {
            'title': 'Мобильная адаптация таблиц',
            'desc': 'Таблица задач плохо выглядит на телефоне. Сделать горизонтальный скролл или карточный вид.',
            'proj': p_ui, 'status': st_todo, 'author': c_human, 'assignee': c_flash,
            'tags': ['ui/ux', 'frontend'], 'due_delta': 7
        },

        # --- Infra Tasks ---
        {
            'title': 'Написать Dockerfile',
            'desc': 'Проект должен запускаться одной командой docker-compose up.',
            'proj': p_infra, 'status': st_todo, 'author': c_pro, 'assignee': c_human,
            'tags': ['devops'], 'due_delta': 3
        },
        {
            'title': 'Скрипт бэкапа базы',
            'desc': 'Написать cron-скрипт для бэкапа instance/kbase.db в облако или отдельную папку.',
            'proj': p_infra, 'status': st_done, 'author': c_human, 'assignee': c_human,
            'tags': ['devops', 'database'], 'due_delta': -5
        },

        # --- KB Module ---
        {
            'title': 'Продумать структуру БД для статей',
            'desc': 'Нужна модель Article с поддержкой Markdown, категорий и полнотекстового поиска.',
            'proj': p_kb, 'status': st_wait, 'author': c_human, 'assignee': c_pro,
            'tags': ['database', 'idea'], 'due_delta': 14
        }
    ]

    for item in tasks_data:
        t = Task(
            title=item['title'],
            description=item['desc'],
            project_id=item['proj'].id if item['proj'] else None,
            status_id=item['status'].id,
            author_id=item['author'].id,
            assignee_id=item['assignee'].id,
            due_date=datetime.now(timezone.utc).date() + timedelta(days=item['due_delta'])
        )
        for tag_name in item['tags']:
            if tag_name in tags_map:
                t.tags.append(tags_map[tag_name])
        
        db.session.add(t)
    
    db.session.commit()

    # --- 6. ДОБАВЛЕНИЕ КОММЕНТАРИЕВ (Имитация жизни) ---
    # Найдем задачу про мерцание
    t_flicker = Task.query.filter(Task.title.like('%мерцание%')).first()
    if t_flicker:
        db.session.add(TaskComment(task_id=t_flicker.id, text="Пробовал скрыть через opacity, но всё равно видно подгрузку данных.", created_at=datetime.now() - timedelta(hours=5)))
        db.session.add(TaskComment(task_id=t_flicker.id, text="Попробуй показывать спиннер пока `await API.getTasks()` не выполнится.", created_at=datetime.now() - timedelta(hours=2)))

    # --- 7. БЫСТРЫЕ ССЫЛКИ ---
    links_data = [
        ('Google AI Studio', 'https://aistudio.google.com/', 'cpu'),
        ('Lucide Icons', 'https://lucide.dev/icons', 'image'),
        ('Tailwind Cheatsheet', 'https://nerdcave.com/tailwind-cheat-sheet', 'code'),
        ('Local Host', 'http://127.0.0.1:5000', 'home'),
        ('Gemini API Console', 'https://aistudio.google.com/', 'cpu')
    ]
    
    for title, url, icon in links_data:
        db.session.add(QuickLink(title=title, url=url, icon=icon))

    # --- 8. ИЗБРАННОЕ ---
    db.session.add(FavoriteContact(contact_id=c_pro.id))
    db.session.add(FavoriteContact(contact_id=c_flash.id))

    db.session.commit()
    print("✅ Данные для пет-проекта успешно сгенерированы!")
    print(f"   👤 Создано контактов: {len(contacts)}")
    print(f"   📂 Создано проектов: {len(projects)}")
    print(f"   📋 Создано задач: {len(tasks_data)}")

def migrate_data():
    """
    1. Бэкап старой БД.
    2. Пересоздание БД.
    3. Построчный перенос данных с проверкой колонок и конвертацией типов.
    """
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        print(f"❌ Файл базы данных {db_path} не найден. Нечего мигрировать.")
        return

    # 1. Backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{db_path}.backup_{timestamp}"
    print(f"📦 Создание резервной копии: {backup_path}")
    shutil.copy2(db_path, backup_path)

    # 2. Подключение к СТАРОЙ базе
    try:
        old_conn = sqlite3.connect(backup_path)
        old_conn.row_factory = sqlite3.Row
        old_cursor = old_conn.cursor()
    except Exception as e:
        print(f"❌ Ошибка чтения бэкапа: {e}")
        return

    # 3. Пересоздание НОВОЙ базы
    print("♻️  Пересоздание схемы БД (DROP/CREATE)...")
    db.drop_all()
    db.create_all()

    # 4. Определение порядка миграции
    migration_order = [
        ('contact_types', ContactType),
        ('task_statuses', TaskStatus),
        ('tags', Tag),
        ('quick_links', QuickLink),
        ('contacts', Contact),
        ('projects', Project),
        ('project_contacts', ProjectContact),
        ('tasks', Task),
        ('contact_tags', contact_tags),
        ('task_tags', task_tags),
        ('task_comments', TaskComment),
        ('activity_logs', ActivityLog),
        ('favorite_contacts', FavoriteContact)
    ]

    print("🚀 Начало переноса данных...")
    
    for table_name, model_or_table in migration_order:
        print(f"   ↪ Обработка таблицы '{table_name}'...", end=" ")
        
        try:
            old_rows = old_cursor.execute(f"SELECT * FROM {table_name}").fetchall()
        except sqlite3.OperationalError:
            print("⚠️  Таблица не найдена в старой базе (пропуск).")
            continue

        if not old_rows:
            print("Пусто.")
            continue

        if hasattr(model_or_table, '__table__'):
            target_columns = model_or_table.__table__.columns
            is_model = True
        else:
            target_columns = model_or_table.columns
            is_model = False

        count = 0
        for row in old_rows:
            data_to_insert = {}
            row_dict = dict(row)

            for col_name in target_columns.keys():
                if col_name in row_dict:
                    val = row_dict[col_name]
                    
                    # --- КОНВЕРТАЦИЯ ДАТ ---
                    col_type = target_columns[col_name].type
                    if val is not None and isinstance(val, str):
                        if isinstance(col_type, (db.DateTime, sqltypes.DateTime)):
                            try: val = datetime.fromisoformat(val)
                            except ValueError:
                                try: val = datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
                                except: pass
                        elif isinstance(col_type, (db.Date, sqltypes.Date)):
                            try: val = datetime.strptime(val, "%Y-%m-%d").date()
                            except ValueError:
                                try: val = datetime.fromisoformat(val).date()
                                except: pass

                    data_to_insert[col_name] = val
            
            try:
                if is_model:
                    obj = model_or_table(**data_to_insert)
                    db.session.add(obj)
                else:
                    stmt = model_or_table.insert().values(**data_to_insert)
                    db.session.execute(stmt)
                count += 1
            except Exception as e:
                print(f"\n❌ Ошибка вставки строки id={row_dict.get('id', '?')}: {e}")

        db.session.commit()
        print(f"Перенесено {count} записей.")

    old_conn.close()
    print(f"✅ Миграция завершена успешно! Старая база сохранена как {backup_path}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Утилита управления базой данных KBase.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--full-reload', action='store_true', help='Полностью удалить БД и создать пустую структуру.')
    group.add_argument('--gen-test-data', action='store_true', help='Пересоздать БД и заполнить тестовыми данными.')
    group.add_argument('--migrate-data', action='store_true', help='Сделать бэкап, обновить структуру и перенести данные.')
    args = parser.parse_args()

    with app.app_context():
        if args.full_reload:
            clean_db()
            print("🆗 База данных пуста и готова к работе.")
        elif args.gen_test_data:
            clean_db()
            populate_test_data()
        elif args.migrate_data:
            migrate_data()