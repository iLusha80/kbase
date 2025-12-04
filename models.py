from database import db


class ContactType(db.Model):
    __tablename__ = 'contact_types'
    
    id = db.Column(db.Integer, primary_key=True)
    name_type = db.Column(db.String(50), nullable=False, unique=True)
    render_color = db.Column(db.String(20), default='#cbd5e1') # Default slate color
    
    # Связь с контактами (для удобства, если понадобится обратный доступ)
    contacts = db.relationship('Contact', backref='contact_type', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name_type': self.name_type,
            'render_color': self.render_color
        }

class Contact(db.Model):
    __tablename__ = 'contacts'

    id = db.Column(db.Integer, primary_key=True)
    last_name = db.Column(db.String(100), nullable=False)
    first_name = db.Column(db.String(100), nullable=True)
    middle_name = db.Column(db.String(100), nullable=True)
    
    department = db.Column(db.String(100))
    role = db.Column(db.String(100))
    email = db.Column(db.String(100))
    phone = db.Column(db.String(50))
    link = db.Column(db.String(256))
    notes = db.Column(db.Text)
    
    # Внешний ключ на тип контакта
    type_id = db.Column(db.Integer, db.ForeignKey('contact_types.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'last_name': self.last_name,
            'first_name': self.first_name,
            'middle_name': self.middle_name,
            'department': self.department,
            'role': self.role,
            'email': self.email,
            'phone': self.phone,
            'link': self.link,
            'notes': self.notes,
            'type': self.contact_type.to_dict() if self.contact_type else None,
            'type_id': self.type_id
        }
