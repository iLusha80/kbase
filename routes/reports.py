from flask import Blueprint, jsonify
from services.report_service import get_weekly_report_data

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/reports/weekly', methods=['GET'])
def weekly_report():
    try:
        data = get_weekly_report_data()
        return jsonify(data)
    except Exception as e:
        print(f"Error generating report: {e}")
        return jsonify({'error': str(e)}), 500
