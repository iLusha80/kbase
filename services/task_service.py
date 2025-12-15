from database import db
from models import Task, TaskStatus, TaskComment, Contact, Project
from datetime import datetime
from services.tag_service import process_tags
from services.activity_service import log_change, get_activity_log

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
        project_id=data.get('project_id') or None
    )

    if 'tags' in data:
        new_t.tags = process_tags(data['tags'])
    
    db.session.add(new_t)
    db.session.commit() # Сначала сохраняем, чтобы получить ID

    # NEW: Логируем создание
    log_change('task', new_t.id, 'Задача', None, 'Создана')
    db.session.commit()
    
    return new_t


def get_task_full_details(task_id):
    t = Task.query.get(task_id)
    if not t:
        return None
    
    data = t.to_dict()

    sorted_comments = sorted(t.comments, key=lambda x: x.created_at, reverse=True)
    data['comments'] = [c.to_dict() for c in sorted_comments]
    
    history = get_activity_log('task', task_id)
    data['history'] = [h.to_dict() for h in history]
    
    return data


def update_task(task_id, data):
    t = Task.query.get(task_id)
    if not t:
        return None

    # --- 1. ЗАПОМИНАЕМ СТАРЫЕ ЗНАЧЕНИЯ ---
    # Исправил форматирование имени (добавил or ''), чтобы не было "Ivan None"
    old_status = t.status.name if t.status else "Не назначен"
    old_assignee = f"{t.assignee.last_name} {t.assignee.first_name or ''}".strip() if t.assignee else "Не назначен"
    old_due = t.due_date.strftime('%Y-%m-%d') if t.due_date else "Нет срока"
    old_project = t.project.title if t.project else "Без проекта"

    # --- 2. ПРИМЕНЯЕМ ИЗМЕНЕНИЯ (IDs) ---
    t.title = data.get('title', t.title)
    
    if 'description' in data and data['description'] != t.description:
        log_change('task', t.id, 'Описание', 'Старое', 'Обновлено')
        t.description = data['description']

    if 'status_id' in data: t.status_id = data.get('status_id')
    if 'assignee_id' in data: t.assignee_id = data.get('assignee_id') or None
    if 'author_id' in data: t.author_id = data.get('author_id') or None
    if 'project_id' in data: t.project_id = data.get('project_id') or None
    
    if 'due_date' in data:
        if data['due_date']:
            try: t.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except: pass
        else: t.due_date = None

    if 'tags' in data:
        t.tags = process_tags(data['tags'])
    
    # --- 3. ВАЖНО: СИНХРОНИЗАЦИЯ ---
    # Отправляем изменения ID в базу
    db.session.flush() 
    # Принудительно обновляем объект t, чтобы SQLAlchemy подтянула новые связи (Status, Assignee...) по новым ID
    db.session.refresh(t) 

    # --- 4. СРАВНИВАЕМ И ЛОГИРУЕМ ---
    
    # Теперь t.status ссылается на НОВЫЙ объект
    new_status = t.status.name if t.status else "Не назначен"
    log_change('task', t.id, 'Статус', old_status, new_status)

    new_assignee = f"{t.assignee.last_name} {t.assignee.first_name or ''}".strip() if t.assignee else "Не назначен"
    log_change('task', t.id, 'Исполнитель', old_assignee, new_assignee)

    new_due = t.due_date.strftime('%Y-%m-%d') if t.due_date else "Нет срока"
    log_change('task', t.id, 'Срок', old_due, new_due)

    new_project = t.project.title if t.project else "Без проекта"
    log_change('task', t.id, 'Проект', old_project, new_project)

    # --- 5. ФИНАЛЬНЫЙ КОММИТ ---
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
    
    # Здесь тоже добавим простейший лог
    old_status = t.status.name if t.status else "Не назначен"
    t.status_id = status_id
    db.session.flush()
    db.session.refresh(t)
    new_status = t.status.name
    
    log_change('task', t.id, 'Статус', old_status, new_status)
    
    db.session.commit()
    return t

def add_comment_to_task(task_id, text):
    if not text or not text.strip():
        return None
        
    comment = TaskComment(task_id=task_id, text=text)
    db.session.add(comment)
    db.session.commit()
    return comment

def delete_comment(comment_id):
    c = TaskComment.query.get(comment_id)
    if not c:
        return False
    db.session.delete(c)
    db.session.commit()
    return True