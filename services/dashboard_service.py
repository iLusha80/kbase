from sqlalchemy import or_, func, desc
from datetime import date
from database import db
from models import Task, Project, Contact, TaskStatus, ContactType


def get_priority_tasks(limit=7):
    """
    5-7 приоритетных задач на сегодня.
    Критерии:
    1. Статус НЕ 'Готово'.
    2. Сортировка: Сначала просроченные и сегодняшние, потом остальные по дате создания.
    """
    # Ищем статус "Готово", чтобы исключить его
    done_status = TaskStatus.query.filter_by(name='Готово').first()
    done_id = done_status.id if done_status else 9999

    query = Task.query.filter(Task.status_id != done_id)
    
    # Сортировка: 
    # NULLs (без даты) в конец, иначе по возрастанию даты (сначала старые/сегодняшние)
    query = query.order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
    
    return query.limit(limit).all()

def get_waiting_tasks(limit=5):
    """
    5 задач со статусом "Жду ответа".
    Сортировка по due_date (ближайшие).
    """
    waiting_status = TaskStatus.query.filter_by(name='Жду ответа').first()
    if not waiting_status:
        return []

    return Task.query.filter_by(status_id=waiting_status.id)\
        .order_by(Task.due_date.asc().nullslast())\
        .limit(limit).all()

def get_top_active_projects(limit=3):
    """
    Топ-3 активных проектов.
    Критерий: Active статус + макс. кол-во задач в работе ('В работе', 'К выполнению').
    """
    # Статусы, которые считаем "активной работой"
    active_task_statuses = ['В работе', 'К выполнению']
    
    # Сложный запрос с агрегацией
    # SELECT project.*, count(task.id) FROM projects ... GROUP BY project.id ORDER BY count DESC
    
    projects = db.session.query(Project)\
        .join(Task)\
        .join(TaskStatus)\
        .filter(Project.status == 'Active')\
        .filter(TaskStatus.name.in_(active_task_statuses))\
        .group_by(Project.id)\
        .order_by(func.count(Task.id).desc())\
        .limit(limit)\
        .all()
    
    # Если проектов с активными задачами нет, просто вернем последние активные
    if not projects:
        return Project.query.filter_by(status='Active').order_by(Project.created_at.desc()).limit(limit).all()
        
    return projects

def global_search(query_str):
    """
    Поиск по Задачам, Проектам и Контактам.
    """
    if not query_str or len(query_str) < 2:
        return {}

    term = f"%{query_str}%"
    
    # 1. Задачи
    tasks = Task.query.filter(Task.title.ilike(term)).limit(5).all()
    
    # 2. Проекты
    projects = Project.query.filter(Project.title.ilike(term)).limit(5).all()
    
    # 3. Контакты (По фамилии или имени)
    contacts = Contact.query.filter(
        or_(Contact.last_name.ilike(term), Contact.first_name.ilike(term))
    ).limit(5).all()

    return {
        'tasks': [t.to_dict() for t in tasks],
        'projects': [p.to_dict() for p in projects],
        'contacts': [c.to_dict() for c in contacts]
    }
