from datetime import datetime, timedelta, date
from database import db
from models import Task, ActivityLog, TaskStatus, Project, Contact


def get_blockers_and_risks():
    """
    Возвращает задачи-блокеры и риски:
    1. Просроченные задачи (due_date в прошлом, не завершены)
    2. Задачи без исполнителя (активные)
    3. Застрявшие в работе (>7 дней в статусе "В работе")
    """
    today = date.today()
    done_status = TaskStatus.query.filter_by(name='Готово').first()
    done_id = done_status.id if done_status else -1
    in_progress_status = TaskStatus.query.filter_by(name='В работе').first()

    # 1. Просроченные задачи
    overdue_tasks = Task.query.filter(
        Task.due_date < today,
        Task.status_id != done_id
    ).order_by(Task.due_date.asc()).all()

    # 2. Задачи без исполнителя (активные - не завершённые)
    no_assignee_tasks = Task.query.filter(
        Task.assignee_id.is_(None),
        Task.status_id != done_id
    ).order_by(Task.created_at.desc()).all()

    # 3. Застрявшие в работе (>7 дней)
    stuck_tasks = []
    if in_progress_status:
        stuck_threshold = datetime.now() - timedelta(days=7)

        # Находим задачи, которые перешли в "В работе" более 7 дней назад
        stuck_logs = ActivityLog.query.filter(
            ActivityLog.entity_type == 'task',
            ActivityLog.field_name == 'Статус',
            ActivityLog.new_value == 'В работе',
            ActivityLog.created_at < stuck_threshold
        ).all()

        # Собираем ID задач, которые до сих пор в статусе "В работе"
        stuck_task_ids = set()
        for log in stuck_logs:
            task = Task.query.get(log.entity_id)
            if task and task.status_id == in_progress_status.id:
                stuck_task_ids.add(task.id)

        if stuck_task_ids:
            stuck_tasks = Task.query.filter(Task.id.in_(stuck_task_ids)).all()

    return {
        'overdue': [t.to_dict() for t in overdue_tasks],
        'no_assignee': [t.to_dict() for t in no_assignee_tasks],
        'stuck': [t.to_dict() for t in stuck_tasks]
    }


def get_project_breakdown():
    """
    Возвращает статистику по каждому активному проекту.
    """
    done_status = TaskStatus.query.filter_by(name='Готово').first()
    in_progress_status = TaskStatus.query.filter_by(name='В работе').first()
    todo_status = TaskStatus.query.filter_by(name='К выполнению').first()

    projects = Project.query.filter_by(status='Active').all()
    result = []

    for project in projects:
        tasks = project.tasks
        total = len(tasks)
        if total == 0:
            continue

        completed = sum(1 for t in tasks if done_status and t.status_id == done_status.id)
        in_progress = sum(1 for t in tasks if in_progress_status and t.status_id == in_progress_status.id)
        todo = sum(1 for t in tasks if todo_status and t.status_id == todo_status.id)

        # Процент выполнения
        progress = round((completed / total) * 100) if total > 0 else 0

        result.append({
            'project_id': project.id,
            'project_title': project.title,
            'total': total,
            'completed': completed,
            'in_progress': in_progress,
            'todo': todo,
            'progress': progress
        })

    # Сортируем по количеству задач в работе (наиболее активные первыми)
    result.sort(key=lambda x: x['in_progress'], reverse=True)
    return result


def get_team_workload(date_from, date_to_end):
    """
    Возвращает нагрузку команды:
    1. Завершённые задачи за период (по исполнителям)
    2. Текущее количество активных задач у каждого
    """
    done_status = TaskStatus.query.filter_by(name='Готово').first()
    done_id = done_status.id if done_status else -1

    # Получаем логи завершения за период
    completed_logs = ActivityLog.query.filter(
        ActivityLog.entity_type == 'task',
        ActivityLog.field_name == 'Статус',
        ActivityLog.new_value == 'Готово',
        ActivityLog.created_at >= date_from,
        ActivityLog.created_at <= date_to_end
    ).all()

    completed_task_ids = list(set(log.entity_id for log in completed_logs))
    completed_tasks = Task.query.filter(Task.id.in_(completed_task_ids)).all() if completed_task_ids else []

    # Агрегируем по исполнителям
    workload = {}

    # Считаем завершённые
    for task in completed_tasks:
        if task.assignee_id:
            if task.assignee_id not in workload:
                workload[task.assignee_id] = {
                    'contact': task.assignee.to_dict() if task.assignee else None,
                    'completed_count': 0,
                    'active_count': 0
                }
            workload[task.assignee_id]['completed_count'] += 1

    # Считаем текущие активные задачи
    active_tasks = Task.query.filter(
        Task.status_id != done_id,
        Task.assignee_id.isnot(None)
    ).all()

    for task in active_tasks:
        if task.assignee_id not in workload:
            workload[task.assignee_id] = {
                'contact': task.assignee.to_dict() if task.assignee else None,
                'completed_count': 0,
                'active_count': 0
            }
        workload[task.assignee_id]['active_count'] += 1

    # Преобразуем в список и сортируем по количеству завершённых
    result = list(workload.values())
    result.sort(key=lambda x: x['completed_count'], reverse=True)
    return result


def get_next_week_plans(date_to):
    """
    Возвращает планы на следующую неделю:
    1. Задачи с дедлайном в следующие 7 дней
    2. Приоритетные задачи из бэклога (без дедлайна, но к выполнению)
    """
    # Определяем диапазон следующей недели
    if isinstance(date_to, datetime):
        next_week_start = (date_to + timedelta(days=1)).date()
    else:
        next_week_start = date_to + timedelta(days=1)
    next_week_end = next_week_start + timedelta(days=7)

    done_status = TaskStatus.query.filter_by(name='Готово').first()
    done_id = done_status.id if done_status else -1
    todo_status = TaskStatus.query.filter_by(name='К выполнению').first()

    # Задачи с дедлайном на следующей неделе
    next_week_tasks = Task.query.filter(
        Task.due_date >= next_week_start,
        Task.due_date <= next_week_end,
        Task.status_id != done_id
    ).order_by(Task.due_date.asc()).all()

    # Приоритетные из бэклога (без дедлайна, статус "К выполнению")
    backlog_priority = []
    if todo_status:
        backlog_priority = Task.query.filter(
            Task.status_id == todo_status.id,
            Task.due_date.is_(None)
        ).order_by(Task.created_at.desc()).limit(5).all()

    return {
        'next_week': [t.to_dict() for t in next_week_tasks],
        'backlog_priority': [t.to_dict() for t in backlog_priority]
    }


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

    # 5. БЛОКЕРЫ И РИСКИ
    blockers = get_blockers_and_risks()

    # 6. РАЗБИВКА ПО ПРОЕКТАМ
    project_breakdown = get_project_breakdown()

    # 7. НАГРУЗКА КОМАНДЫ
    team_workload = get_team_workload(date_from, date_to_end)

    # 8. ПЛАНЫ НА СЛЕДУЮЩУЮ НЕДЕЛЮ
    next_week_plans = get_next_week_plans(date_to)

    return {
        'date_range': f"{date_from.strftime('%d.%m.%Y')} - {date_to.strftime('%d.%m.%Y')}",
        'completed': [t.to_dict() for t in completed_tasks],
        'in_progress': [t.to_dict() for t in in_progress_tasks],
        'todo': [t.to_dict() for t in todo_tasks],
        'created': [t.to_dict() for t in created_tasks],
        'blockers': blockers,
        'project_breakdown': project_breakdown,
        'team_workload': team_workload,
        'next_week_plans': next_week_plans
    }
