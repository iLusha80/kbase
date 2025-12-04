import os

# Имя выходного файла
OUTPUT_FILE = "all_project_code.txt"

# Папки, которые нужно ИГНОРИРОВАТЬ
IGNORE_DIRS = {
    '.venv', '.git', '__pycache__', 'node_modules',
    '.idea', 'instance', 'dist', 'build', 'coverage'
}

# Расширения файлов, которые нужно СОБИРАТЬ
INCLUDE_EXTS = {
    # Backend
    '.py',
    # Frontend (React/TS)
    '.tsx', '.ts', '.js', '.jsx',
    # Styles & markup
    '.css', '.html',
    # Configs
    '.json', '.txt'  # (например, requirements.txt)
}


def is_ignored(path):
    # Проверяем, не входит ли путь в игнорируемые папки
    parts = path.split(os.sep)
    for part in parts:
        if part in IGNORE_DIRS:
            return True
    return False


def collect_project_code():
    root_dir = os.getcwd()  # Текущая папка запуска

    print(f"🚀 Начинаю сбор кода из: {root_dir}")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # Проходим по дереву каталогов
        for dirpath, dirnames, filenames in os.walk(root_dir):

            # Удаляем игнорируемые папки из списка обхода (чтобы не заходить внутрь .venv)
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

            for filename in filenames:
                ext = os.path.splitext(filename)[1].lower()

                # Если расширение подходит и не сам скрипт сборки/вывода
                if ext in INCLUDE_EXTS and filename != OUTPUT_FILE and filename != 'collect_code.py':
                    file_path = os.path.join(dirpath, filename)

                    # Получаем относительный путь для красивого заголовка (например backend/app.py)
                    relative_path = os.path.relpath(file_path, root_dir)

                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()

                            # Пишем заголовок
                            outfile.write("=" * 60 + "\n")
                            outfile.write(f"FILE START: {relative_path}\n")
                            outfile.write("=" * 60 + "\n")

                            # Пишем код
                            outfile.write(content + "\n\n")

                            print(f"✅ Добавлен: {relative_path}")
                    except Exception as e:
                        print(f"❌ Ошибка чтения {relative_path}: {e}")

    print(f"\n🎉 Готово! Весь код собран в файл: {OUTPUT_FILE}")


if __name__ == '__main__':
    collect_project_code()