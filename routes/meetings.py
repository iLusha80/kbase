from flask import Blueprint, request, jsonify
from services.meeting_service import (
    get_all_meetings, get_meeting_full_details, create_meeting,
    update_meeting, delete_meeting, get_meeting_types,
    add_action_item, update_action_item, delete_action_item,
    convert_action_item_to_task, get_upcoming_meetings,
    add_note, update_note, delete_note, convert_note_to_task,
    get_meeting_by_id
)

meetings_bp = Blueprint('meetings', __name__)


@meetings_bp.route('/meeting-types', methods=['GET'])
def list_meeting_types():
    types = get_meeting_types()
    return jsonify([t.to_dict() for t in types])


@meetings_bp.route('/meetings', methods=['GET'])
def list_meetings():
    meetings = get_all_meetings()
    return jsonify([m.to_dict() for m in meetings])


@meetings_bp.route('/meetings/upcoming', methods=['GET'])
def upcoming_meetings():
    days = request.args.get('days', 7, type=int)
    meetings = get_upcoming_meetings(days)
    return jsonify([m.to_dict() for m in meetings])


@meetings_bp.route('/meetings/<int:meeting_id>', methods=['GET'])
def get_meeting_detail(meeting_id):
    meeting = get_meeting_full_details(meeting_id)
    if not meeting:
        return jsonify({'error': 'Meeting not found'}), 404
    return jsonify(meeting)


@meetings_bp.route('/meetings', methods=['POST'])
def add_meeting():
    data = request.json
    if data is None:
        return jsonify({'error': 'No data provided'}), 400

    try:
        meeting = create_meeting(data)
        return jsonify(meeting.to_dict()), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@meetings_bp.route('/meetings/<int:meeting_id>', methods=['PUT'])
def update_meeting_route(meeting_id):
    data = request.json
    meeting = update_meeting(meeting_id, data)
    if not meeting:
        return jsonify({'error': 'Meeting not found'}), 404
    return jsonify(meeting.to_dict())


@meetings_bp.route('/meetings/<int:meeting_id>', methods=['DELETE'])
def delete_meeting_route(meeting_id):
    if delete_meeting(meeting_id):
        return jsonify({'message': 'Meeting deleted successfully'}), 200
    return jsonify({'error': 'Meeting not found'}), 404


# --- Meeting Notes ---

@meetings_bp.route('/meetings/<int:meeting_id>/notes', methods=['POST'])
def add_meeting_note(meeting_id):
    data = request.json
    note = add_note(meeting_id, data)
    if not note:
        return jsonify({'error': 'Failed to add note'}), 400
    return jsonify(note.to_dict()), 201


@meetings_bp.route('/meetings/<int:meeting_id>/notes/<int:note_id>', methods=['PUT'])
def update_meeting_note(meeting_id, note_id):
    data = request.json
    note = update_note(note_id, data)
    if not note:
        return jsonify({'error': 'Note not found'}), 404
    return jsonify(note.to_dict())


@meetings_bp.route('/meetings/<int:meeting_id>/notes/<int:note_id>', methods=['DELETE'])
def delete_meeting_note(meeting_id, note_id):
    if delete_note(note_id):
        return jsonify({'message': 'Deleted'}), 200
    return jsonify({'error': 'Not found'}), 404


@meetings_bp.route('/meetings/<int:meeting_id>/notes/<int:note_id>/convert', methods=['POST'])
def convert_note(meeting_id, note_id):
    task = convert_note_to_task(note_id)
    if not task:
        return jsonify({'error': 'Note not found'}), 404
    return jsonify(task.to_dict()), 201


# --- Action Items (backward compat) ---

@meetings_bp.route('/meetings/<int:meeting_id>/analyze', methods=['POST'])
def analyze_meeting(meeting_id):
    meeting = get_meeting_by_id(meeting_id)
    if not meeting:
        return jsonify({'error': 'Meeting not found'}), 404

    notes = meeting.meeting_notes
    if not notes:
        return jsonify({'error': 'Нет заметок для анализа'}), 400

    notes_text = '\n'.join([f'- {n.text}' for n in notes])

    try:
        from services.llm_service import analyze_meeting_notes
        result = analyze_meeting_notes(notes_text, meeting.title)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@meetings_bp.route('/meetings/<int:meeting_id>/action-items', methods=['POST'])
def add_meeting_action_item(meeting_id):
    data = request.json
    ai = add_action_item(meeting_id, data)
    if not ai:
        return jsonify({'error': 'Failed to add action item'}), 400
    return jsonify(ai.to_dict()), 201


@meetings_bp.route('/meetings/<int:meeting_id>/action-items/<int:item_id>', methods=['PUT'])
def update_meeting_action_item(meeting_id, item_id):
    data = request.json
    ai = update_action_item(item_id, data)
    if not ai:
        return jsonify({'error': 'Action item not found'}), 404
    return jsonify(ai.to_dict())


@meetings_bp.route('/meetings/<int:meeting_id>/action-items/<int:item_id>', methods=['DELETE'])
def delete_meeting_action_item(meeting_id, item_id):
    if delete_action_item(item_id):
        return jsonify({'message': 'Deleted'}), 200
    return jsonify({'error': 'Not found'}), 404


@meetings_bp.route('/meetings/<int:meeting_id>/action-items/<int:item_id>/convert', methods=['POST'])
def convert_action_item(meeting_id, item_id):
    task = convert_action_item_to_task(item_id)
    if not task:
        return jsonify({'error': 'Action item not found'}), 404
    return jsonify(task.to_dict()), 201
