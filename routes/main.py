from flask import Blueprint, render_template

main_bp = Blueprint('main', __name__)

# Все эти роуты должны отдавать главную страницу (SPA shell).
# Данные подгружаются через API (JSON) скриптом api.js, а не рендерятся тут.

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