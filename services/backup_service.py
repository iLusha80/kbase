import os
import shutil
import glob
from datetime import datetime


def auto_backup(db_path, backup_dir='backups', max_backups=10):
    """Создаёт резервную копию БД при запуске. Ротация старых бэкапов."""
    if not os.path.exists(db_path):
        print(f'[backup] БД не найдена: {db_path}')
        return None

    os.makedirs(backup_dir, exist_ok=True)

    today = datetime.now().strftime('%Y%m%d')
    backup_name = f'kbase_{today}.db'
    backup_path = os.path.join(backup_dir, backup_name)

    # Не создавать дубль, если сегодня уже был бэкап
    if os.path.exists(backup_path):
        print(f'[backup] Бэкап за сегодня уже есть: {backup_name}')
        return backup_path

    shutil.copy2(db_path, backup_path)
    print(f'[backup] Создан бэкап: {backup_name} ({os.path.getsize(backup_path)} bytes)')

    # Ротация: удалить старые бэкапы, оставить последние max_backups
    existing = sorted(glob.glob(os.path.join(backup_dir, 'kbase_*.db')))
    if len(existing) > max_backups:
        for old in existing[:-max_backups]:
            os.remove(old)
            print(f'[backup] Удалён старый бэкап: {os.path.basename(old)}')

    return backup_path
