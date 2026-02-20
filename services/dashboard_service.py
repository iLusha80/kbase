from sqlalchemy import or_, func, desc
from datetime import date, datetime, timedelta
from core.database import db
from core.models import (
    Task, Project, Contact, TaskStatus, ContactType,
    FavoriteContact, QuickLink, Tag, ViewLog, ActivityLog,
    Meeting, MeetingNote,
    task_tags, contact_tags
)


def get_priority_tasks(limit=7):
    # Ищем статус "Готово", чтобы исключить его
    done_status = TaskStatus.query.filter_by(name='Готово').first()
    done_id = done_status.id if done_status else 9999

    query = Task.query.filter(Task.status_id != done_id)
    query = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
    
    return query.limit(limit).all()

def get_waiting_tasks(limit=5):
    waiting_status = TaskStatus.query.filter_by(name='Жду ответа').first()
    if not waiting_status:
        return []

    return Task.query.filter_by(status_id=waiting_status.id)\
        .order_by(Task.due_date.asc().nullslast())\
        .limit(limit).all()

def get_top_active_projects(limit=3):
    active_task_statuses = ['В работе', 'К выполнению']
    
    projects = db.session.query(Project)\
        .join(Task)\
        .join(TaskStatus)\
        .filter(Project.status == 'Active')\
        .filter(TaskStatus.name.in_(active_task_statuses))\
        .group_by(Project.id)\
        .order_by(func.count(Task.id).desc())\
        .limit(limit)\
        .all()
    
    if not projects:
        return Project.query.filter_by(status='Active').order_by(Project.created_at.desc()).limit(limit).all()
        
    return projects

def get_favorite_contacts_list():
    """
    Получает список избранных контактов с подгрузкой данных самого контакта.
    Считает:
    1. active_task_count: Задачи НА человеке (Assignee)
    2. overdue_task_count: Просроченные задачи НА человеке
    3. authored_task_count: Задачи ОТ человека (Author)
    """
    favorites = db.session.query(FavoriteContact)\
        .join(Contact)\
        .order_by(FavoriteContact.created_at.desc())\
        .all()
    
    # Получаем ID статуса "Готово" для исключения
    done_status = TaskStatus.query.filter_by(name='Готово').first()
    done_id = done_status.id if done_status else -1
    today = date.today()

    result = []
    for fav in favorites:
        c = fav.contact
        
        # 1. Задачи, назначенные НА него (Active Assignments)
        active_assigned = [t for t in c.tasks_assigned if t.status_id != done_id]
        total_active = len(active_assigned)
        overdue_count = sum(1 for t in active_assigned if t.due_date and t.due_date < today)

        # 2. Задачи, поставленные ИМ (Active Authored / Requests)
        active_authored = [t for t in c.tasks_authored if t.status_id != done_id]
        authored_count = len(active_authored)

        result.append({
            'contact_id': c.id,
            'last_name': c.last_name,
            'first_name': c.first_name,
            'role': c.role,
            'department': c.department,
            'type_color': c.contact_type.render_color if c.contact_type else '#cbd5e1',
            'active_task_count': total_active,
            'overdue_task_count': overdue_count,
            'authored_task_count': authored_count # NEW
        })
    return result

def global_search(query_str: str):
    if not query_str or len(query_str) < 2:
        return {}

    # Поиск по тегам: если запрос начинается с #
    if query_str.startswith('#'):
        return search_by_tag(query_str[1:])  # Убираем # из запроса

    term = f"%{query_str}%"

    tasks = Task.query.filter(Task.title.ilike(term)).limit(5).all()
    projects = Project.query.filter(Project.title.ilike(term)).limit(5).all()
    contacts = Contact.query.filter(
        or_(Contact.last_name.ilike(term), Contact.first_name.ilike(term))
    ).limit(5).all()

    return {
        'tasks': [t.to_dict() for t in tasks],
        'projects': [p.to_dict() for p in projects],
        'contacts': [c.to_dict() for c in contacts]
    }


def search_by_tag(tag_query: str):
    """
    Поиск сущностей по тегам.
    Возвращает задачи, контакты и проекты (через связанные задачи) с указанными тегами.
    """
    if not tag_query:
        # Если ввели только #, показываем список всех тегов для автодополнения
        tags = Tag.query.order_by(Tag.name).limit(10).all()
        return {
            'tag_suggestions': [t.to_dict() for t in tags],
            'tasks': [],
            'projects': [],
            'contacts': []
        }

    term = f"%{tag_query}%"

    # Находим теги, соответствующие запросу
    matching_tags = Tag.query.filter(Tag.name.ilike(term)).all()

    if not matching_tags:
        return {
            'tag_suggestions': [],
            'tasks': [],
            'projects': [],
            'contacts': []
        }

    tag_ids = [t.id for t in matching_tags]

    # Задачи с этими тегами
    tasks = Task.query.filter(Task.tags.any(Tag.id.in_(tag_ids))).limit(10).all()

    # Контакты с этими тегами
    contacts = Contact.query.filter(Contact.tags.any(Tag.id.in_(tag_ids))).limit(10).all()

    # Проекты: находим через задачи с этими тегами
    project_ids = db.session.query(Task.project_id)\
        .filter(Task.tags.any(Tag.id.in_(tag_ids)))\
        .filter(Task.project_id.isnot(None))\
        .distinct()\
        .limit(10)\
        .all()
    project_ids = [p[0] for p in project_ids]
    projects = Project.query.filter(Project.id.in_(project_ids)).all() if project_ids else []

    return {
        'tag_suggestions': [t.to_dict() for t in matching_tags],
        'tasks': [t.to_dict() for t in tasks],
        'projects': [p.to_dict() for p in projects],
        'contacts': [c.to_dict() for c in contacts]
    }


def get_recent_viewed(limit=8):
    """
    Недавно просмотренные сущности (задачи, проекты, контакты).
    Возвращает уникальные сущности, отсортированные по последнему просмотру.
    """
    # Подзапрос: последний просмотр для каждой уникальной пары (entity_type, entity_id)
    subq = db.session.query(
        ViewLog.entity_type,
        ViewLog.entity_id,
        func.max(ViewLog.viewed_at).label('last_viewed')
    ).group_by(ViewLog.entity_type, ViewLog.entity_id)\
     .order_by(desc('last_viewed'))\
     .limit(limit)\
     .all()

    result = []
    for entity_type, entity_id, last_viewed in subq:
        item = _resolve_entity(entity_type, entity_id)
        if item:
            item['last_viewed'] = last_viewed.strftime('%d.%m %H:%M')
            result.append(item)

    return result


def _resolve_entity(entity_type, entity_id):
    """Получает краткую информацию о сущности по типу и ID."""
    if entity_type == 'task':
        t = Task.query.get(entity_id)
        if not t:
            return None
        return {
            'entity_type': 'task',
            'id': t.id,
            'title': t.title,
            'status_name': t.status.name if t.status else None,
            'status_color': t.status.color if t.status else '#94a3b8',
        }
    elif entity_type == 'project':
        p = Project.query.get(entity_id)
        if not p:
            return None
        return {
            'entity_type': 'project',
            'id': p.id,
            'title': p.title,
            'status_name': p.status,
        }
    elif entity_type == 'contact':
        c = Contact.query.get(entity_id)
        if not c:
            return None
        return {
            'entity_type': 'contact',
            'id': c.id,
            'title': f"{c.last_name} {c.first_name or ''}".strip(),
            'role': c.role,
            'type_color': c.contact_type.render_color if c.contact_type else '#cbd5e1',
        }
    return None


def get_frequent_tags(limit=10):
    """
    Часто используемые теги — по количеству привязок к задачам и контактам.
    """
    # Считаем привязки тегов к задачам
    task_tag_counts = db.session.query(
        task_tags.c.tag_id,
        func.count().label('cnt')
    ).group_by(task_tags.c.tag_id).subquery()

    # Считаем привязки тегов к контактам
    contact_tag_counts = db.session.query(
        contact_tags.c.tag_id,
        func.count().label('cnt')
    ).group_by(contact_tags.c.tag_id).subquery()

    # Суммируем
    tags = db.session.query(
        Tag,
        (func.coalesce(task_tag_counts.c.cnt, 0) + func.coalesce(contact_tag_counts.c.cnt, 0)).label('total_usage')
    ).outerjoin(task_tag_counts, Tag.id == task_tag_counts.c.tag_id)\
     .outerjoin(contact_tag_counts, Tag.id == contact_tag_counts.c.tag_id)\
     .having(
        (func.coalesce(task_tag_counts.c.cnt, 0) + func.coalesce(contact_tag_counts.c.cnt, 0)) > 0
     )\
     .group_by(Tag.id)\
     .order_by(desc('total_usage'))\
     .limit(limit)\
     .all()

    return [{'id': t.id, 'name': t.name, 'usage_count': usage} for t, usage in tags]


def get_recent_activity(limit=15):
    """
    Последние действия (история изменений) из ActivityLog.
    """
    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(limit).all()

    result = []
    for log in logs:
        item = {
            'id': log.id,
            'entity_type': log.entity_type,
            'entity_id': log.entity_id,
            'event_type': log.event_type,
            'field_name': log.field_name,
            'old_value': log.old_value,
            'new_value': log.new_value,
            'created_at': log.created_at.strftime('%d.%m %H:%M'),
        }
        # Подгружаем название сущности
        entity = _resolve_entity(log.entity_type, log.entity_id)
        item['entity_title'] = entity['title'] if entity else f'#{log.entity_id}'
        result.append(item)

    return result


def get_daily_standup_data():
    """
    Собирает данные для подготовки к дейлику:
    1. Задачи, закрытые за последние 24 часа (Что сделал)
    2. Задачи в работе + к выполнению с дедлайном сегодня (Что планирую)
    3. Блокеры: просроченные и «жду ответа» (Проблемы/блокеры)
    4. Встречи на сегодня
    """
    now = datetime.now()
    since = now - timedelta(hours=24)
    today = date.today()

    done_status = TaskStatus.query.filter_by(name='Готово').first()
    in_progress_status = TaskStatus.query.filter_by(name='В работе').first()
    todo_status = TaskStatus.query.filter_by(name='К выполнению').first()
    waiting_status = TaskStatus.query.filter_by(name='Жду ответа').first()

    # 1. Закрытые за 24ч (через ActivityLog — событие смены статуса на «Готово»)
    completed_tasks = []
    if done_status:
        done_logs = ActivityLog.query.filter(
            ActivityLog.entity_type == 'task',
            ActivityLog.event_type == 'update',
            ActivityLog.field_name == 'status',
            ActivityLog.new_value == 'Готово',
            ActivityLog.created_at >= since
        ).all()
        done_task_ids = [log.entity_id for log in done_logs]
        if done_task_ids:
            completed_tasks = Task.query.filter(Task.id.in_(done_task_ids)).all()

    # 2. В работе + к выполнению с дедлайном сегодня
    in_progress_tasks = []
    if in_progress_status:
        in_progress_tasks = Task.query.filter_by(status_id=in_progress_status.id).all()

    due_today_tasks = []
    if todo_status:
        due_today_tasks = Task.query.filter(
            Task.status_id == todo_status.id,
            Task.due_date == today
        ).all()

    # 3. Блокеры
    overdue_tasks = []
    if in_progress_status and todo_status:
        overdue_tasks = Task.query.filter(
            Task.status_id.in_([in_progress_status.id, todo_status.id]),
            Task.due_date < today
        ).all()

    waiting_tasks = []
    if waiting_status:
        waiting_tasks = Task.query.filter_by(status_id=waiting_status.id).all()

    # 4. Встречи на сегодня
    today_meetings = Meeting.query.filter(Meeting.date == today).order_by(Meeting.time).all()

    # --- Группировка по команде ---
    self_contact = Contact.query.filter_by(is_self=True).first()
    team_contacts = Contact.query.filter_by(is_team=True).order_by(Contact.last_name).all()

    all_active_tasks = completed_tasks + in_progress_tasks + due_today_tasks + overdue_tasks + waiting_tasks
    team_ids = {c.id for c in team_contacts}
    self_id = self_contact.id if self_contact else None

    def categorize_task(t):
        """Определяет категорию задачи: completed/in_progress/due_today/overdue/waiting"""
        if t in completed_tasks: return 'completed'
        if t in overdue_tasks: return 'overdue'
        if t in waiting_tasks: return 'waiting'
        if t in due_today_tasks: return 'due_today'
        if t in in_progress_tasks: return 'in_progress'
        return 'in_progress'

    def build_person_block(tasks_list):
        """Группирует список задач по категориям"""
        block = {'completed': [], 'in_progress': [], 'due_today': [], 'overdue': [], 'waiting': []}
        for t in tasks_list:
            cat = categorize_task(t)
            block[cat].append(t.to_dict())
        return block

    # Задачи self
    self_tasks = [t for t in all_active_tasks if t.assignee_id == self_id] if self_id else []

    # Задачи каждого члена команды
    team_data = []
    for member in team_contacts:
        if member.id == self_id:
            continue  # self уже отдельно
        member_tasks = [t for t in all_active_tasks if t.assignee_id == member.id]
        if member_tasks:
            team_data.append({
                'contact': member.to_dict(),
                'tasks': build_person_block(member_tasks),
            })

    # Прочие задачи (не self, не team)
    excluded_ids = team_ids | ({self_id} if self_id else set())
    other_tasks = [t for t in all_active_tasks if t.assignee_id not in excluded_ids]

    return {
        'completed': [t.to_dict() for t in completed_tasks],
        'in_progress': [t.to_dict() for t in in_progress_tasks],
        'due_today': [t.to_dict() for t in due_today_tasks],
        'overdue': [t.to_dict() for t in overdue_tasks],
        'waiting': [t.to_dict() for t in waiting_tasks],
        'today_meetings': [m.to_dict() for m in today_meetings],
        'generated_at': now.strftime('%d.%m.%Y %H:%M'),
        # Группировка по команде
        'self_contact': self_contact.to_dict() if self_contact else None,
        'self_tasks': build_person_block(self_tasks) if self_tasks else None,
        'team': team_data,
        'other_tasks': build_person_block(other_tasks) if other_tasks else None,
    }