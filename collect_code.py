import os

# Имя выходного файла
OUTPUT_FILE = "all_project_code.txt"

# Папки, которые нужно ИГНОРИРОВАТЬ
IGNORE_DIRS = {
    '.venv', '.git', '__pycache__', 'node_modules',
    '.idea', 'instance', 'dist', 'build', 'coverage',
    '.pytest_cache', 'env', 'venv'
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
    '.json', '.txt', '.yaml', '.yml', '.env.example', '.ini'
}

def is_ignored(path):
    parts = path.split(os.sep)
    for part in parts:
        if part in IGNORE_DIRS:
            return True
    return False

def generate_tree_structure(root_dir):
    """Генерирует строковое представление дерева файлов для контекста."""
    tree_str = ""
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Фильтруем папки на лету
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        
        level = dirpath.replace(root_dir, '').count(os.sep)
        indent = ' ' * 4 * (level)
        folder_name = os.path.basename(dirpath)
        if folder_name:
             tree_str += f"{indent}{folder_name}/\n"
        
        subindent = ' ' * 4 * (level + 1)
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext in INCLUDE_EXTS and f != OUTPUT_FILE and f != 'collect_code.py':
                tree_str += f"{subindent}{f}\n"
    return tree_str

def rename_old_file() -> bool:
    if os.path.exists(OUTPUT_FILE):
        try:
            # Если старый префиксный файл есть, удаляем его, чтобы не плодить мусор
            old_name = f"pref_vers_{OUTPUT_FILE}"
            if os.path.exists(old_name):
                os.remove(old_name)
            os.rename(OUTPUT_FILE, old_name)
            return True
        except OSError:
            pass
    return False

def collect_project_code():
    root_dir = os.getcwd()
    print(f"🚀 Начинаю сбор кода из: {root_dir}")

    if rename_old_file():
        print(f"✅ Старый файл сохранен как: pref_vers_{OUTPUT_FILE}")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 1. Сначала пишем промпт-инструкцию и структуру проекта
        outfile.write("<project_context>\n")
        outfile.write("Ниже представлен исходный код проекта. Используй эту структуру для понимания связей между модулями.\n\n")
        
        outfile.write("<project_structure>\n")
        tree = generate_tree_structure(root_dir)
        outfile.write(tree)
        outfile.write("</project_structure>\n\n")

        # 2. Проходим по файлам и пишем их содержимое
        file_count = 0
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]

            for filename in filenames:
                ext = os.path.splitext(filename)[1].lower()

                # Исключаем сам скрипт сбора и выходной файл
                if ext in INCLUDE_EXTS and filename != OUTPUT_FILE and filename != 'collect_code.py' and not filename.startswith('pref_vers_'):
                    file_path = os.path.join(dirpath, filename)
                    relative_path = os.path.relpath(file_path, root_dir)
                    
                    # Нормализуем путь для Windows (чтобы были слеши /, а не \)
                    relative_path = relative_path.replace(os.sep, '/')

                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                            
                            # XML формат для четкого разделения
                            outfile.write(f'<file path="{relative_path}">\n')
                            outfile.write(content)
                            # Убедимся, что файл заканчивается новой строкой перед закрывающим тегом
                            if not content.endswith('\n'):
                                outfile.write('\n')
                            outfile.write(f'</file>\n\n')

                            print(f"📄 Добавлен: {relative_path}")
                            file_count += 1
                    except Exception as e:
                        print(f"❌ Ошибка чтения {relative_path}: {e}")
        
        outfile.write("</project_context>")

    print(f"\n🎉 Готово! Обработано файлов: {file_count}")
    print(f"📁 Результат сохранен в: {OUTPUT_FILE}")

if __name__ == '__main__':
    collect_project_code()