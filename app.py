import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify
from database import db
from models import Contact, ContactType, Task, TaskStatus, Tag

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///kbase.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# --- HELPER: TAGS ---
def process_tags(tag_names):
    """Принимает список строк тегов, возвращает список объектов Tag"""
    if not tag_names:
        return []
    
    result_tags = []
    for name in tag_names:
        clean_name = name.strip()
        if not clean_name:
            continue
            
        # Case-insensitive search (но сохраняем как ввел пользователь или lowercase)
        # Для простоты сделаем все в lower case, чтобы не дублировать
        clean_name = clean_name.lower()
        
        tag = Tag.query.filter_by(name=clean_name).first()
        if not tag:
            tag = Tag(name=clean_name)
            db.session.add(tag)
        result_tags.append(tag)
    
    return result_tags

# --- INITIALIZATION ---
def init_db():
    db.create_all()
    # Init Contact Types
    if not ContactType.query.first():
        defaults = [
            {'name': 'Руководство', 'color': '#ef4444'},
            {'name': 'Моя команда', 'color': '#10b981'},
            {'name': 'Контрагенты', 'color': '#3b82f6'},
            {'name': 'Другое', 'color': '#94a3b8'}
        ]
        for item in defaults:
            db.session.add(ContactType(name_type=item['name'], render_color=item['color']))
        db.session.commit()

    # Init Task Statuses
    if not TaskStatus.query.first():
        statuses = [
            {'name': 'К выполнению', 'color': '#64748b'},
            {'name': 'В работе', 'color': '#f59e0b'},
            {'name': 'Жду ответа', 'color': '#8b5cf6'},
            {'name': 'Готово', 'color': '#22c55e'}
        ]
        for item in statuses:
            db.session.add(TaskStatus(name=item['name'], color=item['color']))
        db.session.commit()

with app.app_context():
    init_db()

# --- ROUTES ---
@app.route('/')
def index(): return render_template('index.html')
@app.route('/contacts')
def contacts_page(): return render_template('index.html')
@app.route('/tasks')
def tasks_page(): return render_template('index.html')

# --- API: TAGS ---
@app.route('/api/tags', methods=['GET'])
def get_all_tags():
    tags = Tag.query.order_by(Tag.name).all()
    return jsonify([t.to_dict() for t in tags])

# --- API: CONTACTS ---
@app.route('/api/contact-types', methods=['GET'])
def get_contact_types():
    return jsonify([t.to_dict() for t in ContactType.query.all()])

@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    contacts = Contact.query.order_by(Contact.last_name, Contact.first_name).all()
    return jsonify([c.to_dict() for c in contacts])

@app.route('/api/contacts', methods=['POST'])
def add_contact():
    data = request.json
    if not data or not data.get('last_name'): return jsonify({'error': 'Last name required'}), 400
    
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
    
    # Обработка тегов
    if 'tags' in data:
        new_c.tags = process_tags(data['tags'])

    try:
        db.session.add(new_c)
        db.session.commit()
        return jsonify(new_c.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts/<int:id>', methods=['PUT', 'DELETE'])
def manage_contact(id):
    c = Contact.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(c)
        db.session.commit()
        return jsonify({'msg': 'Deleted'}), 200
    
    data = request.json
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
    
    # Обновление тегов
    if 'tags' in data:
        c.tags = process_tags(data['tags'])
    
    db.session.commit()
    return jsonify(c.to_dict()), 200


# --- API: TASKS ---
@app.route('/api/task-statuses', methods=['GET'])
def get_task_statuses():
    return jsonify([s.to_dict() for s in TaskStatus.query.all()])

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.order_by(Task.status_id, Task.due_date).all()
    return jsonify([t.to_dict() for t in tasks])

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.json
    if not data or not data.get('title'): return jsonify({'error': 'Title required'}), 400

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
        author_id=data.get('author_id') or None
    )

    # Обработка тегов
    if 'tags' in data:
        new_t.tags = process_tags(data['tags'])
    
    try:
        db.session.add(new_t)
        db.session.commit()
        return jsonify(new_t.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/tasks/<int:id>', methods=['PUT', 'DELETE'])
def manage_task(id):
    t = Task.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(t)
        db.session.commit()
        return jsonify({'msg': 'Deleted'}), 200
    
    data = request.json
    t.title = data.get('title', t.title)
    t.description = data.get('description', t.description)
    if 'status_id' in data: t.status_id = data.get('status_id')
    if 'assignee_id' in data: t.assignee_id = data.get('assignee_id') or None
    if 'author_id' in data: t.author_id = data.get('author_id') or None
    if 'due_date' in data:
        if data['due_date']:
            try: t.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
            except: pass
        else: t.due_date = None

    # Обновление тегов
    if 'tags' in data:
        t.tags = process_tags(data['tags'])
            
    db.session.commit()
    return jsonify(t.to_dict()), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)