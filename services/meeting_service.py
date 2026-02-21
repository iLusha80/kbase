from core.database import db
from core.models import (
    Meeting, MeetingType, MeetingActionItem, MeetingNote,
    Task, TaskStatus, Contact
)
from datetime import datetime, date, timedelta
from services.activity_service import log_change, get_activity_log


def get_meeting_types():
    return MeetingType.query.order_by(MeetingType.id).all()


def get_all_meetings():
    return Meeting.query.order_by(Meeting.date.desc(), Meeting.time.desc()).all()


def get_meeting_by_id(meeting_id):
    return Meeting.query.get(meeting_id)


def get_meeting_full_details(meeting_id):
    m = Meeting.query.get(meeting_id)
    if not m:
        return None

    data = m.to_dict()
    history = get_activity_log('meeting', meeting_id)
    data['history'] = [h.to_dict() for h in history]
    return data


def create_meeting(data):
    meeting_date = date.today()
    if data.get('date'):
        try:
            meeting_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            pass

    meeting_time = None
    if data.get('time'):
        try:
            meeting_time = datetime.strptime(data['time'], '%H:%M').time()
        except (ValueError, TypeError):
            pass

    status = data.get('status', 'in_progress')
    started_at = datetime.now() if status == 'in_progress' else None

    # Автоматическое название, если не указано
    title = data.get('title', '').strip()
    if not title:
        title = f"Встреча {meeting_date.strftime('%d.%m.%Y')}"

    new_m = Meeting(
        title=title,
        date=meeting_date,
        time=meeting_time,
        duration_minutes=data.get('duration_minutes') or None,
        type_id=data.get('type_id') or None,
        agenda=data.get('agenda'),
        notes=data.get('notes'),
        summary=data.get('summary'),
        project_id=data.get('project_id') or None,
        status=status,
        started_at=started_at
    )

    # Участники (M2M)
    if 'participant_ids' in data and data['participant_ids']:
        contacts = Contact.query.filter(Contact.id.in_(data['participant_ids'])).all()
        new_m.participants = contacts

    # Связанные задачи (M2M)
    if 'task_ids' in data and data['task_ids']:
        tasks = Task.query.filter(Task.id.in_(data['task_ids'])).all()
        new_m.related_tasks = tasks

    db.session.add(new_m)
    db.session.commit()

    # Action items (backward compat)
    if 'action_items' in data and data['action_items']:
        for item_data in data['action_items']:
            if item_data.get('text', '').strip():
                ai = MeetingActionItem(
                    meeting_id=new_m.id,
                    text=item_data['text'].strip(),
                    assignee_id=item_data.get('assignee_id') or None
                )
                db.session.add(ai)
        db.session.commit()

    log_change('meeting', new_m.id, 'Встреча', None, 'Создана')
    db.session.commit()

    return new_m


def update_meeting(meeting_id, data):
    m = Meeting.query.get(meeting_id)
    if not m:
        return None

    old_status = m.status or 'in_progress'
    old_title = m.title

    if 'title' in data:
        m.title = data['title'] or m.title
    if 'date' in data and data['date']:
        try:
            m.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            pass
    if 'time' in data:
        if data['time']:
            try:
                m.time = datetime.strptime(data['time'], '%H:%M').time()
            except (ValueError, TypeError):
                pass
        else:
            m.time = None
    if 'duration_minutes' in data:
        m.duration_minutes = data['duration_minutes'] or None
    if 'type_id' in data:
        m.type_id = data['type_id'] or None
    if 'agenda' in data:
        m.agenda = data['agenda']
    if 'notes' in data:
        m.notes = data['notes']
    if 'summary' in data:
        m.summary = data['summary']
    if 'project_id' in data:
        m.project_id = data['project_id'] or None
    if 'status' in data:
        new_status = data['status']
        m.status = new_status
        # Автоматически проставляем started_at / ended_at
        if new_status == 'in_progress' and not m.started_at:
            m.started_at = datetime.now()
        elif new_status == 'completed' and not m.ended_at:
            m.ended_at = datetime.now()

    # Участники (M2M)
    if 'participant_ids' in data:
        if data['participant_ids']:
            contacts = Contact.query.filter(Contact.id.in_(data['participant_ids'])).all()
            m.participants = contacts
        else:
            m.participants = []

    # Связанные задачи (M2M)
    if 'task_ids' in data:
        if data['task_ids']:
            tasks = Task.query.filter(Task.id.in_(data['task_ids'])).all()
            m.related_tasks = tasks
        else:
            m.related_tasks = []

    db.session.flush()
    db.session.refresh(m)

    new_status = m.status or 'in_progress'
    if old_status != new_status:
        log_change('meeting', m.id, 'Статус', old_status, new_status)
    if old_title != m.title:
        log_change('meeting', m.id, 'Название', old_title, m.title)

    db.session.commit()
    return m


def delete_meeting(meeting_id):
    m = Meeting.query.get(meeting_id)
    if not m:
        return False
    db.session.delete(m)
    db.session.commit()
    return True


# --- MEETING NOTES ---

def add_note(meeting_id, data):
    m = Meeting.query.get(meeting_id)
    if not m:
        return None

    text = data.get('text', '').strip()
    if not text:
        return None

    note = MeetingNote(
        meeting_id=meeting_id,
        text=text,
        source=data.get('source', 'manual'),
        category=data.get('category', 'note')
    )
    db.session.add(note)
    db.session.commit()
    return note


def update_note(note_id, data):
    note = MeetingNote.query.get(note_id)
    if not note:
        return None

    if 'text' in data:
        note.text = data['text']
    if 'category' in data:
        note.category = data['category']

    db.session.commit()
    return note


def delete_note(note_id):
    note = MeetingNote.query.get(note_id)
    if not note:
        return False
    db.session.delete(note)
    db.session.commit()
    return True


def convert_note_to_task(note_id):
    note = MeetingNote.query.get(note_id)
    if not note:
        return None

    default_status = TaskStatus.query.filter_by(name='К выполнению').first()
    status_id = default_status.id if default_status else 1

    meeting = note.meeting

    title_prefix = meeting.title or f"Встреча {meeting.date.isoformat()}"

    new_task = Task(
        title=note.text,
        description=f"Из встречи: {title_prefix}",
        status_id=status_id,
        project_id=meeting.project_id
    )
    db.session.add(new_task)
    db.session.flush()

    # Привязываем задачу к заметке
    note.task_id = new_task.id

    # Привязываем задачу к встрече
    if new_task not in meeting.related_tasks:
        meeting.related_tasks.append(new_task)

    db.session.commit()
    return new_task


# --- ACTION ITEMS (backward compat) ---

def add_action_item(meeting_id, data):
    m = Meeting.query.get(meeting_id)
    if not m:
        return None

    text = data.get('text', '').strip()
    if not text:
        return None

    ai = MeetingActionItem(
        meeting_id=meeting_id,
        text=text,
        assignee_id=data.get('assignee_id') or None
    )
    db.session.add(ai)
    db.session.commit()
    return ai


def update_action_item(item_id, data):
    ai = MeetingActionItem.query.get(item_id)
    if not ai:
        return None

    if 'text' in data:
        ai.text = data['text']
    if 'is_done' in data:
        ai.is_done = data['is_done']
    if 'assignee_id' in data:
        ai.assignee_id = data['assignee_id'] or None

    db.session.commit()
    return ai


def delete_action_item(item_id):
    ai = MeetingActionItem.query.get(item_id)
    if not ai:
        return False
    db.session.delete(ai)
    db.session.commit()
    return True


def convert_action_item_to_task(item_id):
    ai = MeetingActionItem.query.get(item_id)
    if not ai:
        return None

    default_status = TaskStatus.query.filter_by(name='К выполнению').first()
    status_id = default_status.id if default_status else 1

    meeting = ai.meeting

    new_task = Task(
        title=ai.text,
        description=f"Из встречи: {meeting.title or meeting.date.isoformat()} ({meeting.date.isoformat()})",
        status_id=status_id,
        assignee_id=ai.assignee_id,
        project_id=meeting.project_id
    )
    db.session.add(new_task)
    db.session.flush()

    ai.task_id = new_task.id
    ai.is_done = True

    if new_task not in meeting.related_tasks:
        meeting.related_tasks.append(new_task)

    db.session.commit()
    return new_task


def get_upcoming_meetings(days=7):
    today = date.today()
    end_date = today + timedelta(days=days)
    return Meeting.query.filter(
        Meeting.date >= today,
        Meeting.date <= end_date,
        Meeting.status.in_(['planned', 'in_progress'])
    ).order_by(Meeting.date, Meeting.time).all()
