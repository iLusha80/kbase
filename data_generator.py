import argparse
import sys
import os
import shutil
import sqlite3
import random
from datetime import datetime, timedelta, timezone

# Импортируем типы для проверки колонок
from sqlalchemy.sql import sqltypes

from app import app, db
# Импортируем сами классы моделей и объекты таблиц
from models import (
    ContactType, TaskStatus, Tag, Contact, Project, ProjectContact, 
    Task, QuickLink, contact_tags, task_tags
)

# --- CONFIGURATION ---
DB_FILENAME = 'instance/kbase.db'

def get_db_path():
    """Возвращает путь к файлу БД (SQLite)"""
    return DB_FILENAME

# --- ACTIONS ---

def clean_db():
    """Удаляет все таблицы и создает их заново (чистая схема)"""
    print("🧹 Очистка базы данных (DROP ALL)...")
    db.drop_all()
    print("🏗  Создание новой схемы (CREATE ALL)...")
    db.create_all()

def populate_test_data():
    """Генерация тестовых данных"""
    print("🎲 Генерация тестовых данных...")
    
    # --- 1. СПРАВОЧНИКИ ---
    ct_mgmt = ContactType(name_type='Руководство', render_color='#ef4444')
    ct_team = ContactType(name_type='Моя команда', render_color='#10b981')
    ct_client = ContactType(name_type='Контрагенты', render_color='#3b82f6')
    ct_other = ContactType(name_type='Другое', render_color='#94a3b8')
    db.session.add_all([ct_mgmt, ct_team, ct_client, ct_other])

    st_todo = TaskStatus(name='К выполнению', color='#64748b')
    st_prog = TaskStatus(name='В работе', color='#f59e0b')
    st_wait = TaskStatus(name='Жду ответа', color='#8b5cf6')
    st_done = TaskStatus(name='Готово', color='#22c55e')
    db.session.add_all([st_todo, st_prog, st_wait, st_done])
    
    db.session.commit()

    # --- 2. ТЕГИ ---
    tags_list = ['frontend', 'backend', 'design', 'bug', 'urgent', 'marketing', 'docs', 'meeting']
    tags_objs = [Tag(name=t) for t in tags_list]
    db.session.add_all(tags_objs)
    db.session.commit()

    # --- 3. КОНТАКТЫ ---
    contacts_data = [
        ('Иванов', 'Иван', 'Иванович', 'Генеральный директор', 'Администрация', ct_mgmt),
        ('Смирнова', 'Анна', 'Сергеевна', 'Project Manager', 'IT Отдел', ct_team),
        ('Петров', 'Петр', 'Петрович', 'Backend Lead', 'IT Отдел', ct_team),
        ('Сидоров', 'Алексей', None, 'Frontend Dev', 'IT Отдел', ct_team),
        ('Козлова', 'Мария', 'Вячеславовна', 'Дизайнер', 'Дизайн Бюро', ct_client),
        ('Кузнецов', 'Дмитрий', 'Олегович', 'Заказчик', 'ООО "Ромашка"', ct_client),
        ('Волков', 'Сергей', 'Андреевич', 'Системный администратор', 'IT Отдел', ct_other),
    ]

    contacts = []
    for i, (last, first, middle, role, dept, c_type) in enumerate(contacts_data):
        c = Contact(
            last_name=last,
            first_name=first,
            middle_name=middle,
            role=role,
            department=dept,
            type_id=c_type.id,
            email=f"user{i+1}@example.com",
            phone=f"+7 (999) 000-00-0{i+1}",
            notes=f"Автоматически сгенерированный контакт #{i+1}"
        )
        c.tags = random.sample(tags_objs, k=random.randint(0, 2))
        contacts.append(c)
        db.session.add(c)
    
    db.session.commit()

    # --- 4. ПРОЕКТЫ ---
    projects_data = [
        ('Редизайн корпоративного портала', 'Полное обновление UI/UX внутреннего портала компании.', 'Active', 'https://figma.com/design/123'),
        ('Мобильное приложение "KBase"', 'Разработка нативного приложения под iOS и Android.', 'Active', 'https://github.com/repo/kbase-mobile'),
        ('Маркетинговая кампания Q3', 'Подготовка рекламных материалов для осеннего сезона.', 'Planning', None)
    ]

    projects = []
    for title, desc, status, link in projects_data:
        p = Project(title=title, description=desc, status=status, link=link)
        projects.append(p)
        db.session.add(p)
    
    db.session.commit()

    # Связи проектов
    db.session.add(ProjectContact(project=projects[0], contact=contacts[1], role='PM'))
    db.session.add(ProjectContact(project=projects[0], contact=contacts[2], role='Backend'))
    db.session.add(ProjectContact(project=projects[0], contact=contacts[4], role='UI/UX'))
    db.session.add(ProjectContact(project=projects[1], contact=contacts[0], role='Куратор'))
    db.session.add(ProjectContact(project=projects[1], contact=contacts[3], role='React Native Dev'))
    db.session.add(ProjectContact(project=projects[2], contact=contacts[5], role='Заказчик'))
    db.session.add(ProjectContact(project=projects[2], contact=contacts[1], role='Account Manager'))
    
    db.session.commit()

    # --- 5. ЗАДАЧИ ---
    task_titles = [
        "Собрать требования по проекту", "Нарисовать макет главной страницы", 
        "Настроить CI/CD pipeline", "Провести встречу с заказчиком", 
        "Исправить баг в авторизации", "Подготовить отчет за месяц",
        "Обновить документацию API", "Заказать лицензии на софт",
        "Интервью с новым кандидатом", "Рефакторинг модуля оплаты",
        "Согласовать бюджет", "Написать тесты для фронтенда",
        "Выложить релиз в прод", "Бэкап базы данных", "Купить кофе в офис"
    ]
    statuses = [st_todo, st_prog, st_wait, st_done]

    for i in range(15):
        delta = random.randint(-5, 14)
        due = datetime.now(timezone.utc).date() + timedelta(days=delta)
        author = random.choice(contacts)
        assignee = random.choice(contacts)
        proj = random.choice(projects) if random.random() > 0.3 else None
        
        t = Task(
            title=task_titles[i],
            description=f"Описание задачи '{task_titles[i]}'. Нужно сделать качественно.",
            due_date=due,
            status_id=random.choice(statuses).id,
            author_id=author.id,
            assignee_id=assignee.id,
            project_id=proj.id if proj else None
        )
        t.tags = random.sample(tags_objs, k=random.randint(1, 3))
        db.session.add(t)

    # --- 6. БЫСТРЫЕ ССЫЛКИ (Quick Links) ---
    links_data = [
        ('Корпоративный Jira', 'https://jira.corp.example.com', 'trello'),
        ('GitLab Репозиторий', 'https://git.corp.example.com', 'git-branch'),
        ('Почта Outlook', 'https://outlook.office.com', 'mail'),
        ('База знаний Confluence', 'https://confluence.corp.example.com', 'book')
    ]
    
    for title, url, icon in links_data:
        ql = QuickLink(title=title, url=url, icon=icon)
        db.session.add(ql)

    db.session.commit()
    print("✅ Тестовые данные (включая ссылки) успешно загружены.")

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

    # 2. Подключение к СТАРОЙ базе (через чистый SQLite, чтобы читать сырые данные)
    try:
        old_conn = sqlite3.connect(backup_path)
        old_conn.row_factory = sqlite3.Row # Позволяет обращаться по именам колонок
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
        ('task_tags', task_tags)
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

        # Определение типа объекта и доступных колонок
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
                    
                    # --- ИСПРАВЛЕНИЕ: КОНВЕРТАЦИЯ ДАТ ---
                    # Получаем тип колонки в модели SQLAlchemy
                    col_type = target_columns[col_name].type
                    
                    # Если значение - строка, но колонка ожидает дату/время
                    if val is not None and isinstance(val, str):
                        # Проверка для DateTime (например, created_at)
                        if isinstance(col_type, (db.DateTime, sqltypes.DateTime)):
                            try:
                                # SQLite обычно хранит как ISO строку, пробуем распарсить
                                val = datetime.fromisoformat(val)
                            except ValueError:
                                # Fallback на всякий случай
                                try: val = datetime.strptime(val, "%Y-%m-%d %H:%M:%S")
                                except: pass
                        
                        # Проверка для Date (например, due_date)
                        elif isinstance(col_type, (db.Date, sqltypes.Date)):
                            try:
                                # Обычно YYYY-MM-DD
                                val = datetime.strptime(val, "%Y-%m-%d").date()
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

# --- MAIN ---

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Утилита управления базой данных KBase.")
    group = parser.add_mutually_exclusive_group(required=True)
    
    group.add_argument('--full-reload', action='store_true', 
                       help='Полностью удалить БД и создать пустую структуру.')
    
    group.add_argument('--gen-test-data', action='store_true', 
                       help='Пересоздать БД и заполнить тестовыми данными.')
    
    group.add_argument('--migrate-data', action='store_true', 
                       help='Сделать бэкап, обновить структуру и перенести данные из старой БД.')

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