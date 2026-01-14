from sqlalchemy import or_, func, desc
from datetime import date
from core.database import db
from core.models import Task, Project, Contact, TaskStatus, ContactType, FavoriteContact, QuickLink


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