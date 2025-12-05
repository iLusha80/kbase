from database import db
from models import Project, ProjectContact, Contact, Task

def get_all_projects():
    return Project.query.order_by(Project.created_at.desc()).all()

def get_project_by_id(project_id):
    return Project.query.get(project_id)

def create_project(data):
    if not data.get('title'):
        raise ValueError("Title required")
    
    new_p = Project(
        title=data.get('title'),
        description=data.get('description')
    )
    
    # Обработка команды (список объектов {contact_id, role})
    if 'team' in data and isinstance(data['team'], list):
        for member in data['team']:
            contact = Contact.query.get(member['contact_id'])
            if contact:
                assoc = ProjectContact(project=new_p, contact=contact, role=member.get('role', ''))
                db.session.add(assoc)

    db.session.add(new_p)
    db.session.commit()
    return new_p

def update_project(project_id, data):
    p = Project.query.get(project_id)
    if not p:
        return None
    
    p.title = data.get('title', p.title)
    p.description = data.get('description', p.description)
    if 'status' in data:
        p.status = data.get('status')

    # Обновление команды (полная перезапись связей для простоты)
    if 'team' in data and isinstance(data['team'], list):
        # Удаляем старые связи
        ProjectContact.query.filter_by(project_id=p.id).delete()
        
        # Создаем новые
        for member in data['team']:
            if not member.get('contact_id'): continue
            contact = Contact.query.get(member['contact_id'])
            if contact:
                assoc = ProjectContact(project=p, contact=contact, role=member.get('role', ''))
                db.session.add(assoc)

    db.session.commit()
    return p

def delete_project(project_id):
    p = Project.query.get(project_id)
    if not p:
        return False
    # Задачи не удаляем, а отвязываем (или удаляем cascade, если настроено, но лучше отвязать)
    for task in p.tasks:
        task.project_id = None
        
    db.session.delete(p)
    db.session.commit()
    return True
