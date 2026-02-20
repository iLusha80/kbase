from flask import Blueprint, jsonify, request, Response
from services.export_service import (
    export_all_json, export_tasks_csv, export_contacts_csv, import_from_json
)
import json

export_bp = Blueprint('export', __name__)


@export_bp.route('/export/json', methods=['GET'])
def export_json():
    """Экспорт всех данных в JSON."""
    data = export_all_json()
    response = Response(
        json.dumps(data, ensure_ascii=False, indent=2),
        mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=kbase_export.json'}
    )
    return response


@export_bp.route('/export/tasks-csv', methods=['GET'])
def export_tasks():
    """Экспорт задач в CSV."""
    csv_data = export_tasks_csv()
    response = Response(
        '\ufeff' + csv_data,  # BOM для корректного открытия в Excel
        mimetype='text/csv; charset=utf-8',
        headers={'Content-Disposition': 'attachment; filename=kbase_tasks.csv'}
    )
    return response


@export_bp.route('/export/contacts-csv', methods=['GET'])
def export_contacts():
    """Экспорт контактов в CSV."""
    csv_data = export_contacts_csv()
    response = Response(
        '\ufeff' + csv_data,
        mimetype='text/csv; charset=utf-8',
        headers={'Content-Disposition': 'attachment; filename=kbase_contacts.csv'}
    )
    return response


@export_bp.route('/import/json', methods=['POST'])
def import_json():
    """Импорт данных из JSON."""
    if request.content_type and 'multipart/form-data' in request.content_type:
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided'}), 400
        try:
            data = json.loads(file.read().decode('utf-8'))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            return jsonify({'error': f'Invalid JSON: {str(e)}'}), 400
    else:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

    stats = import_from_json(data)
    return jsonify({'message': 'Import completed', 'stats': stats})
