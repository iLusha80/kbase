from flask import Blueprint, jsonify, request
from services.dashboard_service import (
    get_priority_tasks,
    get_waiting_tasks,
    get_top_active_projects,
    get_favorite_contacts_list,
    global_search,
    get_recent_viewed,
    get_frequent_tags,
    get_recent_activity,
    get_daily_standup_data,
    get_one_on_one_prep_data
)
from services.validators import (
    validate, validation_error,
    VIEW_LOG_SCHEMA, QUICK_LINK_CREATE_SCHEMA, QUICK_LINK_UPDATE_SCHEMA
)
from core.models import QuickLink, ViewLog
from core.database import db

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    """Сводные данные для главной страницы"""

    priority = get_priority_tasks()
    waiting = get_waiting_tasks()
    projects = get_top_active_projects()
    favorites = get_favorite_contacts_list()
    links = QuickLink.query.order_by(QuickLink.created_at).all()

    projects_data = []
    for p in projects:
        p_dict = p.to_dict()
        active_count = sum(1 for t in p.tasks if t.status and t.status.name in ['В работе', 'К выполнению'])
        p_dict['active_work_count'] = active_count
        projects_data.append(p_dict)

    recent_viewed = get_recent_viewed()
    frequent_tags = get_frequent_tags()
    recent_activity = get_recent_activity()

    return jsonify({
        'priority_tasks': [t.to_dict() for t in priority],
        'waiting_tasks': [t.to_dict() for t in waiting],
        'top_projects': projects_data,
        'favorite_contacts': favorites,
        'quick_links': [l.to_dict() for l in links],
        'recent_viewed': recent_viewed,
        'frequent_tags': frequent_tags,
        'recent_activity': recent_activity
    })

@dashboard_bp.route('/views', methods=['POST'])
def log_view():
    """Логирование просмотра сущности (task, project, contact)"""
    data = request.json
    errors = validate(data, VIEW_LOG_SCHEMA)
    if errors:
        return validation_error(errors)

    view = ViewLog(entity_type=data['entity_type'], entity_id=int(data['entity_id']))
    db.session.add(view)
    db.session.commit()
    return jsonify({'ok': True}), 201

@dashboard_bp.route('/daily-standup', methods=['GET'])
def daily_standup():
    data = get_daily_standup_data()
    return jsonify(data)


@dashboard_bp.route('/one-on-one-prep', methods=['GET'])
def one_on_one_prep():
    data = get_one_on_one_prep_data()
    return jsonify(data)


@dashboard_bp.route('/search', methods=['GET'])
def search_route():
    query = request.args.get('q', '')
    results = global_search(query)
    return jsonify(results)

# --- QUICK LINKS CRUD ---

@dashboard_bp.route('/quick-links', methods=['POST'])
def add_quick_link():
    data = request.json
    errors = validate(data, QUICK_LINK_CREATE_SCHEMA)
    if errors:
        return validation_error(errors)

    link = QuickLink(
        title=data['title'],
        url=data['url'],
        icon=data.get('icon', 'link')
    )
    db.session.add(link)
    db.session.commit()
    return jsonify(link.to_dict()), 201

@dashboard_bp.route('/quick-links/<int:link_id>', methods=['PUT'])
def update_quick_link(link_id):
    link = QuickLink.query.get(link_id)
    if not link:
        return jsonify({'error': 'Not found'}), 404

    data = request.json
    errors = validate(data, QUICK_LINK_UPDATE_SCHEMA, partial=True)
    if errors:
        return validation_error(errors)

    link.title = data.get('title', link.title)
    link.url = data.get('url', link.url)
    link.icon = data.get('icon', link.icon)

    db.session.commit()
    return jsonify(link.to_dict())

@dashboard_bp.route('/quick-links/<int:link_id>', methods=['DELETE'])
def delete_quick_link(link_id):
    link = QuickLink.query.get(link_id)
    if not link:
        return jsonify({'error': 'Not found'}), 404

    db.session.delete(link)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200
