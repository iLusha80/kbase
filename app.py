import os
from flask import Flask, render_template, request, jsonify
from database import db
from models import Contact

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///kbase.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

# --- ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/contacts')
def contacts_page():
    return render_template('index.html')

# --- API ---
@app.route('/api/contacts', methods=['GET'])
def get_contacts():
    contacts = Contact.query.order_by(Contact.last_name, Contact.first_name).all()
    return jsonify([c.to_dict() for c in contacts])

@app.route('/api/contacts', methods=['POST'])
def add_contact():
    data = request.json
    if not data or not data.get('last_name'):
        return jsonify({'error': 'Last name is required'}), 400

    new_contact = Contact(
        last_name=data.get('last_name'),
        first_name=data.get('first_name'),
        middle_name=data.get('middle_name'),
        department=data.get('department'),
        role=data.get('role'),
        email=data.get('email'),
        phone=data.get('phone'),
        link=data.get('link'),
        notes=data.get('notes')
    )

    try:
        db.session.add(new_contact)
        db.session.commit()
        return jsonify(new_contact.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts/<int:id>', methods=['PUT'])
def update_contact(id):
    data = request.json
    contact = Contact.query.get(id)
    
    if not contact:
        return jsonify({'error': 'Contact not found'}), 404

    try:
        contact.last_name = data.get('last_name', contact.last_name)
        contact.first_name = data.get('first_name', contact.first_name)
        contact.middle_name = data.get('middle_name', contact.middle_name)
        contact.department = data.get('department', contact.department)
        contact.role = data.get('role', contact.role)
        contact.email = data.get('email', contact.email)
        contact.phone = data.get('phone', contact.phone)
        contact.link = data.get('link', contact.link)
        contact.notes = data.get('notes', contact.notes)
        
        db.session.commit()
        return jsonify(contact.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/contacts/<int:id>', methods=['DELETE'])
def delete_contact(id):
    contact = Contact.query.get(id)
    if not contact:
        return jsonify({'error': 'Contact not found'}), 404
        
    try:
        db.session.delete(contact)
        db.session.commit()
        return jsonify({'message': 'Deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)