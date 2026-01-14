from flask import Blueprint, jsonify, request
from services.report_service import get_weekly_report_data
from datetime import datetime

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports/weekly', methods=['GET'])
def weekly_report():
    try:
        # Получаем параметры дат из query string
        date_from = request.args.get('from')
        date_to = request.args.get('to')

        # Парсим даты если переданы
        parsed_from = None
        parsed_to = None

        if date_from:
            parsed_from = datetime.strptime(date_from, '%Y-%m-%d')
        if date_to:
            parsed_to = datetime.strptime(date_to, '%Y-%m-%d')

        data = get_weekly_report_data(date_from=parsed_from, date_to=parsed_to)
        return jsonify(data)
    except Exception as e:
        print(f"Error generating report: {e}")
        return jsonify({'error': str(e)}), 500
