from flask import Blueprint, jsonify, request
from services.dashboard_service import (
    get_priority_tasks, 
    get_waiting_tasks, 
    get_top_active_projects,
    get_favorite_contacts_list,
    global_search
)
from core.models import QuickLink
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

    return jsonify({
        'priority_tasks': [t.to_dict() for t in priority],
        'waiting_tasks': [t.to_dict() for t in waiting],
        'top_projects': projects_data,
        'favorite_contacts': favorites,
        'quick_links': [l.to_dict() for l in links]
    })

@dashboard_bp.route('/search', methods=['GET'])
def search_route():
    query = request.args.get('q', '')
    results = global_search(query)
    return jsonify(results)

# --- QUICK LINKS CRUD ---

@dashboard_bp.route('/quick-links', methods=['POST'])
def add_quick_link():
    data = request.json
    if not data.get('title') or not data.get('url'):
        return jsonify({'error': 'Title and URL required'}), 400
    
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