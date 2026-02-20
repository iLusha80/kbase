from flask import Blueprint, request, jsonify
from services.contact_service import (
    get_all_contacts, create_contact, get_contact_by_id, update_contact,
    delete_contact, get_contact_types, get_contact_full_details,
    toggle_favorite_status,
    set_self, unset_self, get_self_contact, toggle_team, get_team_contacts,
)

contacts_bp = Blueprint('contacts', __name__)

@contacts_bp.route('/contact-types', methods=['GET'])
def list_contact_types():
    types = get_contact_types()
    return jsonify([t.to_dict() for t in types])

@contacts_bp.route('/contacts', methods=['GET'])
def list_contacts():
    contacts = get_all_contacts()
    return jsonify([c.to_dict() for c in contacts])

# --- SELF / TEAM (до <int:contact_id> чтобы Flask не перепутал) ---
@contacts_bp.route('/contacts/self', methods=['GET'])
def get_self_route():
    c = get_self_contact()
    if not c:
        return jsonify(None), 200
    return jsonify(c.to_dict())

@contacts_bp.route('/contacts/team', methods=['GET'])
def get_team_route():
    contacts = get_team_contacts()
    return jsonify([c.to_dict() for c in contacts])

@contacts_bp.route('/contacts/<int:contact_id>', methods=['GET'])
def get_contact_detail(contact_id):
    contact_data = get_contact_full_details(contact_id)
    if not contact_data:
        return jsonify({'error': 'Contact not found'}), 404
    return jsonify(contact_data)

@contacts_bp.route('/contacts', methods=['POST'])
def add_contact():
    data = request.json
    if not data or not data.get('last_name'):
        return jsonify({'error': 'Last name is required'}), 400
    
    try:
        contact = create_contact(data)
        return jsonify(contact.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@contacts_bp.route('/contacts/<int:contact_id>', methods=['PUT'])
def update_contact_route(contact_id):
    data = request.json
    contact = update_contact(contact_id, data)
    if not contact:
        return jsonify({'error': 'Contact not found'}), 404
    return jsonify(contact.to_dict())

@contacts_bp.route('/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact_route(contact_id):
    if delete_contact(contact_id):
        return jsonify({'message': 'Contact deleted successfully'}), 200
    return jsonify({'error': 'Contact not found'}), 404

# --- NEW: TOGGLE FAVORITE ---
@contacts_bp.route('/contacts/<int:contact_id>/favorite', methods=['POST'])
def toggle_favorite_route(contact_id):
    is_fav = toggle_favorite_status(contact_id)
    return jsonify({'is_favorite': is_fav}), 200

@contacts_bp.route('/contacts/<int:contact_id>/set-self', methods=['POST'])
def set_self_route(contact_id):
    c = set_self(contact_id)
    if not c:
        return jsonify({'error': 'Contact not found'}), 404
    return jsonify(c.to_dict())

@contacts_bp.route('/contacts/<int:contact_id>/unset-self', methods=['POST'])
def unset_self_route(contact_id):
    c = unset_self(contact_id)
    if not c:
        return jsonify({'error': 'Contact not found'}), 404
    return jsonify(c.to_dict())

@contacts_bp.route('/contacts/<int:contact_id>/toggle-team', methods=['POST'])
def toggle_team_route(contact_id):
    result = toggle_team(contact_id)
    if result is None:
        return jsonify({'error': 'Contact not found'}), 404
    return jsonify({'is_team': result})