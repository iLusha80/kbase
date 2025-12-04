import os
from flask import Flask, render_template, request, jsonify
from database import db
from models import Contact

app = Flask(__name__)
# База данных
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///kbase.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()


# --- ROUTES ---
@app.route('/')
def index():
    # Мы отдаем один файл, вся логика переключения страниц внутри JS
    return render_template('index.html')


# --- API ---
@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    contacts = Contact.query.order_by(Contact.name).all()
    return jsonify([c.to_dict() for c in contacts])


@app.route('/api/contacts', methods=['POST'])
def add_contact():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400

    # Если передан ID, значит это редактирование (пока упростим до создания)
    # В идеале нужно добавить PUT метод для update

    new_contact = Contact(
        name=data.get('name'),
        department=data.get('department'),
        role=data.get('role'),
        email=data.get('email'),
        phone=data.get('phone'),
        notes=data.get('notes')
    )

    try:
        db.session.add(new_contact)
        db.session.commit()
        return jsonify(new_contact.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Запуск на всех интерфейсах (удобно для локалки)
    app.run(debug=True, host='0.0.0.0', port=5001)
