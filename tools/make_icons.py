"""Рисует иконку сайта: три здания парка в изометрии. Пересоздаёт assets/icons/* и favicon.ico.

Запуск из корня проекта: python tools/make_icons.py
"""
import math
import pathlib

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'icons'
BG = '#0b1018'
TOP, LEFT, RIGHT, EDGE, LIT, RETRAIN = '#3a4558', '#1a2433', '#223047', '#8ea3c0', '#ffc94d', '#74d4b4'
C, S = math.cos(math.radians(30)), math.sin(math.radians(30))

# здания в единицах сетки: (x, z, ширина, высота, цвет граней, горящие клетки (грань, столбец, ряд))
BUILDINGS = [
    (-1.0, 0.6, 0.9, 1.7, EDGE, [('l', 0, 2), ('r', 1, 4)]),
    (0.0, -0.4, 1.1, 3.0, EDGE, [('l', 1, 8), ('l', 0, 4), ('r', 0, 6), ('r', 2, 2)]),
    (0.95, 0.75, 0.8, 1.2, RETRAIN, [('l', 1, 2)]),
]

def project(x, y, z, scale, ox, oy):
    return ox + (x - z) * C * scale, oy - (y - (x + z) * S) * scale   # +x и +z — к зрителю


def faces(b, scale, ox, oy):
    x, z, w, h, edge, lit = b
    p = lambda dx, dy, dz: project(x + dx, dy, z + dz, scale, ox, oy)
    hw = w / 2
    top = [p(-hw, h, -hw), p(hw, h, -hw), p(hw, h, hw), p(-hw, h, hw)]
    left = [p(-hw, 0, hw), p(hw, 0, hw), p(hw, h, hw), p(-hw, h, hw)]
    right = [p(hw, 0, -hw), p(hw, 0, hw), p(hw, h, hw), p(hw, h, -hw)]
    cells = []
    cols, rows = 3, round(h / 0.25)
    for face, col, row in lit:
        u0, u1 = -hw + w * (col + 0.2) / cols, -hw + w * (col + 0.8) / cols
        v0, v1 = h * (row + 0.2) / rows, h * (row + 0.8) / rows
        if face == 'l':
            cells.append([p(u0, v0, hw), p(u1, v0, hw), p(u1, v1, hw), p(u0, v1, hw)])
        else:
            cells.append([p(hw, v0, -u0), p(hw, v0, -u1), p(hw, v1, -u1), p(hw, v1, -u0)])
    return [(left, LEFT), (right, RIGHT), (top, TOP)], cells, edge


def layout(size, pad):
    # масштаб и сдвиг по рамке всех вершин: квартал целиком вписан в квадрат с отступом pad
    pts = [pt for b in BUILDINGS for poly, _ in faces(b, 1, 0, 0)[0] for pt in poly]
    xs, ys = [x for x, _ in pts], [y for _, y in pts]
    scale = size * (1 - 2 * pad) / max(max(xs) - min(xs), max(ys) - min(ys))
    ox = size / 2 - (max(xs) + min(xs)) / 2 * scale
    oy = size / 2 - (max(ys) + min(ys)) / 2 * scale
    return scale, ox, oy


def draw_png(size, pad, rounded):
    big = size * 4   # рисуем крупно и уменьшаем: так края гладкие
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if rounded:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=big * 0.22, fill=BG)
    else:
        d.rectangle([0, 0, big, big], fill=BG)
    scale, ox, oy = layout(big, pad)
    lw = max(2, round(big / (40 if size <= 64 else 110)))   # на маленькой иконке линии толще
    for b in sorted(BUILDINGS, key=lambda b: b[0] + b[1]):
        polys, cells, edge = faces(b, scale, ox, oy)
        for poly, color in polys:
            d.polygon(poly, fill=color)
        for cell in cells:
            d.polygon(cell, fill=LIT)
        for poly, _ in polys:
            d.line(poly + [poly[0]], fill=edge, width=lw, joint='curve')
    return img.resize((size, size), Image.LANCZOS)


def svg(size=64, pad=0.08):
    scale, ox, oy = layout(size, pad)
    pts = lambda poly: ' '.join(f'{x:.2f},{y:.2f}' for x, y in poly)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}">',
           f'<rect width="{size}" height="{size}" rx="{size * 0.22:.1f}" fill="{BG}"/>']
    for b in sorted(BUILDINGS, key=lambda b: b[0] + b[1]):
        polys, cells, edge = faces(b, scale, ox, oy)
        out += [f'<polygon points="{pts(p)}" fill="{c}"/>' for p, c in polys]
        out += [f'<polygon points="{pts(c)}" fill="{LIT}"/>' for c in cells]
        out += [f'<polygon points="{pts(p)}" fill="none" stroke="{edge}" stroke-width="1.1" stroke-linejoin="round"/>' for p, _ in polys]
    return '\n'.join(out + ['</svg>']) + '\n'


OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'icon.svg').write_text(svg(), encoding='utf-8')
draw_png(192, 0.08, True).save(OUT / 'icon-192.png')
draw_png(512, 0.08, True).save(OUT / 'icon-512.png')
draw_png(512, 0.2, False).save(OUT / 'icon-maskable-512.png')   # безопасная зона маски — центральные 80%
draw_png(180, 0.1, False).save(OUT / 'apple-touch-icon.png')     # iOS сам скругляет углы
draw_png(64, 0.04, True).save(ROOT / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print('icons ->', OUT)
