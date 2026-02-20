"""
FTS5 полнотекстовый поиск для задач, контактов и проектов.
Использует SQLite FTS5 content-sync триггеры для автоматической синхронизации.
"""
from core.database import db


def init_fts_tables():
    """Создаёт FTS5 виртуальные таблицы и триггеры синхронизации, если не существуют."""
    conn = db.engine.raw_connection()
    cur = conn.cursor()

    # Проверяем целостность существующих FTS-таблиц, при повреждении — удаляем
    for table in ['tasks_fts', 'contacts_fts', 'projects_fts']:
        try:
            cur.execute(f"SELECT count(*) FROM {table} LIMIT 1")
        except Exception:
            # Таблица повреждена или не существует — дропаем для пересоздания
            cur.execute(f"DROP TABLE IF EXISTS {table}")
            conn.commit()

    # --- tasks_fts ---
    cur.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS tasks_fts USING fts5(
            title, description,
            content='tasks', content_rowid='id',
            tokenize='unicode61'
        )
    """)

    # --- contacts_fts ---
    cur.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
            last_name, first_name, middle_name, department, role, notes,
            content='contacts', content_rowid='id',
            tokenize='unicode61'
        )
    """)

    # --- projects_fts ---
    cur.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
            title, description,
            content='projects', content_rowid='id',
            tokenize='unicode61'
        )
    """)

    # --- Триггеры синхронизации: tasks ---
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS tasks_ai AFTER INSERT ON tasks BEGIN
            INSERT INTO tasks_fts(rowid, title, description)
            VALUES (new.id, new.title, new.description);
        END
    """)
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS tasks_ad AFTER DELETE ON tasks BEGIN
            INSERT INTO tasks_fts(tasks_fts, rowid, title, description)
            VALUES ('delete', old.id, old.title, old.description);
        END
    """)
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS tasks_au AFTER UPDATE ON tasks BEGIN
            INSERT INTO tasks_fts(tasks_fts, rowid, title, description)
            VALUES ('delete', old.id, old.title, old.description);
            INSERT INTO tasks_fts(rowid, title, description)
            VALUES (new.id, new.title, new.description);
        END
    """)

    # --- Триггеры синхронизации: contacts ---
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS contacts_ai AFTER INSERT ON contacts BEGIN
            INSERT INTO contacts_fts(rowid, last_name, first_name, middle_name, department, role, notes)
            VALUES (new.id, new.last_name, new.first_name, new.middle_name, new.department, new.role, new.notes);
        END
    """)
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS contacts_ad AFTER DELETE ON contacts BEGIN
            INSERT INTO contacts_fts(contacts_fts, rowid, last_name, first_name, middle_name, department, role, notes)
            VALUES ('delete', old.id, old.last_name, old.first_name, old.middle_name, old.department, old.role, old.notes);
        END
    """)
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS contacts_au AFTER UPDATE ON contacts BEGIN
            INSERT INTO contacts_fts(contacts_fts, rowid, last_name, first_name, middle_name, department, role, notes)
            VALUES ('delete', old.id, old.last_name, old.first_name, old.middle_name, old.department, old.role, old.notes);
            INSERT INTO contacts_fts(rowid, last_name, first_name, middle_name, department, role, notes)
            VALUES (new.id, new.last_name, new.first_name, new.middle_name, new.department, new.role, new.notes);
        END
    """)

    # --- Триггеры синхронизации: projects ---
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS projects_ai AFTER INSERT ON projects BEGIN
            INSERT INTO projects_fts(rowid, title, description)
            VALUES (new.id, new.title, new.description);
        END
    """)
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS projects_ad AFTER DELETE ON projects BEGIN
            INSERT INTO projects_fts(projects_fts, rowid, title, description)
            VALUES ('delete', old.id, old.title, old.description);
        END
    """)
    cur.execute("""
        CREATE TRIGGER IF NOT EXISTS projects_au AFTER UPDATE ON projects BEGIN
            INSERT INTO projects_fts(projects_fts, rowid, title, description)
            VALUES ('delete', old.id, old.title, old.description);
            INSERT INTO projects_fts(rowid, title, description)
            VALUES (new.id, new.title, new.description);
        END
    """)

    conn.commit()
    conn.close()


def rebuild_fts_index():
    """Полная перестройка FTS-индексов из основных таблиц."""
    conn = db.engine.raw_connection()
    cur = conn.cursor()

    fts_tables = ['tasks_fts', 'contacts_fts', 'projects_fts']

    for table in fts_tables:
        try:
            # FTS5 встроенная команда 'rebuild' — безопасно пересоздаёт индекс из content-таблицы
            cur.execute(f"INSERT INTO {table}({table}) VALUES ('rebuild')")
        except Exception:
            # Если таблица повреждена — дропаем и пересоздаём
            cur.execute(f"DROP TABLE IF EXISTS {table}")
            conn.commit()
            conn.close()
            # Пересоздаём таблицы и триггеры, потом повторяем rebuild
            init_fts_tables()
            return rebuild_fts_index()

    conn.commit()
    conn.close()


def _prepare_fts_query(query_str):
    """Подготавливает запрос для FTS5: разбивает на токены и добавляет prefix-поиск."""
    tokens = query_str.strip().split()
    if not tokens:
        return None
    # Каждый токен ищем как prefix: "term*", объединяем через AND
    fts_terms = ' '.join(f'"{t}"*' for t in tokens if t)
    return fts_terms


def fts_search(query_str, limit=10):
    """
    Полнотекстовый поиск через FTS5 с ранжированием по rank().
    Возвращает dict с ключами tasks, contacts, projects.
    """
    from core.models import Task, Contact, Project

    fts_query = _prepare_fts_query(query_str)
    if not fts_query:
        return {'tasks': [], 'contacts': [], 'projects': []}

    # Поиск задач
    task_rows = db.session.execute(
        db.text("""
            SELECT rowid, rank FROM tasks_fts
            WHERE tasks_fts MATCH :q
            ORDER BY rank
            LIMIT :lim
        """),
        {'q': fts_query, 'lim': limit}
    ).fetchall()
    task_ids = [row[0] for row in task_rows]
    tasks = Task.query.filter(Task.id.in_(task_ids)).all() if task_ids else []
    # Сохраняем порядок ранжирования
    task_order = {tid: i for i, tid in enumerate(task_ids)}
    tasks.sort(key=lambda t: task_order.get(t.id, 999))

    # Поиск контактов
    contact_rows = db.session.execute(
        db.text("""
            SELECT rowid, rank FROM contacts_fts
            WHERE contacts_fts MATCH :q
            ORDER BY rank
            LIMIT :lim
        """),
        {'q': fts_query, 'lim': limit}
    ).fetchall()
    contact_ids = [row[0] for row in contact_rows]
    contacts = Contact.query.filter(Contact.id.in_(contact_ids)).all() if contact_ids else []
    contact_order = {cid: i for i, cid in enumerate(contact_ids)}
    contacts.sort(key=lambda c: contact_order.get(c.id, 999))

    # Поиск проектов
    project_rows = db.session.execute(
        db.text("""
            SELECT rowid, rank FROM projects_fts
            WHERE projects_fts MATCH :q
            ORDER BY rank
            LIMIT :lim
        """),
        {'q': fts_query, 'lim': limit}
    ).fetchall()
    project_ids = [row[0] for row in project_rows]
    projects = Project.query.filter(Project.id.in_(project_ids)).all() if project_ids else []
    project_order = {pid: i for i, pid in enumerate(project_ids)}
    projects.sort(key=lambda p: project_order.get(p.id, 999))

    return {
        'tasks': [t.to_dict() for t in tasks],
        'contacts': [c.to_dict() for c in contacts],
        'projects': [p.to_dict() for p in projects]
    }
