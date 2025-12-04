from database import db

class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    last_name = db.Column(db.String(100), nullable=False)
    first_name = db.Column(db.String(100), nullable=True)
    middle_name = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100))
    role = db.Column(db.String(100))
    email = db.Column(db.String(100))
    phone = db.Column(db.String(50))
    link = db.Column(db.String(256))
    notes = db.Column(db.Text)

    def to_dict(self):
        return {
            'id': self.id,
            'last_name': self.last_name,
            'first_name': self.first_name,
            'middle_name': self.middle_name,
            'department': self.department,
            'role': self.role,
            'email': self.email,
            'phone': self.phone,
            'notes': self.notes
        }