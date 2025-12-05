from database import db
from models import Task, TaskStatus
from datetime import datetime
from services.tag_service import process_tags

def get_task_statuses():
    return TaskStatus.query.all()

def get_all_tasks(status_filter=None):
    query = Task.query
    if status_filter:
        pass 
    return query.order_by(Task.status_id, Task.due_date).all()

def create_task(data):
    status_id = data.get('status_id')
    if not status_id:
        default_s = TaskStatus.query.filter_by(name='К выполнению').first()
        if default_s: status_id = default_s.id
    
    due_date = None
    if data.get('due_date'):
        try: due_date = datetime.strptime(data.get('due_date'), '%Y-%m-%d').date()
        except: pass

    new_t = Task(
        title=data.get('title'), description=data.get('description'),
        due_date=due_date, status_id=status_id,
        assignee_id=data.get('assignee_id') or None,
        author_id=data.get('author_id') or None,
        project_id=data.get('project_id') or None # NEW
    )

    if 'tags' in data:
        new_t.tags = process_tags(data['tags'])
    
    db.session.add(new_t)
    db.session.commit()
    return new_t

def update_task(task_id, data):
    t = Task.query.get(task_id)
    if not t:
        return None

    t.title = data.get('title', t.title)
    t.description = data.get('description', t.description)
    if 'status_id' in data: t.status_id = data.get('status_id')
    if 'assignee_id' in data: t.assignee_id = data.get('assignee_id') or None
    if 'author_id' in data: t.author_id = data.get('author_id') or None
    if 'project_id' in data: t.project_id = data.get('project_id') or None # NEW
    
    if 'due_date' in data:
        if data['due_date']:
            try: t.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except: pass
        else: t.due_date = None

    if 'tags' in data:
        t.tags = process_tags(data['tags'])
            
    db.session.commit()
    return t

def delete_task(task_id):
    t = Task.query.get(task_id)
    if not t:
        return False
    db.session.delete(t)
    db.session.commit()
    return True

def get_task_by_id(task_id):
    return Task.query.get(task_id)

def update_task_status(task_id, status_id):
    t = Task.query.get(task_id)
    if not t:
        return None
    t.status_id = status_id
    db.session.commit()
    return t