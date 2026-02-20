"""Сервис экспорта/импорта данных (JSON, CSV)."""
import json
import csv
import io
from datetime import datetime
from core.database import db
from core.models import Task, Contact, Project, Tag, TaskComment, ActivityLog


def export_all_json():
    """Экспорт всех данных в JSON."""
    tasks = Task.query.all()
    contacts = Contact.query.all()
    projects = Project.query.all()
    tags = Tag.query.all()
    comments = TaskComment.query.all()

    data = {
        'exported_at': datetime.now().isoformat(),
        'version': '1.0',
        'tags': [t.to_dict() for t in tags],
        'contacts': [c.to_dict() for c in contacts],
        'projects': [p.to_dict() for p in projects],
        'tasks': [t.to_dict() for t in tasks],
        'comments': [c.to_dict() for c in comments],
    }
    return data


def export_tasks_csv():
    """Экспорт задач в CSV (для Excel)."""
    tasks = Task.query.all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    # Header
    writer.writerow([
        'ID', 'Название', 'Описание', 'Статус', 'Дедлайн',
        'Исполнитель', 'Автор', 'Проект', 'Теги', 'Создано'
    ])

    for t in tasks:
        writer.writerow([
            t.id,
            t.title,
            t.description or '',
            t.status.name if t.status else '',
            t.due_date.isoformat() if t.due_date else '',
            f"{t.assignee.last_name} {t.assignee.first_name or ''}".strip() if t.assignee else '',
            f"{t.author.last_name} {t.author.first_name or ''}".strip() if t.author else '',
            t.project.title if t.project else '',
            ', '.join(tag.name for tag in t.tags),
            t.created_at.strftime('%Y-%m-%d %H:%M') if t.created_at else '',
        ])

    return output.getvalue()


def export_contacts_csv():
    """Экспорт контактов в CSV."""
    contacts = Contact.query.all()

    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')

    writer.writerow([
        'ID', 'Фамилия', 'Имя', 'Отчество', 'Должность',
        'Отдел', 'Email', 'Телефон', 'Тип', 'Теги'
    ])

    for c in contacts:
        writer.writerow([
            c.id,
            c.last_name,
            c.first_name or '',
            c.middle_name or '',
            c.role or '',
            c.department or '',
            c.email or '',
            c.phone or '',
            c.contact_type.name_type if c.contact_type else '',
            ', '.join(tag.name for tag in c.tags),
        ])

    return output.getvalue()


def import_from_json(data):
    """
    Импорт данных из JSON.
    Возвращает словарь с количеством импортированных сущностей.
    """
    from core.models import ContactType, TaskStatus

    stats = {'tags': 0, 'contacts': 0, 'projects': 0, 'tasks': 0}

    # Теги
    for tag_data in data.get('tags', []):
        existing = Tag.query.filter_by(name=tag_data['name']).first()
        if not existing:
            db.session.add(Tag(name=tag_data['name']))
            stats['tags'] += 1
    db.session.flush()

    # Контакты (без связей)
    contact_map = {}  # old_id -> new Contact
    for c_data in data.get('contacts', []):
        existing = Contact.query.filter_by(
            last_name=c_data['last_name'],
            first_name=c_data.get('first_name')
        ).first()
        if existing:
            contact_map[c_data['id']] = existing
            continue

        type_id = None
        if c_data.get('type') and c_data['type'].get('name_type'):
            ct = ContactType.query.filter_by(name_type=c_data['type']['name_type']).first()
            type_id = ct.id if ct else None

        c = Contact(
            last_name=c_data['last_name'],
            first_name=c_data.get('first_name'),
            middle_name=c_data.get('middle_name'),
            role=c_data.get('role'),
            department=c_data.get('department'),
            email=c_data.get('email'),
            phone=c_data.get('phone'),
            notes=c_data.get('notes'),
            type_id=type_id,
        )
        # Теги
        for tag_info in c_data.get('tags', []):
            tag = Tag.query.filter_by(name=tag_info['name']).first()
            if tag:
                c.tags.append(tag)

        db.session.add(c)
        db.session.flush()
        contact_map[c_data['id']] = c
        stats['contacts'] += 1

    # Проекты
    project_map = {}
    for p_data in data.get('projects', []):
        existing = Project.query.filter_by(title=p_data['title']).first()
        if existing:
            project_map[p_data['id']] = existing
            continue

        p = Project(
            title=p_data['title'],
            description=p_data.get('description'),
            status=p_data.get('status', 'Active'),
        )
        db.session.add(p)
        db.session.flush()
        project_map[p_data['id']] = p
        stats['projects'] += 1

    # Задачи
    for t_data in data.get('tasks', []):
        existing = Task.query.filter_by(title=t_data['title']).first()
        if existing:
            continue

        status_id = None
        if t_data.get('status') and t_data['status'].get('name'):
            st = TaskStatus.query.filter_by(name=t_data['status']['name']).first()
            status_id = st.id if st else None
        if not status_id:
            default_st = TaskStatus.query.first()
            status_id = default_st.id if default_st else 1

        assignee = contact_map.get(t_data.get('assignee_id'))
        author = contact_map.get(t_data.get('author_id'))
        project = project_map.get(t_data.get('project_id'))

        from datetime import date as date_cls
        due = None
        if t_data.get('due_date'):
            try:
                due = date_cls.fromisoformat(t_data['due_date'])
            except (ValueError, TypeError):
                pass

        t = Task(
            title=t_data['title'],
            description=t_data.get('description'),
            due_date=due,
            status_id=status_id,
            assignee_id=assignee.id if assignee else None,
            author_id=author.id if author else None,
            project_id=project.id if project else None,
        )
        for tag_info in t_data.get('tags', []):
            tag = Tag.query.filter_by(name=tag_info['name']).first()
            if tag:
                t.tags.append(tag)

        db.session.add(t)
        stats['tasks'] += 1

    db.session.commit()
    return stats
