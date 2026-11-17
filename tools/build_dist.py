"""Собирает публикуемую версию сайта в dist/ и архив dist/llm-nagiyev-com.zip.

Запуск из корня проекта: python tools/build_dist.py
В архив попадает только то, что нужно сайту: без исследований, русской копии данных и служебных файлов.
Содержимое архива распаковывается в корень поддомена llm.nagiyev.com.
"""
import pathlib
import shutil
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
SITE = DIST / 'site'
FILES = ['index.html', 'favicon.ico', 'manifest.webmanifest', 'sw.js', 'data/models.json',
         'src/main.js', 'src/anim.js', 'src/shoot.js', 'src/styles.css']

# Без кэша: после обновления файлов посетители сразу видят новую версию.
HTACCESS = """AddType application/manifest+json .webmanifest
<IfModule mod_headers.c>
  <FilesMatch "\\.(html|js|css|json|webmanifest)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
"""

if DIST.exists():
    shutil.rmtree(DIST)
for name in FILES:
    target = SITE / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ROOT / name, target)
shutil.copytree(ROOT / 'assets', SITE / 'assets')
(SITE / '.htaccess').write_text(HTACCESS, encoding='utf-8', newline='\n')

archive = DIST / 'llm-nagiyev-com.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for path in sorted(SITE.rglob('*')):
        if path.is_file():
            z.write(path, path.relative_to(SITE).as_posix())
print(f'{archive}  {archive.stat().st_size / 1024:.0f} KB')
