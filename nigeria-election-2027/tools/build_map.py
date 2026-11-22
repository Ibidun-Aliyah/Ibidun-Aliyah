"""Build data/nigeria_map.json (SVG paths for the 37 states) from Natural Earth.

Natural Earth is public domain: https://www.naturalearthdata.com/
Usage: python tools/build_map.py path/to/ne_10m_admin_1_states_provinces.geojson
"""

import json
import math
import sys
from pathlib import Path

from shapely.geometry import shape

RENAME = {"Nassarawa": "Nasarawa", "Federal Capital Territory": "FCT"}
TOLERANCE = 0.012   # degrees (~1.3 km); invisible at dashboard size
WIDTH = 600


def main(src):
    feats = [f for f in json.load(open(src))["features"] if f["properties"].get("adm0_a3") == "NGA"]
    geoms = {RENAME.get(f["properties"]["name"], f["properties"]["name"]):
             shape(f["geometry"]).simplify(TOLERANCE, preserve_topology=True) for f in feats}
    minx = min(g.bounds[0] for g in geoms.values()); maxx = max(g.bounds[2] for g in geoms.values())
    miny = min(g.bounds[1] for g in geoms.values()); maxy = max(g.bounds[3] for g in geoms.values())
    kx = math.cos(math.radians((miny + maxy) / 2))
    scale = WIDTH / ((maxx - minx) * kx)
    height = round((maxy - miny) * scale)
    proj = lambda x, y: (round((x - minx) * kx * scale, 1), round((maxy - y) * scale, 1))

    def ring(coords):
        pts = [proj(x, y) for x, y in coords]
        return "M" + "L".join(f"{x},{y}" for x, y in pts) + "Z"

    states = {}
    for name, g in geoms.items():
        polys = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
        d = "".join(ring(p.exterior.coords) + "".join(ring(i.coords) for i in p.interiors) for p in polys)
        c = g.representative_point()
        states[name] = {"d": d, "label": proj(c.x, c.y)}
    out = Path(__file__).resolve().parent.parent / "data" / "nigeria_map.json"
    out.write_text(json.dumps({"width": WIDTH, "height": height,
                               "source": "Natural Earth admin-1 (public domain)", "states": states}))
    print(f"{len(states)} states, {out.stat().st_size // 1024} KB -> {out}")


if __name__ == "__main__":
    main(sys.argv[1])
