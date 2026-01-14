from datetime import datetime, timedelta
from database import db
from models import Task, ActivityLog, TaskStatus

def get_weekly_report_data(date_from=None, date_to=None):
    # Если даты не переданы, используем последние 7 дней
    today = datetime.now()
    if date_to is None:
        date_to = today
    if date_from is None:
        date_from = date_to - timedelta(days=7)

    # Устанавливаем время на конец дня для date_to
    date_to_end = date_to.replace(hour=23, minute=59, second=59)
    
    # 1. СДЕЛАНО ЗА ПЕРИОД (Completed)
    # Ищем в логах записи, где статус изменился на "Готово" за выбранный период
    completed_logs = ActivityLog.query.filter(
        ActivityLog.entity_type == 'task',
        ActivityLog.field_name == 'Статус',
        ActivityLog.new_value == 'Готово',
        ActivityLog.created_at >= date_from,
        ActivityLog.created_at <= date_to_end
    ).all()
    
    # Собираем уникальные ID задач (если задачу переоткрывали и закрывали несколько раз)
    completed_ids = list(set(log.entity_id for log in completed_logs))
    
    # Загружаем сами задачи (проверяем, что они до сих пор "Готово", а не были переоткрыты)
    done_status = TaskStatus.query.filter_by(name='Готово').first()
    done_status_id = done_status.id if done_status else -1
    
    completed_tasks = []
    if completed_ids:
        completed_tasks = Task.query.filter(
            Task.id.in_(completed_ids),
            Task.status_id == done_status_id
        ).all()

    # 2. В РАБОТЕ (In Progress)
    # Задачи со статусом "В работе"
    in_progress_status = TaskStatus.query.filter_by(name='В работе').first()
    in_progress_tasks = []
    if in_progress_status:
        in_progress_tasks = Task.query.filter(Task.status_id == in_progress_status.id).all()

    # 3. ПЛАНЫ (К выполнению / Backlog) - опционально, берем "К выполнению"
    todo_status = TaskStatus.query.filter_by(name='К выполнению').first()
    todo_tasks = []
    if todo_status:
        # Ограничим вывод, чтобы не завалить отчет
        todo_tasks = Task.query.filter(Task.status_id == todo_status.id).limit(10).all()

    # 4. СОЗДАНО ЗА ПЕРИОД (New)
    created_tasks = Task.query.filter(
        Task.created_at >= date_from,
        Task.created_at <= date_to_end
    ).order_by(Task.created_at.desc()).all()

    return {
        'date_range': f"{date_from.strftime('%d.%m.%Y')} - {date_to.strftime('%d.%m.%Y')}",
        'completed': [t.to_dict() for t in completed_tasks],
        'in_progress': [t.to_dict() for t in in_progress_tasks],
        'todo': [t.to_dict() for t in todo_tasks],
        'created': [t.to_dict() for t in created_tasks]
    }
