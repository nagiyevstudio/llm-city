"""Локальный сервер парка: статика без кэша и приём клипов из режима съёмки.

Запуск из корня проекта:
    python tools/park_server.py 8080 --out shots

POST /save?name=01-city.mp4 сохраняет тело запроса в папку --out. Существующий файл
не перезаписывается: новый дубль получает суффикс -2, -3 и т. д.
"""
import argparse
import http.server
import json
import pathlib
import re
import urllib.parse

parser = argparse.ArgumentParser()
parser.add_argument('port', type=int, nargs='?', default=8080)
parser.add_argument('--out', default='shots', help='папка для записанных клипов')
args = parser.parse_args()
OUT = pathlib.Path(args.out).resolve()


def free_path(name):
    path = OUT / name
    n = 2
    while path.exists():
        path = OUT / f'{pathlib.Path(name).stem}-{n}{pathlib.Path(name).suffix}'
        n += 1
    return path


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # без кэша: правка JS и данных видна после обычной перезагрузки
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        url = urllib.parse.urlparse(self.path)
        name = urllib.parse.parse_qs(url.query).get('name', [''])[0]
        if url.path != '/save' or not re.fullmatch(r'[\w.-]+\.mp4', name):
            self.send_error(400, 'ожидается POST /save?name=<имя>.mp4')
            return
        data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        OUT.mkdir(parents=True, exist_ok=True)
        path = free_path(name)
        path.write_bytes(data)
        body = json.dumps({'path': str(path), 'bytes': len(data)}, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


print(f'http://localhost:{args.port}  clips -> {OUT}', flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1', args.port), Handler).serve_forever()
