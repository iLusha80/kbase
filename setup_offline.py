import os
import urllib.request

def download_file(url, dest_folder, dest_filename):
    if not os.path.exists(dest_folder):
        os.makedirs(dest_folder)
    
    dest_path = os.path.join(dest_folder, dest_filename)
    print(f"Скачивание {url} -> {dest_path}...")
    
    try:
        with urllib.request.urlopen(url) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        print("✅ Успешно!")
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    libs_dir = os.path.join("static", "js", "libs")
    
    # 1. Скачиваем Lucide Icons
    download_file(
        "https://unpkg.com/lucide@latest/dist/umd/lucide.min.js", 
        libs_dir, 
        "lucide.min.js"
    )

    # 2. Скачиваем Tailwind CSS (Play CDN версия для standalone использования)
    # Примечание: В реальном продакшене лучше использовать сборку через npm, 
    # но для автономности текущего проекта скачивание скрипта — самый быстрый путь.
    download_file(
        "https://cdn.tailwindcss.com", 
        libs_dir, 
        "tailwindcss.js"
    )

    print("\n🎉 Все зависимости скачаны. Теперь проект может работать без интернета.")