import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///kbase.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # LLM Gateway (для AI-анализа встреч)
    LLM_GATEWAY_URL = os.environ.get('LLM_GATEWAY_URL', 'http://localhost:8000')
    LLM_GATEWAY_SECRET = os.environ.get('LLM_GATEWAY_SECRET', '')