from flask import Blueprint, request, jsonify
from services.task_service import (
    get_all_tasks, create_task, get_task_by_id,
    update_task, delete_task, update_task_status, get_task_statuses,
    get_task_full_details, add_comment_to_task, delete_comment
)
from services.validators import (
    validate, validation_error,
    TASK_CREATE_SCHEMA, TASK_UPDATE_SCHEMA, TASK_COMMENT_SCHEMA
)

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/task-statuses', methods=['GET'])
def list_task_statuses():
    statuses = get_task_statuses()
    return jsonify([s.to_dict() for s in statuses])

@tasks_bp.route('/tasks', methods=['GET'])
def list_tasks():
    tasks = get_all_tasks()
    return jsonify([t.to_dict() for t in tasks])

@tasks_bp.route('/tasks/<int:task_id>', methods=['GET'])
def get_task_detail(task_id):
    task = get_task_full_details(task_id)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task)

@tasks_bp.route('/tasks', methods=['POST'])
def add_task():
    data = request.json
    errors = validate(data, TASK_CREATE_SCHEMA)
    if errors:
        return validation_error(errors)

    try:
        task = create_task(data)
        return jsonify(task.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task_route(task_id):
    data = request.json
    errors = validate(data, TASK_UPDATE_SCHEMA, partial=True)
    if errors:
        return validation_error(errors)

    task = update_task(task_id, data)
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    return jsonify(task.to_dict())

@tasks_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task_route(task_id):
    if delete_task(task_id):
        return jsonify({'message': 'Task deleted successfully'}), 200
    return jsonify({'error': 'Task not found'}), 404


@tasks_bp.route('/tasks/<int:task_id>/comments', methods=['POST'])
def add_task_comment(task_id):
    data = request.json
    errors = validate(data, TASK_COMMENT_SCHEMA)
    if errors:
        return validation_error(errors)

    comment = add_comment_to_task(task_id, data.get('text'))
    if not comment:
        return jsonify({'error': 'Задача не найдена'}), 404

    return jsonify(comment.to_dict()), 201

@tasks_bp.route('/comments/<int:comment_id>', methods=['DELETE'])
def delete_task_comment(comment_id):
    if delete_comment(comment_id):
        return jsonify({'message': 'Deleted'}), 200
    return jsonify({'error': 'Not found'}), 404
