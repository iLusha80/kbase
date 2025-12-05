from flask import Blueprint, request, jsonify
from services.project_service import (
    get_all_projects, create_project, get_project_by_id, update_project, delete_project
)

projects_bp = Blueprint('projects', __name__)

@projects_bp.route('/projects', methods=['GET'])
def list_projects():
    projects = get_all_projects()
    return jsonify([p.to_dict() for p in projects])

@projects_bp.route('/projects/<int:project_id>', methods=['GET'])
def get_project_detail(project_id):
    p = get_project_by_id(project_id)
    if not p:
        return jsonify({'error': 'Project not found'}), 404
    
    # Дополнительно вернем задачи этого проекта для детального вида
    data = p.to_dict()
    data['tasks_list'] = [t.to_dict() for t in p.tasks]
    return jsonify(data)

@projects_bp.route('/projects', methods=['POST'])
def add_project():
    data = request.json
    try:
        p = create_project(data)
        return jsonify(p.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@projects_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project_route(project_id):
    data = request.json
    p = update_project(project_id, data)
    if not p:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(p.to_dict())

@projects_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project_route(project_id):
    if delete_project(project_id):
        return jsonify({'message': 'Deleted'}), 200
    return jsonify({'error': 'Not found'}), 404
