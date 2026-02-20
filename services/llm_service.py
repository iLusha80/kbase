import json
import requests
from flask import current_app


def analyze_meeting_notes(notes_text, meeting_title=None):
    """Отправляет заметки встречи в LLM Gateway для анализа.

    Returns dict with keys: summary, tasks, decisions, questions
    """
    gateway_url = current_app.config.get('LLM_GATEWAY_URL', 'http://localhost:8000')
    gateway_secret = current_app.config.get('LLM_GATEWAY_SECRET', '')

    prompt = f"""Ты — ассистент руководителя отдела BI-аналитики.
Проанализируй заметки со встречи и выдели:
1. Краткий итог (2-3 предложения)
2. Задачи (формулировки для таск-трекера, начинающиеся с глагола)
3. Ключевые решения
4. Открытые вопросы

Ответь строго в формате JSON:
{{
  "summary": "краткий итог",
  "tasks": ["задача 1", "задача 2"],
  "decisions": ["решение 1"],
  "questions": ["вопрос 1"]
}}

{f'Встреча: {meeting_title}' if meeting_title else ''}
Заметки:
{notes_text}"""

    headers = {'Content-Type': 'application/json'}
    if gateway_secret:
        headers['Authorization'] = f'Bearer {gateway_secret}'

    try:
        response = requests.post(
            f'{gateway_url}/v1/chat',
            headers=headers,
            json={
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.3
            },
            timeout=30
        )
        response.raise_for_status()

        data = response.json()

        # Извлекаем текст ответа (формат может варьироваться)
        content = ''
        if 'choices' in data and data['choices']:
            content = data['choices'][0].get('message', {}).get('content', '')
        elif 'content' in data:
            content = data['content']
        elif 'response' in data:
            content = data['response']

        # Парсим JSON из ответа
        return _parse_llm_response(content)

    except requests.exceptions.ConnectionError:
        raise Exception('LLM Gateway недоступен. Убедитесь, что сервис запущен.')
    except requests.exceptions.Timeout:
        raise Exception('Таймаут запроса к LLM Gateway')
    except Exception as e:
        raise Exception(f'Ошибка при анализе: {str(e)}')


def _parse_llm_response(text):
    """Парсит JSON из ответа LLM (может содержать markdown code blocks)."""
    # Убираем markdown code blocks
    cleaned = text.strip()
    if cleaned.startswith('```json'):
        cleaned = cleaned[7:]
    elif cleaned.startswith('```'):
        cleaned = cleaned[3:]
    if cleaned.endswith('```'):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        result = json.loads(cleaned)
        return {
            'summary': result.get('summary', ''),
            'tasks': result.get('tasks', []),
            'decisions': result.get('decisions', []),
            'questions': result.get('questions', [])
        }
    except json.JSONDecodeError:
        # Если LLM вернул не JSON, пробуем извлечь хоть что-то
        return {
            'summary': cleaned[:500] if cleaned else 'Не удалось разобрать ответ',
            'tasks': [],
            'decisions': [],
            'questions': []
        }
