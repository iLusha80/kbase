from database import db
from datetime import datetime

# --- ASSOCIATION TABLES (Many-to-Many) ---
contact_tags = db.Table('contact_tags',
    db.Column('contact_id', db.Integer, db.ForeignKey('contacts.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
)

task_tags = db.Table('task_tags',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
)

# --- TAG MODEL ---
class Tag(db.Model):
    __tablename__ = 'tags'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name}

# --- CONTACT MODELS ---
class ContactType(db.Model):
    __tablename__ = 'contact_types'
    id = db.Column(db.Integer, primary_key=True)
    name_type = db.Column(db.String(50), nullable=False, unique=True)
    render_color = db.Column(db.String(20), default='#cbd5e1')
    contacts = db.relationship('Contact', backref='contact_type', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'name_type': self.name_type, 'render_color': self.render_color}

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
    type_id = db.Column(db.Integer, db.ForeignKey('contact_types.id'), nullable=True)

    # Relationship to Tags
    tags = db.relationship('Tag', secondary=contact_tags, lazy='subquery',
        backref=db.backref('contacts', lazy=True))

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
            'type_id': self.type_id,
            'tags': [tag.to_dict() for tag in self.tags] # Return tags list
        }

# --- TASK MODELS ---
class TaskStatus(db.Model):
    __tablename__ = 'task_statuses'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    color = db.Column(db.String(20), default='#94a3b8')
    tasks = db.relationship('Task', backref='status', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'color': self.color}

class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now())
    status_id = db.Column(db.Integer, db.ForeignKey('task_statuses.id'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=True)
    author_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=True)

    assignee = db.relationship('Contact', foreign_keys=[assignee_id], backref='tasks_assigned')
    author = db.relationship('Contact', foreign_keys=[author_id], backref='tasks_authored')
    
    # Relationship to Tags
    tags = db.relationship('Tag', secondary=task_tags, lazy='subquery',
        backref=db.backref('tasks', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status.to_dict() if self.status else None,
            'status_id': self.status_id,
            'assignee': self.assignee.to_dict() if self.assignee else None,
            'assignee_id': self.assignee_id,
            'author': self.author.to_dict() if self.author else None,
            'author_id': self.author_id,
            'tags': [tag.to_dict() for tag in self.tags] # Return tags list
        }