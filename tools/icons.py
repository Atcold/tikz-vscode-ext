"""Generate the extension icon, and the contact sheet used to choose it.

The artwork is a small TikZ picture drawn in SVG, so it is edited as numbers rather
than in a vector editor. Arrow heads are the real `latex` tip lifted out of
pgfcorearrows.code.tex, since every hand-drawn approximation reads as a flat kite.
"""
import re

EM = 22.0


def _p(x, y):
    return f"{x*EM:.2f} {y*EM:.2f}"


# Three cubics, tip at the origin pointing +x. The middle one has both controls at
# x=-.8, forward of the barb ends at -1.1666, which is what carves the concave back.
ARROW = (f"M {_p(0,0)} C {_p(-.1666,.1333)} {_p(-.5,.3999)} {_p(-1.1666,.5332)} "
         f"C {_p(-.8,.2666)} {_p(-.8,-.2666)} {_p(-1.1666,-.5332)} "
         f"C {_p(-.5,-.3999)} {_p(-.1666,-.1333)} {_p(0,0)} Z")


def head(tip, deg, colour, s=1.0):
    return (f'<g transform="translate({tip[0]},{tip[1]}) rotate({deg}) scale({s})">'
            f'<path d="{ARROW}" fill="{colour}"/></g>')


SERIF = "STIX Two Text, STIXGeneral, Times New Roman, serif"

# The wordmark, in the three placements under consideration. On the diagonal there is
# 181 units of room, so 72 fits; across the flat there is 128, so it comes down to 50.
MARKS = {
    "m45": ('<g transform="rotate(-45 64 64)"><text x="64" y="89" text-anchor="middle" '
            f'font-family="{SERIF}" font-size="72" fill="#ffffff" fill-opacity="0.25">'
            'Ti<tspan font-style="italic">k</tspan>Z</text></g>'),
    "p45": ('<g transform="rotate(45 64 64)"><text x="64" y="89" text-anchor="middle" '
            f'font-family="{SERIF}" font-size="72" fill="#ffffff" fill-opacity="0.25">'
            'Ti<tspan font-style="italic">k</tspan>Z</text></g>'),
    "flat": ('<text x="64" y="82" text-anchor="middle" '
             f'font-family="{SERIF}" font-size="50" fill="#ffffff" fill-opacity="0.25">'
             'Ti<tspan font-style="italic">k</tspan>Z</text>'),
}

ART = {}

ART['a'] = [
    '<line x1="32" y1="96" x2="81.1" y2="54.6" stroke="#22d3ee" stroke-width="7" stroke-linecap="round"/>',
    head((96, 42), -40.3, "#22d3ee"),
    '<circle cx="32" cy="96" r="9" fill="#ff3ea5"/>',
]
ART['b'] = [
    '<g stroke="#6b7280" stroke-width="3" stroke-dasharray="5 5">',
    '  <line x1="26" y1="98" x2="26" y2="44"/>',
    '  <line x1="102" y1="30" x2="102" y2="84"/>',
    '</g>',
    '<path d="M 26,98 C 26,44 102,84 102,30" fill="none" stroke="#22d3ee" stroke-width="8" stroke-linecap="round"/>',
    '<circle cx="26" cy="44" r="6.5" fill="#22252b" stroke="#ff3ea5" stroke-width="3.5"/>',
    '<circle cx="102" cy="84" r="6.5" fill="#22252b" stroke="#ff3ea5" stroke-width="3.5"/>',
    '<circle cx="26" cy="98" r="8" fill="#ff3ea5"/>',
    '<circle cx="102" cy="30" r="8" fill="#ff3ea5"/>',
]
ART['c'] = [
    '<rect x="14" y="78" width="44" height="30" rx="10" fill="none" stroke="#22d3ee" stroke-width="6"/>',
    '<circle cx="98" cy="36" r="19" fill="none" stroke="#ff3ea5" stroke-width="6"/>',
    '<line x1="60.0" y1="77.8" x2="73.4" y2="63.0" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>',
    head((83.2, 52.2), -47.7, "#cbd5e1", 0.75),
]
ART['d'] = [
    '<path d="M 26,24 V 102 H 106" fill="none" stroke="#6b7280" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    '<path d="M 26,96 C 52,96 56,40 104,36" fill="none" stroke="#22d3ee" stroke-width="8" stroke-linecap="round"/>',
    '<circle cx="42.4" cy="87.2" r="6" fill="#ff3ea5"/>',
    '<circle cx="56.8" cy="67.5" r="6" fill="#ff3ea5"/>',
    '<circle cx="75.2" cy="47.1" r="6" fill="#ff3ea5"/>',
]


def _thicken(s):
    """Halving the artwork halves its strokes with it, so fatten them first."""
    s = re.sub(r'stroke-width="([\d.]+)"', lambda m: f'stroke-width="{float(m[1])*1.45:.2f}"', s)
    s = re.sub(r'\br="([\d.]+)"', lambda m: f'r="{float(m[1])*1.2:.2f}"', s)
    s = re.sub(r'stroke-dasharray="([\d.]+) ([\d.]+)"',
               lambda m: f'stroke-dasharray="{float(m[1])*1.45:.1f} {float(m[2])*1.45:.1f}"', s)
    return s


ART['e'] = [f'<g transform="translate({x},{y}) scale(0.5)">{_thicken(chr(10).join(ART[k]))}</g>'
            for k, x, y in (('a', 0, 0), ('b', 64, 0), ('c', 0, 64), ('d', 64, 64))]

GROUND = '<rect width="128" height="128" rx="26" fill="#22252b"/>'


def body(art, mark):
    return GROUND + "\n" + "\n".join(ART[art]) + "\n" + MARKS[mark]


def svg(art, mark):
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" '
            f'viewBox="0 0 128 128">\n{body(art, mark)}\n</svg>\n')


# Iterating on C with the +45 wordmark: no arrow, and the node box turned 45 so it runs
# parallel to the wordmark. The two nodes then sit on the opposite diagonal and flank it
# rather than fighting it.
ART['c45'] = [
    '<rect x="14" y="80" width="40" height="26" rx="9" fill="none" stroke="#22d3ee" stroke-width="6" transform="rotate(45 34 93)"/>',
    '<circle cx="98" cy="34" r="19" fill="none" stroke="#ff3ea5" stroke-width="6"/>',
]
