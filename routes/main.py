from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)

# Роуты отдают index.html, а дальше JS (router.js) сам разбирается, какой блок показать.

@main_bp.route('/')
def index():
    return render_template('index.html')

@main_bp.route('/dashboard')
def dashboard():
    return render_template('index.html')

@main_bp.route('/contacts')
def contacts_page():
    return render_template('index.html')

@main_bp.route('/tasks')
def tasks_page():
    return render_template('index.html')

# --- НОВЫЕ РОУТЫ ---
@main_bp.route('/projects')
def projects_page():
    return render_template('index.html')

@main_bp.route('/kb')
def kb_page():
    return render_template('index.html')

@main_bp.route('/inbox')
def inbox_page():
    return render_template('index.html')

# Ловушка для детальных страниц
@main_bp.route('/projects/<path:subpath>')
def projects_detail_page(subpath):
    return render_template('index.html')

@main_bp.route('/contacts/<path:subpath>')
def contacts_detail_page(subpath):
    return render_template('index.html')

# NEW
@main_bp.route('/tasks/<path:subpath>')
def tasks_detail_page(subpath):
    return render_template('index.html')

# Meetings routes
@main_bp.route('/meetings')
def meetings_page():
    return render_template('index.html')

@main_bp.route('/meetings/<path:subpath>')
def meetings_detail_page(subpath):
    return render_template('index.html')

# Reports routes
@main_bp.route('/reports/weekly')
def reports_weekly_page():
    return render_template('index.html')