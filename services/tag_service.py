from database import db
from models import Tag

def process_tags(tag_names):
    """Принимает список строк тегов, возвращает список объектов Tag"""
    if not tag_names:
        return []
    
    result_tags = []
    for name in tag_names:
        clean_name = name.strip().lower()
        if not clean_name:
            continue
            
        tag = Tag.query.filter_by(name=clean_name).first()
        if not tag:
            tag = Tag(name=clean_name)
            db.session.add(tag)
        result_tags.append(tag)
    
    return result_tags

def get_all_tags():
    """Возвращает все теги, отсортированные по имени."""
    return Tag.query.order_by(Tag.name).all()

def create_tag(name):
    tag = Tag(name=name)
    db.session.add(tag)
    db.session.commit()
    return tag

def get_tag_by_id(tag_id):
    return Tag.query.get(tag_id)


def update_tag(tag_id, name):
    tag = get_tag_by_id(tag_id)
    if not tag:
        return None
    tag.name = name
    db.session.commit()
    return tag

def delete_tag(tag_id):
    tag = get_tag_by_id(tag_id)
    if not tag:
        return False
    db.session.delete(tag)
    db.session.commit()
    return True