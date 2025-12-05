import random
from datetime import datetime, timedelta, timezone
from app import app, db
from models import (
    Contact, ContactType, Tag, Project, ProjectContact, 
    Task, TaskStatus
)

def generate_data():
    with app.app_context():
        print("🧹 Очистка базы данных...")
        db.drop_all()
        db.create_all()
        print("✅ База пересоздана.")

        # --- 1. СПРАВОЧНИКИ (Типы и Статусы) ---
        print("📦 Создание справочников...")
        
        # Типы контактов
        ct_mgmt = ContactType(name_type='Руководство', render_color='#ef4444')
        ct_team = ContactType(name_type='Моя команда', render_color='#10b981')
        ct_client = ContactType(name_type='Контрагенты', render_color='#3b82f6')
        ct_other = ContactType(name_type='Другое', render_color='#94a3b8')
        db.session.add_all([ct_mgmt, ct_team, ct_client, ct_other])

        # Статусы задач
        st_todo = TaskStatus(name='К выполнению', color='#64748b')
        st_prog = TaskStatus(name='В работе', color='#f59e0b')
        st_wait = TaskStatus(name='Жду ответа', color='#8b5cf6')
        st_done = TaskStatus(name='Готово', color='#22c55e')
        db.session.add_all([st_todo, st_prog, st_wait, st_done])
        
        db.session.commit()

        # --- 2. ТЕГИ ---
        tags_list = ['frontend', 'backend', 'design', 'bug', 'urgent', 'marketing', 'docs', 'meeting']
        tags_objs = [Tag(name=t) for t in tags_list]
        db.session.add_all(tags_objs)
        db.session.commit()

        # --- 3. КОНТАКТЫ (7 шт) ---
        print("👥 Генерация 7 контактов...")
        contacts_data = [
            ('Иванов', 'Иван', 'Иванович', 'Генеральный директор', 'Администрация', ct_mgmt),
            ('Смирнова', 'Анна', 'Сергеевна', 'Project Manager', 'IT Отдел', ct_team),
            ('Петров', 'Петр', 'Петрович', 'Backend Lead', 'IT Отдел', ct_team),
            ('Сидоров', 'Алексей', None, 'Frontend Dev', 'IT Отдел', ct_team),
            ('Козлова', 'Мария', 'Вячеславовна', 'Дизайнер', 'Дизайн Бюро', ct_client),
            ('Кузнецов', 'Дмитрий', 'Олегович', 'Заказчик', 'ООО "Ромашка"', ct_client),
            ('Волков', 'Сергей', 'Андреевич', 'Системный администратор', 'IT Отдел', ct_other),
        ]

        contacts = []
        for i, (last, first, middle, role, dept, c_type) in enumerate(contacts_data):
            c = Contact(
                last_name=last,
                first_name=first,
                middle_name=middle,
                role=role,
                department=dept,
                type_id=c_type.id,
                email=f"user{i+1}@example.com",
                phone=f"+7 (999) 000-00-0{i+1}",
                notes=f"Автоматически сгенерированный контакт #{i+1}"
            )
            # Добавим пару случайных тегов
            c.tags = random.sample(tags_objs, k=random.randint(0, 2))
            contacts.append(c)
            db.session.add(c)
        
        db.session.commit()

        # --- 4. ПРОЕКТЫ (3 шт) ---
        print("💼 Генерация 3 проектов...")
        projects_data = [
            ('Редизайн корпоративного портала', 'Полное обновление UI/UX внутреннего портала компании.', 'Active'),
            ('Мобильное приложение "KBase"', 'Разработка нативного приложения под iOS и Android.', 'Active'),
            ('Маркетинговая кампания Q3', 'Подготовка рекламных материалов для осеннего сезона.', 'Active')
        ]

        projects = []
        for title, desc, status in projects_data:
            p = Project(title=title, description=desc, status=status)
            projects.append(p)
            db.session.add(p)
        
        db.session.commit()

        # Связываем людей с проектами (Команда)
        # 1. Редизайн (Анна - PM, Петр - Back, Мария - Design)
        db.session.add(ProjectContact(project=projects[0], contact=contacts[1], role='PM'))
        db.session.add(ProjectContact(project=projects[0], contact=contacts[2], role='Backend'))
        db.session.add(ProjectContact(project=projects[0], contact=contacts[4], role='UI/UX'))

        # 2. Мобилка (Иван - Куратор, Алексей - Dev)
        db.session.add(ProjectContact(project=projects[1], contact=contacts[0], role='Куратор'))
        db.session.add(ProjectContact(project=projects[1], contact=contacts[3], role='React Native Dev'))

        # 3. Маркетинг (Кузнецов - Заказчик, Смирнова - Менеджер)
        db.session.add(ProjectContact(project=projects[2], contact=contacts[5], role='Заказчик'))
        db.session.add(ProjectContact(project=projects[2], contact=contacts[1], role='Account Manager'))
        
        db.session.commit()

        # --- 5. ЗАДАЧИ (15 шт) ---
        print("✅ Генерация 15 задач...")
        task_titles = [
            "Собрать требования по проекту", "Нарисовать макет главной страницы", 
            "Настроить CI/CD pipeline", "Провести встречу с заказчиком", 
            "Исправить баг в авторизации", "Подготовить отчет за месяц",
            "Обновить документацию API", "Заказать лицензии на софт",
            "Интервью с новым кандидатом", "Рефакторинг модуля оплаты",
            "Согласовать бюджет", "Написать тесты для фронтенда",
            "Выложить релиз в прод", "Бэкап базы данных", "Купить кофе в офис"
        ]

        statuses = [st_todo, st_prog, st_wait, st_done]

        for i in range(15):
            # Случайные даты (от -5 дней до +14 дней)
            delta = random.randint(-5, 14)
            # ИСПОЛЬЗУЕМ timezone.utc вместо datetime.utcnow()
            due = datetime.now(timezone.utc).date() + timedelta(days=delta)
            
            # Случайные участники
            author = random.choice(contacts)
            assignee = random.choice(contacts)
            
            # С вероятностью 70% задача привязана к проекту
            proj = random.choice(projects) if random.random() > 0.3 else None
            
            t = Task(
                title=task_titles[i],
                description=f"Описание задачи '{task_titles[i]}'. Нужно сделать качественно.",
                due_date=due,
                status_id=random.choice(statuses).id,
                author_id=author.id,
                assignee_id=assignee.id,
                project_id=proj.id if proj else None
            )
            
            # Случайные теги
            t.tags = random.sample(tags_objs, k=random.randint(1, 3))
            
            db.session.add(t)

        db.session.commit()
        print("🚀 Готово! Тестовые данные успешно загружены.")

if __name__ == '__main__':
    generate_data()