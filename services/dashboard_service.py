from sqlalchemy import or_, func, desc
from datetime import date
from core.database import db
from core.models import (
    Task, Project, Contact, TaskStatus, ContactType,
    FavoriteContact, QuickLink, Tag, ViewLog, ActivityLog,
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