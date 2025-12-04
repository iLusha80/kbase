from database import db
from models import Contact, ContactType
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
    db.session.delete(c)
    db.session.commit()
    return True

def get_contact_by_id(contact_id):
    return Contact.query.get(contact_id)