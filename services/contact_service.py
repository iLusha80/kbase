from core.database import db
from core.models import Contact, ContactType, FavoriteContact
from services.tag_service import process_tags

def get_contact_types():
    return ContactType.query.all()

def get_all_contacts():
    return Contact.query.order_by(Contact.last_name, Contact.first_name).all()

def create_contact(data):
    type_id = data.get('type_id')
    if not type_id:
        default = ContactType.query.filter_by(name_type='Контрагенты').first()
        if default: type_id = default.id

    new_c = Contact(
        last_name=data.get('last_name'), first_name=data.get('first_name'),
        middle_name=data.get('middle_name'), department=data.get('department'),
        role=data.get('role'), email=data.get('email'), phone=data.get('phone'),
        link=data.get('link'), notes=data.get('notes'), type_id=type_id
    )
    
    if 'tags' in data:
        new_c.tags = process_tags(data['tags'])

    db.session.add(new_c)
    db.session.commit()
    return new_c

def update_contact(contact_id, data):
    c = Contact.query.get(contact_id)
    if not c:
        return None
        
    c.last_name = data.get('last_name', c.last_name)
    c.first_name = data.get('first_name', c.first_name)
    c.middle_name = data.get('middle_name', c.middle_name)
    c.department = data.get('department', c.department)
    c.role = data.get('role', c.role)
    c.email = data.get('email', c.email)
    c.phone = data.get('phone', c.phone)
    c.link = data.get('link', c.link)
    c.notes = data.get('notes', c.notes)
    if 'type_id' in data: c.type_id = data.get('type_id')
    
    if 'tags' in data:
        c.tags = process_tags(data['tags'])
    
    db.session.commit()
    return c

def delete_contact(contact_id):
    c = Contact.query.get(contact_id)
    if not c:
        return False
    # Сначала удаляем из избранного, если там есть
    FavoriteContact.query.filter_by(contact_id=contact_id).delete()
    
    db.session.delete(c)
    db.session.commit()
    return True

def get_contact_by_id(contact_id):
    return Contact.query.get(contact_id)

def get_contact_full_details(contact_id):
    """Возвращает полную информацию о контакте, включая проекты и задачи"""
    c = Contact.query.get(contact_id)
    if not c:
        return None
    
    data = c.to_dict()
    
    # NEW: Check if favorite
    is_fav = FavoriteContact.query.filter_by(contact_id=c.id).first() is not None
    data['is_favorite'] = is_fav

    # 1. Проекты (через Association Object)
    projects_list = []
    for pc in c.project_associations:
        if pc.project:
            projects_list.append({
                'id': pc.project.id,
                'title': pc.project.title,
                'status': pc.project.status,
                'role_in_project': pc.role  # Роль человека в этом проекте
            })
    data['projects'] = projects_list
    
    # 2. Задачи (Назначенные ему) - РАЗДЕЛЕНИЕ НА АКТИВНЫЕ И ГОТОВЫЕ
    assigned_active = []
    assigned_done = []
    
    for t in c.tasks_assigned:
        t_dict = t.to_dict()
        if t.status and t.status.name == 'Готово':
            assigned_done.append(t_dict)
        else:
            assigned_active.append(t_dict)
    
    # 3. Задачи (Автор он) - без изменений
    authored_tasks = []
    for t in c.tasks_authored:
        authored_tasks.append(t.to_dict())
        
    # Сортировка: Активные и Готовые по due_date (сначала срочные/просроченные)
    data['tasks_assigned_active'] = sorted(assigned_active, key=lambda x: x['due_date'] or '9999-99-99')
    data['tasks_assigned_done'] = sorted(assigned_done, key=lambda x: x['due_date'] or '9999-99-99')
    
    # Авторские сортируем по дате создания (новые сверху)
    data['tasks_authored'] = sorted(authored_tasks, key=lambda x: x['created_at'] if 'created_at' in x else '2000-01-01', reverse=True)
    
    return data

# --- NEW: FAVORITE METHODS ---
def toggle_favorite_status(contact_id):
    existing = FavoriteContact.query.filter_by(contact_id=contact_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return False # Removed
    else:
        new_fav = FavoriteContact(contact_id=contact_id)
        db.session.add(new_fav)
        db.session.commit()
        return True # Added