from core.database import db
from datetime import datetime

# --- ASSOCIATION TABLES ---
contact_tags = db.Table('contact_tags',
    db.Column('contact_id', db.Integer, db.ForeignKey('contacts.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
)

task_tags = db.Table('task_tags',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tags.id'), primary_key=True)
)

meeting_participants = db.Table('meeting_participants',
    db.Column('meeting_id', db.Integer, db.ForeignKey('meetings.id'), primary_key=True),
    db.Column('contact_id', db.Integer, db.ForeignKey('contacts.id'), primary_key=True)
)

meeting_tasks = db.Table('meeting_tasks',
    db.Column('meeting_id', db.Integer, db.ForeignKey('meetings.id'), primary_key=True),
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id'), primary_key=True)
)

# --- ASSOCIATION OBJECT FOR PROJECT-CONTACTS (With Role) ---
class ProjectContact(db.Model):
    __tablename__ = 'project_contacts'
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), primary_key=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), primary_key=True)
    role = db.Column(db.String(100)) # Роль человека в проекте

    # Relationships
    contact = db.relationship("Contact", back_populates="project_associations")
    project = db.relationship("Project", back_populates="contact_associations")

# --- TAG MODEL ---
class Tag(db.Model):
    __tablename__ = 'tags'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name}

# --- PROJECT MODEL ---
class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(50), default='Active') # Active, Archived, Planning, On Hold
    link = db.Column(db.String(256), nullable=True) # Ссылка на ресурсы проекта
    
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Relationships
    tasks = db.relationship('Task', backref='project', lazy=True)
    contact_associations = db.relationship("ProjectContact", back_populates="project", cascade="all, delete-orphan")

    def to_dict(self):
        completed_count = sum(1 for t in self.tasks if t.status and t.status.name == 'Done')
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'link': self.link,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'tasks_count': len(self.tasks),
            'completed_tasks_count': completed_count,
            'team': [{
                'contact_id': pc.contact.id,
                'name': f"{pc.contact.last_name} {pc.contact.first_name or ''}".strip(),
                'role': pc.role
            } for pc in self.contact_associations]
        }

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
    is_self = db.Column(db.Boolean, default=False, nullable=False, server_default='0')
    is_team = db.Column(db.Boolean, default=False, nullable=False, server_default='0')

    # Relationship to Tags
    tags = db.relationship('Tag', secondary=contact_tags, lazy='subquery',
        backref=db.backref('contacts', lazy=True))
    
    # Relationship to Projects (via Association Object)
    project_associations = db.relationship("ProjectContact", back_populates="contact")

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
            'tags': [tag.to_dict() for tag in self.tags],
            'is_self': self.is_self,
            'is_team': self.is_team,
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
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    status_id = db.Column(db.Integer, db.ForeignKey('task_statuses.id'), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=True)
    author_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)

    assignee = db.relationship('Contact', foreign_keys=[assignee_id], backref='tasks_assigned')
    author = db.relationship('Contact', foreign_keys=[author_id], backref='tasks_authored')
    
    tags = db.relationship('Tag', secondary=task_tags, lazy='subquery',
        backref=db.backref('tasks', lazy=True))
    
    comments = db.relationship('TaskComment', backref='task', lazy=True, cascade="all, delete-orphan")

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
            'project_id': self.project_id,
            'project_title': self.project.title if self.project else None,
            'tags': [tag.to_dict() for tag in self.tags]
        }

class TaskComment(db.Model):
    __tablename__ = 'task_comments'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
            'task_id': self.task_id
        }

class QuickLink(db.Model):
    __tablename__ = 'quick_links'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    icon = db.Column(db.String(50), default='link')
    
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'url': self.url,
            'icon': self.icon
        }
    
class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=False)
    
    event_type = db.Column(db.String(50))
    field_name = db.Column(db.String(50))
    
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return {
            'id': self.id,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'event_type': self.event_type,
            'field_name': self.field_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
            'timestamp': self.created_at.timestamp()
        }

# --- VIEW LOG (для отслеживания просмотров сущностей) ---
class ViewLog(db.Model):
    __tablename__ = 'view_logs'
    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(50), nullable=False)  # 'task', 'project', 'contact'
    entity_id = db.Column(db.Integer, nullable=False)
    viewed_at = db.Column(db.DateTime, default=datetime.now)

    __table_args__ = (
        db.Index('ix_viewlog_entity', 'entity_type', 'entity_id'),
        db.Index('ix_viewlog_viewed_at', 'viewed_at'),
    )

# --- NEW: FAVORITE CONTACTS ---
class FavoriteContact(db.Model):
    __tablename__ = 'favorite_contacts'
    id = db.Column(db.Integer, primary_key=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationship
    contact = db.relationship('Contact', backref=db.backref('favorite_entry', uselist=False))

# --- MEETING MODELS ---
class MeetingType(db.Model):
    __tablename__ = 'meeting_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    default_agenda = db.Column(db.Text)
    color = db.Column(db.String(7), default='#6366f1')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'default_agenda': self.default_agenda,
            'color': self.color
        }

class Meeting(db.Model):
    __tablename__ = 'meetings'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=True)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time, nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=True)
    type_id = db.Column(db.Integer, db.ForeignKey('meeting_types.id'), nullable=True)
    agenda = db.Column(db.Text)
    notes = db.Column(db.Text)
    summary = db.Column(db.Text)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True)
    status = db.Column(db.String(20), default='in_progress')
    started_at = db.Column(db.DateTime, nullable=True)
    ended_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationships
    type = db.relationship('MeetingType', backref='meetings')
    project = db.relationship('Project', backref='meetings')
    participants = db.relationship('Contact', secondary=meeting_participants, lazy='subquery',
        backref=db.backref('meetings_participated', lazy=True))
    related_tasks = db.relationship('Task', secondary=meeting_tasks, lazy='subquery',
        backref=db.backref('meetings_related', lazy=True))
    action_items = db.relationship('MeetingActionItem', backref='meeting',
        cascade='all, delete-orphan', lazy='subquery')
    meeting_notes = db.relationship('MeetingNote', backref='meeting',
        cascade='all, delete-orphan', lazy='subquery', order_by='MeetingNote.created_at')

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'date': self.date.isoformat() if self.date else None,
            'time': self.time.strftime('%H:%M') if self.time else None,
            'duration_minutes': self.duration_minutes,
            'type_id': self.type_id,
            'type': self.type.to_dict() if self.type else None,
            'agenda': self.agenda,
            'notes': self.notes,
            'summary': self.summary,
            'project_id': self.project_id,
            'project_title': self.project.title if self.project else None,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'participants': [p.to_dict() for p in self.participants],
            'participants_count': len(self.participants),
            'related_tasks': [t.to_dict() for t in self.related_tasks],
            'meeting_notes': [n.to_dict() for n in self.meeting_notes],
            'meeting_notes_count': len(self.meeting_notes),
            'action_items': [ai.to_dict() for ai in self.action_items],
            'action_items_count': len(self.action_items),
            'action_items_done': sum(1 for ai in self.action_items if ai.is_done)
        }

class MeetingActionItem(db.Model):
    __tablename__ = 'meeting_action_items'
    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    is_done = db.Column(db.Boolean, default=False)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    assignee_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    task = db.relationship('Task')
    assignee = db.relationship('Contact')

    def to_dict(self):
        return {
            'id': self.id,
            'meeting_id': self.meeting_id,
            'text': self.text,
            'is_done': self.is_done,
            'task_id': self.task_id,
            'task_title': self.task.title if self.task else None,
            'assignee_id': self.assignee_id,
            'assignee_name': f"{self.assignee.last_name} {self.assignee.first_name or ''}".strip() if self.assignee else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None
        }


class MeetingNote(db.Model):
    __tablename__ = 'meeting_notes'
    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meetings.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    source = db.Column(db.String(20), default='manual')  # manual, voice, ai
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    task = db.relationship('Task')

    def to_dict(self):
        return {
            'id': self.id,
            'meeting_id': self.meeting_id,
            'text': self.text,
            'source': self.source,
            'task_id': self.task_id,
            'task_title': self.task.title if self.task else None,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else None
        }