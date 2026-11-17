"""Показывает новые репозитории провайдеров парка на Hugging Face.

Запуск из корня проекта:
    python tools/check_updates.py                  с даты as_of в data/models.json
    python tools/check_updates.py --since 2026-10-01
    python tools/check_updates.py --all            вместе с квантованными копиями

Только читает Hugging Face, данные парка не меняет. Новые провайдеры сюда не попадают:
их ищем отдельно, см. .claude/skills/update-park/SKILL.md.
"""
import argparse
import json
import pathlib
import re
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Сжатые и служебные копии уже известных весов: отдельным зданием не становятся.
COPY = re.compile(r'(NVFP4|FP8|MXFP|GGUF|MLX|ONNX|-4bit|-8bit|DFlash|DSpark|LiLiCorr|-QAD|-Base\b|-BF16-)', re.I)

sys.stdout.reconfigure(encoding='utf-8')
parser = argparse.ArgumentParser()
parser.add_argument('--since')
parser.add_argument('--all', action='store_true')
args = parser.parse_args()

data = json.loads((ROOT / 'data/models.json').read_text(encoding='utf-8'))
since = args.since or data['as_of']
known = ' '.join(s for m in data['models'] for s in m.get('sources', []))
print(f'Новые репозитории с {since}; в парке {len(data["models"])} моделей, данные на {data["as_of"]}\n')

found = failed = 0
for provider in data['providers']:
    org = provider['hf_org']
    url = f'https://huggingface.co/api/models?author={org}&sort=createdAt&direction=-1&limit=50'
    request = urllib.request.Request(url, headers={'User-Agent': 'model-park-update-check'})
    try:
        models = json.load(urllib.request.urlopen(request, timeout=30))
    except OSError as err:
        print(f'{provider["name"]}: не удалось проверить ({err})')
        failed += 1
        continue
    rows = [m for m in models if m.get('createdAt', '')[:10] >= since and m['id'] not in known]
    if not args.all:
        rows = [m for m in rows if not COPY.search(m['id'])]
    for m in rows:
        print(f'{m["createdAt"][:10]}  {m["id"]}  [{m.get("pipeline_tag") or "?"}]  https://huggingface.co/{m["id"]}')
    found += len(rows)

print(f'\nИтого: {found}' + (f'; провайдеров с ошибкой: {failed}' if failed else ''))
