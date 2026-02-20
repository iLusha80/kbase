"""
Скрипт наполнения тестовыми данными.
Запуск: python scripts/seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import date, datetime, time, timedelta
from app import app, init_db
from core.database import db
from core.models import (
    Contact, ContactType, Tag, Project, ProjectContact,
    Task, TaskStatus, TaskComment, QuickLink,
    FavoriteContact, ActivityLog, ViewLog,
    Meeting, MeetingType, MeetingNote, MeetingActionItem
)


def seed():
    # Убедимся что директория instance существует
    instance_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance')
    os.makedirs(instance_dir, exist_ok=True)

    with app.app_context():
        init_db()

        # Проверяем, есть ли уже данные
        if Task.query.count() > 0:
            print('[seed] Данные уже есть. Пропускаем.')
            return

        today = date.today()
        now = datetime.now()

        # --- Теги ---
        tag_names = ['срочно', 'BI', 'аналитика', 'отчёт', 'автоматизация', 'миграция', 'дашборд', 'ETL', 'SQL', 'Python']
        tags = {}
        for name in tag_names:
            t = Tag(name=name)
            db.session.add(t)
            tags[name] = t
        db.session.flush()
        print(f'[seed] Теги: {len(tags)}')

        # --- Типы контактов уже созданы в init_db ---
        ct_lead = ContactType.query.filter_by(name_type='Руководство').first()
        ct_team = ContactType.query.filter_by(name_type='Моя команда').first()
        ct_ext = ContactType.query.filter_by(name_type='Контрагенты').first()
        ct_other = ContactType.query.filter_by(name_type='Другое').first()

        # --- Контакты ---
        contacts_data = [
            {'last_name': 'Петров', 'first_name': 'Алексей', 'role': 'Директор департамента', 'department': 'IT', 'type': ct_lead, 'email': 'petrov@bank.ru'},
            {'last_name': 'Сидорова', 'first_name': 'Мария', 'role': 'Руководитель проектов', 'department': 'PMO', 'type': ct_lead, 'email': 'sidorova@bank.ru'},
            {'last_name': 'Иванов', 'first_name': 'Дмитрий', 'role': 'BI-аналитик', 'department': 'BI-аналитика', 'type': ct_team, 'email': 'ivanov@bank.ru'},
            {'last_name': 'Козлова', 'first_name': 'Анна', 'role': 'Data Engineer', 'department': 'BI-аналитика', 'type': ct_team, 'email': 'kozlova@bank.ru'},
            {'last_name': 'Новиков', 'first_name': 'Сергей', 'role': 'BI-аналитик', 'department': 'BI-аналитика', 'type': ct_team, 'email': 'novikov@bank.ru'},
            {'last_name': 'Волков', 'first_name': 'Игорь', 'role': 'Архитектор данных', 'department': 'IT', 'type': ct_other, 'email': 'volkov@bank.ru'},
            {'last_name': 'Белова', 'first_name': 'Елена', 'role': 'Менеджер', 'department': 'Розничный бизнес', 'type': ct_ext, 'email': 'belova@bank.ru'},
        ]
        contacts = []
        for cd in contacts_data:
            c = Contact(
                last_name=cd['last_name'], first_name=cd['first_name'],
                role=cd['role'], department=cd['department'],
                type_id=cd['type'].id, email=cd['email']
            )
            c.tags.append(tags['BI'])
            db.session.add(c)
            contacts.append(c)
        db.session.flush()
        print(f'[seed] Контакты: {len(contacts)}')

        # Избранные
        for c in contacts[:3]:
            db.session.add(FavoriteContact(contact_id=c.id))

        # --- Проекты ---
        projects_data = [
            {'title': 'Миграция DWH на Greenplum', 'description': 'Перенос хранилища данных с Oracle на Greenplum. Включает ETL-пайплайны, витрины, тестирование.', 'status': 'Active'},
            {'title': 'Дашборд для ТОП-менеджмента', 'description': 'Интерактивный дашборд с ключевыми метриками банка. Power BI + кастомные витрины.', 'status': 'Active'},
            {'title': 'Автоматизация отчётности ЦБ', 'description': 'Автоматический сбор и формирование регуляторной отчётности. Python + Airflow.', 'status': 'Active'},
            {'title': 'ML-модель оттока клиентов', 'description': 'Предиктивная модель оттока розничных клиентов. Feature engineering + XGBoost.', 'status': 'Planning'},
        ]
        projects = []
        for pd in projects_data:
            p = Project(title=pd['title'], description=pd['description'], status=pd['status'])
            db.session.add(p)
            projects.append(p)
        db.session.flush()

        # Участники проектов
        db.session.add(ProjectContact(project_id=projects[0].id, contact_id=contacts[3].id, role='Data Engineer'))
        db.session.add(ProjectContact(project_id=projects[0].id, contact_id=contacts[5].id, role='Архитектор'))
        db.session.add(ProjectContact(project_id=projects[1].id, contact_id=contacts[2].id, role='Аналитик'))
        db.session.add(ProjectContact(project_id=projects[1].id, contact_id=contacts[4].id, role='Разработчик'))
        db.session.add(ProjectContact(project_id=projects[2].id, contact_id=contacts[3].id, role='Разработчик'))
        print(f'[seed] Проекты: {len(projects)}')

        # --- Статусы задач ---
        st_todo = TaskStatus.query.filter_by(name='К выполнению').first()
        st_work = TaskStatus.query.filter_by(name='В работе').first()
        st_wait = TaskStatus.query.filter_by(name='Жду ответа').first()
        st_done = TaskStatus.query.filter_by(name='Готово').first()

        # --- Задачи ---
        tasks_data = [
            # В работе
            {'title': 'Настроить ETL-пайплайн для таблицы transactions', 'status': st_work, 'project': projects[0], 'assignee': contacts[3], 'author': contacts[0], 'due': today + timedelta(days=2), 'tags': ['ETL', 'миграция']},
            {'title': 'Ревью SQL-витрины client_balance', 'status': st_work, 'project': projects[0], 'assignee': contacts[2], 'due': today, 'tags': ['SQL', 'аналитика']},
            {'title': 'Макет главной страницы дашборда', 'status': st_work, 'project': projects[1], 'assignee': contacts[4], 'due': today + timedelta(days=1), 'tags': ['дашборд']},

            # К выполнению
            {'title': 'Подготовить ТЗ на витрину для ТОП-дашборда', 'status': st_todo, 'project': projects[1], 'assignee': contacts[2], 'author': contacts[1], 'due': today + timedelta(days=3), 'tags': ['аналитика', 'дашборд']},
            {'title': 'Написать скрипт валидации данных после миграции', 'status': st_todo, 'project': projects[0], 'assignee': contacts[3], 'due': today + timedelta(days=5), 'tags': ['Python', 'миграция']},
            {'title': 'Согласовать формат отчёта 0409123 с ЦБ', 'status': st_todo, 'project': projects[2], 'due': today, 'tags': ['отчёт']},

            # Жду ответа
            {'title': 'Ждём доступ к Greenplum staging', 'status': st_wait, 'project': projects[0], 'assignee': contacts[5], 'author': contacts[0], 'due': today - timedelta(days=1), 'tags': ['миграция']},
            {'title': 'Запрос на расширение лицензий Power BI', 'status': st_wait, 'project': projects[1], 'assignee': contacts[1], 'due': today - timedelta(days=3), 'tags': ['дашборд']},

            # Просроченные
            {'title': 'Обновить документацию DWH-схемы', 'status': st_todo, 'project': projects[0], 'due': today - timedelta(days=5), 'tags': ['миграция']},
            {'title': 'Провести ретро по спринту 12', 'status': st_todo, 'due': today - timedelta(days=2), 'tags': ['срочно']},

            # Готово (недавно)
            {'title': 'Развернуть Airflow на dev-сервере', 'status': st_done, 'project': projects[2], 'assignee': contacts[3], 'tags': ['автоматизация', 'ETL']},
            {'title': 'Подготовить презентацию для стиркома', 'status': st_done, 'author': contacts[0], 'tags': ['отчёт']},
            {'title': 'Фикс бага в расчёте NPS', 'status': st_done, 'project': projects[1], 'assignee': contacts[4], 'tags': ['дашборд', 'Python']},
        ]

        tasks = []
        for td in tasks_data:
            t = Task(
                title=td['title'],
                status_id=td['status'].id,
                project_id=td.get('project', None) and td['project'].id,
                assignee_id=td.get('assignee', None) and td['assignee'].id,
                author_id=td.get('author', None) and td['author'].id,
                due_date=td.get('due'),
            )
            for tag_name in td.get('tags', []):
                t.tags.append(tags[tag_name])
            db.session.add(t)
            tasks.append(t)
        db.session.flush()
        print(f'[seed] Задачи: {len(tasks)}')

        # Комментарии к задачам
        db.session.add(TaskComment(task_id=tasks[0].id, text='Начал настройку, нужен доступ к staging'))
        db.session.add(TaskComment(task_id=tasks[0].id, text='Доступ получен, продолжаю'))
        db.session.add(TaskComment(task_id=tasks[6].id, text='Отправил запрос Волкову'))

        # ActivityLog для "Готово" задач (чтобы Daily Standup их подхватил)
        for t in tasks[-3:]:
            db.session.add(ActivityLog(
                entity_type='task', entity_id=t.id,
                event_type='update', field_name='status',
                old_value='В работе', new_value='Готово',
                created_at=now - timedelta(hours=3)
            ))

        # ViewLog
        for t in tasks[:5]:
            db.session.add(ViewLog(entity_type='task', entity_id=t.id, viewed_at=now - timedelta(hours=1)))
        for p in projects[:2]:
            db.session.add(ViewLog(entity_type='project', entity_id=p.id, viewed_at=now - timedelta(minutes=30)))
        for c in contacts[:2]:
            db.session.add(ViewLog(entity_type='contact', entity_id=c.id, viewed_at=now - timedelta(minutes=45)))

        # --- Quick Links ---
        links = [
            {'title': 'Confluence', 'url': 'https://confluence.bank.ru', 'icon': 'book-open'},
            {'title': 'Jira', 'url': 'https://jira.bank.ru', 'icon': 'layout-dashboard'},
            {'title': 'Greenplum UI', 'url': 'https://gp.bank.ru', 'icon': 'database'},
            {'title': 'Airflow', 'url': 'https://airflow.bank.ru', 'icon': 'workflow'},
        ]
        for l in links:
            db.session.add(QuickLink(title=l['title'], url=l['url'], icon=l['icon']))

        # --- Встречи ---
        mt_daily = MeetingType.query.filter_by(name='Дейлик').first()
        mt_1on1 = MeetingType.query.filter_by(name='1-1').first()
        mt_weekly = MeetingType.query.filter_by(name='Еженедельник').first()

        # Встреча сегодня
        m1 = Meeting(
            title='Дейлик команды BI', date=today, time=time(10, 0),
            type_id=mt_daily.id, project_id=projects[0].id,
            status='planned', agenda='1. Статус миграции\n2. Блокеры\n3. План на сегодня'
        )
        m1.participants.extend([contacts[2], contacts[3], contacts[4]])
        db.session.add(m1)

        m2 = Meeting(
            title='1-1 с Петровым', date=today, time=time(14, 0),
            type_id=mt_1on1.id, status='planned',
            agenda='1. Прогресс по проектам\n2. Запрос ресурсов\n3. Планы'
        )
        m2.participants.append(contacts[0])
        db.session.add(m2)

        # Вчерашняя встреча (завершена)
        m3 = Meeting(
            title='Еженедельник отдела', date=today - timedelta(days=1), time=time(11, 0),
            type_id=mt_weekly.id, status='completed',
            started_at=now - timedelta(days=1, hours=2),
            ended_at=now - timedelta(days=1, hours=1),
            summary='Обсудили прогресс миграции. Решили ускорить тестирование.'
        )
        m3.participants.extend([contacts[0], contacts[2], contacts[3], contacts[4]])
        db.session.add(m3)
        db.session.flush()

        # Заметки к вчерашней встрече
        notes = [
            'Миграция transactions завершена на 70%',
            'Нужно решить вопрос с лицензиями Power BI до конца недели',
            'Козлова предложила добавить автотесты для ETL',
            'Следующий релиз дашборда — через 2 недели',
        ]
        for text in notes:
            db.session.add(MeetingNote(meeting_id=m3.id, text=text, source='manual'))

        # Action items
        db.session.add(MeetingActionItem(meeting_id=m3.id, text='Ускорить тестирование миграции', assignee_id=contacts[3].id))
        db.session.add(MeetingActionItem(meeting_id=m3.id, text='Эскалировать вопрос лицензий', assignee_id=contacts[1].id, is_done=True))

        db.session.commit()
        print('[seed] Готово! Тестовые данные загружены.')


if __name__ == '__main__':
    seed()
