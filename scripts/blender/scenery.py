"""
Converts a CC0 Poly Haven scan into a compact, palette-mapped static mesh (.rrs) for the game.

Run: /opt/blender-venv/bin/python scripts/blender/scenery.py --id namaqualand_boulder_02 --tris 700 \
       --palette hazard --height 1.5 --out src/assets/models/scenery/boulder_a.rrs

Pipeline: download glTF (1k textures) -> join -> ground at y=0, centered -> scale to target height ->
decimate to --tris -> per-face color sampled from the albedo at the face's UV centroid -> luminance
remapped onto a palette ramp (keeps the scan's light/dark detail, in our colors) -> .rrs binary.
.rrs v1 (little endian): 'RRS1', u32 nVerts, u32 nTris, f32 xyz per vertex (game coords: Y up, -Z forward),
u16 or u32 indices (u32 if nVerts > 65535) + u8 rgb per triangle (sRGB).
"""
import argparse, json, math, os, struct, sys, urllib.request
import bpy, bmesh
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--id", required=True)
ap.add_argument("--tris", type=int, default=800)
ap.add_argument("--palette", default="hazard")
ap.add_argument("--height", type=float, default=1.0)
ap.add_argument("--width", type=float, default=0.0, help="optional target width (x); overrides height scaling")
ap.add_argument("--squash", type=float, default=1.0, help="scale height after fitting (e.g. 0.4 for a low ledge)")
ap.add_argument("--fit", default="", help="w,h,d in meters: fit each axis independently (game x, y, z)")
ap.add_argument("--out", required=True)
ap.add_argument("--cache", default=os.path.expanduser("~/.cache/raptor-race-assets"))
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])

PALETTES = {  # sRGB ramps, dark -> light (mirrors docs/ART_BIBLE.md)
    "hazard": [0x4E352A, 0x6E4C3B, 0x8F6650, 0xA9806A],
    "cliff": [0x7E3528, 0xA8452F, 0xC9573C, 0xE8875A, 0xF2B582],
    "scatter": [0x8A5A3A, 0xB07344, 0xD9A066, 0xEEC48A],
    "wood": [0x5E4A3C, 0x7E6655, 0x9C846F, 0xB9A58E],
    "plant": [0x4E5A32, 0x5E6B3E, 0x7A8A4E, 0x8C9A5E, 0xA9B377],
    "bone": [0x8F7A62, 0xB9A58A, 0xD8C8AE, 0xEEE4D0],
}

def fetch(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        req = urllib.request.Request(url, headers={"User-Agent": "raptor-race-asset-pipeline"})
        with urllib.request.urlopen(req, timeout=120) as r, open(path, "wb") as f:
            f.write(r.read())
    return path

# ---------------- download (Poly Haven API) ----------------
d = os.path.join(args.cache, args.id)
files = json.loads(urllib.request.urlopen(urllib.request.Request(f"https://api.polyhaven.com/files/{args.id}", headers={"User-Agent": "raptor-race"}), timeout=60).read())
g = files["gltf"]["1k"]["gltf"]
gltf_path = fetch(g["url"], os.path.join(d, os.path.basename(g["url"])))
for rel, inc in g.get("include", {}).items():
    fetch(inc["url"], os.path.join(d, rel))

# ---------------- import and normalize ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=gltf_path)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
# Use the highest-detail LOD only if the asset ships several.
lod0 = [o for o in meshes if "lod" not in o.name.lower() or "lod0" in o.name.lower()] or meshes
for o in bpy.context.scene.objects:
    o.select_set(o in lod0)
bpy.context.view_layer.objects.active = lod0[0]
if len(lod0) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = obj.data
mn = Vector((min(v.co.x for v in me.vertices), min(v.co.y for v in me.vertices), min(v.co.z for v in me.vertices)))
mx = Vector((max(v.co.x for v in me.vertices), max(v.co.y for v in me.vertices), max(v.co.z for v in me.vertices)))
size = mx - mn
s = (args.width / size.x) if args.width > 0 else (args.height / max(size.z, 1e-6))
sx = sy = sz = s
if args.fit:
    fw, fh, fd = (float(t) for t in args.fit.split(","))
    sx, sz, sy = fw / max(size.x, 1e-6), fh / max(size.z, 1e-6), fd / max(size.y, 1e-6)
    s = sz
cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
for v in me.vertices:
    v.co = Vector(((v.co.x - cx) * sx, (v.co.y - cy) * sy, (v.co.z - mn.z) * sz * args.squash))

# ---------------- decimate ----------------
tris_now = sum(len(p.vertices) - 2 for p in me.polygons)
if tris_now > args.tris:
    dec = obj.modifiers.new("Dec", "DECIMATE")
    dec.ratio = args.tris / tris_now
    bpy.ops.object.modifier_apply(modifier="Dec")
bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.triangulate(bm, faces=bm.faces[:])
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')  # drop loose verts
bm.to_mesh(me); bm.free(); me.update()

# ---------------- colors: sample albedo at UV centroid, remap luminance to the palette ramp ----------------
img = None
for m in me.materials:
    if m and m.use_nodes:
        for n in m.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                link = n.inputs["Base Color"].links
                if link and link[0].from_node.type == "TEX_IMAGE":
                    img = link[0].from_node.image
if img is None:
    raise SystemExit("no albedo texture found")
W, H = img.size
px = img.pixels[:]
uvl = me.uv_layers.active.data
lum = []
for p in me.polygons:
    u = sum(uvl[li].uv.x for li in p.loop_indices) / len(p.loop_indices)
    v = sum(uvl[li].uv.y for li in p.loop_indices) / len(p.loop_indices)
    x = min(W - 1, max(0, int((u % 1.0) * W))); y = min(H - 1, max(0, int((v % 1.0) * H)))
    i = (y * W + x) * 4
    r, gg, b = px[i], px[i + 1], px[i + 2]
    lum.append(0.299 * r + 0.587 * gg + 0.114 * b)
srt = sorted(lum)
lo, hi = srt[int(len(srt) * 0.05)], srt[int(len(srt) * 0.95)]
ramp = PALETTES[args.palette]
def lerp_hex(a, b, t):
    ca = [(a >> 16) & 255, (a >> 8) & 255, a & 255]; cb = [(b >> 16) & 255, (b >> 8) & 255, b & 255]
    return tuple(int(round(ca[k] + (cb[k] - ca[k]) * t)) for k in range(3))
colors = []
for k, p in enumerate(me.polygons):
    t = min(1.0, max(0.0, (lum[k] - lo) / max(hi - lo, 1e-6)))
    # Upward-facing faces read a touch lighter (sun-catching tops), like the hand-built props.
    t = min(1.0, t * 0.85 + max(0.0, p.normal.z) * 0.15)
    if args.palette == "cliff":
        # Strata: horizontal bands shift the ramp position for the Flaming Cliffs layering.
        zc = p.center.z / max(args.height, 1e-3)
        t = min(1.0, max(0.0, t * 0.55 + 0.45 * (0.5 + 0.5 * math.sin(zc * 18.0))))
    f = t * (len(ramp) - 1)
    i0 = min(len(ramp) - 2, int(f))
    colors.append(lerp_hex(ramp[i0], ramp[i0 + 1], f - i0))

# ---------------- export .rrs ----------------
verts = [Vector((v.co.x, v.co.z, -v.co.y)) for v in me.vertices]  # Blender Z-up -> game Y-up, facing -Z
big = len(verts) > 65535
os.makedirs(os.path.dirname(args.out), exist_ok=True)
with open(args.out, "wb") as f:
    f.write(b"RRS1")
    f.write(struct.pack("<II", len(verts), len(me.polygons)))
    for v in verts:
        f.write(struct.pack("<fff", v.x, v.y, v.z))
    for p, c in zip(me.polygons, colors):
        f.write(struct.pack("<III" if big else "<HHH", *p.vertices))
        f.write(bytes(c))
print(f"wrote {args.out}: {len(verts)} verts, {len(me.polygons)} tris from {args.id} ({tris_now} tris), size {size.x*sx:.2f}x{size.z*sz*args.squash:.2f}x{size.y*sy:.2f} m")
