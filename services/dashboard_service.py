from sqlalchemy import or_, func, desc
from datetime import date
from database import db
from models import Task, Project, Contact, TaskStatus, ContactType, FavoriteContact, QuickLink


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
    """
    favorites = db.session.query(FavoriteContact)\
        .join(Contact)\
        .order_by(FavoriteContact.created_at.desc())\
        .all()
    
    result = []
    for fav in favorites:
        c = fav.contact
        result.append({
            'contact_id': c.id,
            'last_name': c.last_name,
            'first_name': c.first_name,
            'role': c.role,
            'department': c.department,
            'type_color': c.contact_type.render_color if c.contact_type else '#cbd5e1'
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