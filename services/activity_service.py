from core.database import db
from core.models import ActivityLog

def log_change(entity_type, entity_id, field_name, old_val, new_val):
    """
    Записывает изменение поля.
    Если старое и новое значение равны или оба пустые - ничего не пишет.
    """
    # Приводим к строке для сравнения, обрабатываем None
    s_old = str(old_val) if old_val is not None else ""
    s_new = str(new_val) if new_val is not None else ""

    if s_old == s_new:
        return

    log = ActivityLog(
        entity_type=entity_type,
        entity_id=entity_id,
        event_type='update',
        field_name=field_name,
        old_value=s_old,
        new_value=s_new
    )
    db.session.add(log)
    # Commit не делаем, так как этот метод будет вызываться внутри транзакции обновления задачи
    
def get_activity_log(entity_type, entity_id):
    return ActivityLog.query.filter_by(entity_type=entity_type, entity_id=entity_id)\
        .order_by(ActivityLog.created_at.desc()).all()
