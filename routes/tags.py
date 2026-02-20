from flask import Blueprint, request, jsonify
from services.tag_service import (
    get_all_tags, create_tag, get_tag_by_id, update_tag, delete_tag
)
from services.validators import (
    validate, validation_error,
    TAG_CREATE_SCHEMA, TAG_UPDATE_SCHEMA
)

tags_bp = Blueprint('tags', __name__)

@tags_bp.route('/tags', methods=['GET'])
def list_tags():
    tags = get_all_tags()
    return jsonify([tag.to_dict() for tag in tags])

@tags_bp.route('/tags', methods=['POST'])
def add_tag():
    data = request.json
    errors = validate(data, TAG_CREATE_SCHEMA)
    if errors:
        return validation_error(errors)

    tag = create_tag(data['name'])
    return jsonify(tag.to_dict()), 201

@tags_bp.route('/tags/<int:tag_id>', methods=['PUT'])
def update_tag_route(tag_id):
    data = request.json
    errors = validate(data, TAG_UPDATE_SCHEMA, partial=True)
    if errors:
        return validation_error(errors)

    tag = update_tag(tag_id, data.get('name'))
    if not tag:
        return jsonify({'error': 'Tag not found'}), 404
    return jsonify(tag.to_dict())

@tags_bp.route('/tags/<int:tag_id>', methods=['DELETE'])
def delete_tag_route(tag_id):
    if delete_tag(tag_id):
        return jsonify({'message': 'Tag deleted successfully'}), 200
    return jsonify({'error': 'Tag not found'}), 404
