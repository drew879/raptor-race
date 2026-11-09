"""
Builds the Velociraptor body in headless Blender and writes a compact binary for the game.

Run:  /opt/blender-venv/bin/python scripts/blender/raptor.py [--out src/assets/models/velociraptor.rrm] [--preview out.png]

Pipeline: skin-modifier skeleton -> subdivision -> decimate (faceted low poly) -> per-face plumage colors
-> baked ambient occlusion -> armature with bones matching src/render/raptor/model.ts BONE_DEFS ->
automatic (heat) weights -> custom binary (.rrm). Feathers are added in TypeScript, as before.

Coordinates: the game is Y-up with the raptor facing -Z and +X on its right. Blender is Z-up, so a
game point (x, y, z) maps to Blender (x, -z, y).
"""
import argparse
import math
import struct
import sys

import bpy
import bmesh
from mathutils import Vector

ap = argparse.ArgumentParser()
ap.add_argument("--out", default="src/assets/models/velociraptor.rrm")
ap.add_argument("--preview", default="")
ap.add_argument("--target-tris", type=int, default=2600)
args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])


def B(x, y, z):
    """Game coords -> Blender coords."""
    return Vector((x, -z, y))


def hexcol(h):
    """sRGB hex -> linear RGB tuple (matches three.js Color.setHex with color management)."""
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin((h >> 16) & 255), lin((h >> 8) & 255), lin(h & 255))


# Plumage: "Gobi Streak" (mirrors src/render/palette.ts RAPTOR_GOBI_STREAK).
PAL = dict(base=0x5C4C42, dark=0x3A302B, light=0xE9DFC9, under=0xD8C8A8, accent=0x2C8A8F,
           patch=0x3F7FBF, eye=0xF2B33D, claw=0x2A2420, skin=0x8A6A55)
C = {k: hexcol(v) for k, v in PAL.items()}


def mixc(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


C["baseDark"] = mixc(C["base"], C["dark"], 0.45)
C["baseLight"] = mixc(C["base"], C["light"], 0.28)
C["underWarm"] = mixc(C["under"], C["base"], 0.2)

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Skeleton for the skin modifier: (name, game xyz, radius_side, radius_vertical, parent)
# Radii are in meters. Parent links make the edges.
N = []


def node(name, xyz, rs, rv, parent=None):
    N.append((name, xyz, rs, rv, parent))


# Spine from snout to tail tip.
node("snout", (0, 0.958, -1.06), 0.014, 0.013)
node("s1", (0, 0.958, -0.98), 0.036, 0.034, "snout")
node("s2", (0, 0.962, -0.89), 0.048, 0.046, "s1")
node("s3", (0, 0.968, -0.80), 0.06, 0.058, "s2")
node("skull", (0, 0.975, -0.72), 0.066, 0.064, "s3")
node("n1", (0, 0.955, -0.655), 0.052, 0.056, "skull")
node("n2", (0, 0.915, -0.6), 0.05, 0.058, "n1")
node("n3", (0, 0.855, -0.55), 0.056, 0.066, "n2")
node("n4", (0, 0.79, -0.49), 0.075, 0.086, "n3")
node("c1", (0, 0.73, -0.39), 0.118, 0.128, "n4")
node("c2", (0, 0.7, -0.28), 0.158, 0.16, "c1")
node("c3", (0, 0.68, -0.16), 0.168, 0.165, "c2")
node("p1", (0, 0.68, -0.04), 0.155, 0.15, "c3")
node("p2", (0, 0.682, 0.07), 0.128, 0.135, "p1")
node("t0", (0, 0.681, 0.13), 0.117, 0.124, "p2")
node("t1", (0, 0.68, 0.19), 0.106, 0.112, "t0")
node("t2", (0, 0.68, 0.33), 0.084, 0.085, "t1")
node("t3", (0, 0.677, 0.49), 0.064, 0.06, "t2")
node("t4", (0, 0.672, 0.66), 0.047, 0.04, "t3")
node("t5", (0, 0.667, 0.83), 0.034, 0.029, "t4")
node("t6", (0, 0.663, 0.98), 0.023, 0.02, "t5")
node("tip", (0, 0.66, 1.08), 0.01, 0.01, "t6")
# Legs (digitigrade): hip -> knee -> ankle -> ball -> toes, plus raised digit II.
for sx, s in ((-1, "L"), (1, "R")):
    node(f"hip{s}", (sx * 0.085, 0.62, -0.01), 0.08, 0.1, "p1")
    node(f"thigh{s}", (sx * 0.1, 0.52, -0.045), 0.074, 0.08, f"hip{s}")
    node(f"knee{s}", (sx * 0.11, 0.42, -0.08), 0.05, 0.05, f"thigh{s}")
    node(f"shin{s}", (sx * 0.11, 0.295, -0.01), 0.034, 0.034, f"knee{s}")
    node(f"ankle{s}", (sx * 0.11, 0.17, 0.06), 0.024, 0.024, f"shin{s}")
    node(f"ball{s}", (sx * 0.11, 0.035, 0.0), 0.019, 0.019, f"ankle{s}")
    # Arms folded like wings: shoulder -> elbow -> wrist -> fingertip.
    node(f"sho{s}", (sx * 0.13, 0.68, -0.33), 0.034, 0.036, "c2")
    node(f"elb{s}", (sx * 0.2, 0.6, -0.24), 0.026, 0.026, f"sho{s}")
    node(f"wri{s}", (sx * 0.212, 0.62, -0.375), 0.018, 0.018, f"elb{s}")
    node(f"fin{s}", (sx * 0.215, 0.59, -0.44), 0.008, 0.008, f"wri{s}")

names = [n[0] for n in N]
me = bpy.data.meshes.new("RaptorSkin")
me.from_pydata([B(*n[1]) for n in N], [(names.index(n[4]), i) for i, n in enumerate(N) if n[4]], [])
obj = bpy.data.objects.new("Raptor", me)
bpy.context.scene.collection.objects.link(obj)
bpy.context.view_layer.objects.active = obj
obj.select_set(True)
mod = obj.modifiers.new("Skin", "SKIN")
mod.branch_smoothing = 1.0
mod.use_smooth_shade = False
sv = me.skin_vertices[0].data
for i, n in enumerate(N):
    sv[i].radius = (n[2], n[3])
    sv[i].use_root = n[0] == "p1"
sub = obj.modifiers.new("Sub", "SUBSURF")
sub.levels = 1
bpy.ops.object.modifier_apply(modifier="Skin")
bpy.ops.object.modifier_apply(modifier="Sub")

# Gentle anatomy shaping on the smooth mesh before faceting.
for v in me.vertices:
    gx, gy, gz = v.co.x, v.co.z, -v.co.y  # back to game coords
    # Belly sag between chest and hips.
    if -0.35 < gz < 0.05 and gy < 0.62 and abs(gx) < 0.16:
        v.co.z -= 0.025 * math.sin(math.pi * (gz + 0.35) / 0.4)
    # Deeper lower jaw under the skull.
    if gz < -0.7 and gy < 0.955:
        v.co.z -= 0.012 * min(1.0, (-0.7 - gz) / 0.15) * (1.0 - min(1.0, (-gz - 0.95) / 0.12) if gz < -0.95 else 1.0)

dec = obj.modifiers.new("Dec", "DECIMATE")
dec.ratio = max(0.02, min(1.0, args.target_tris / max(1, len(me.polygons) * 2)))
bpy.ops.object.modifier_apply(modifier="Dec")
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.to_mesh(me)
bm.free()
me.update()

# ------------------------------------------------------------------ colors (per face)
def game(co):
    return Vector((co.x, co.z, -co.y))


SPINE = sorted([(n[1][2], n[1][1], n[2], n[3]) for n in N if n[1][0] == 0], key=lambda t: t[0])


def spine_at(z):
    """Interpolated spine (y, side radius, vertical radius) at game depth z."""
    if z <= SPINE[0][0]:
        return SPINE[0][1:]
    for a, b in zip(SPINE, SPINE[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            return tuple(a[i] + (b[i] - a[i]) * t for i in range(1, 4))
    return SPINE[-1][1:]


def face_color(cen, nrm):
    x, y, z = cen
    up = nrm.y
    ax = abs(x)
    sy, rs, rv = spine_at(z)
    h = (y - sy) / max(rv, 1e-3)  # +1 top of body, -1 belly
    # Feet and lower legs: scaly skin, dark claws.
    if y < 0.2:
        return C["claw"] if (z < -0.06 or (y > 0.07 and z < -0.03)) else C["skin"]
    # Legs below the body line (thighs and shins).
    if h < -1.05 and ax > 0.04 and -0.25 < z < 0.2:
        if y < 0.43:
            return C["base"] if up > 0 else C["baseDark"]
        return C["base"] if nrm.z > -0.2 else C["baseDark"]  # thigh: darker toward the back
    # Arms.
    if ax > 0.165 and -0.46 < z < -0.2 and 0.55 < y < 0.72:
        return C["claw"] if z < -0.41 else C["base"]
    # Head.
    if z < -0.66:
        side = abs(nrm.x)
        if z < -1.055:
            return C["baseDark"]
        if up > 0.55:
            return C["base"]
        if side > 0.5 and up > -0.1 and -0.83 < z < -0.74:
            return C["patch"]
        if -0.3 < up < -0.12 and -0.95 < z < -0.84:
            return C["claw"]  # short lip line on the rear jaw
        if -0.45 < up <= -0.12 and z < -0.84:
            return C["skin"]
        if up <= -0.45:
            return C["under"]
        return C["baseLight"]
    # Tail tip: bold bands for the chase camera.
    if z > 0.62:
        band = int((z - 0.62) / 0.085) % 2 == 0
        if h > -0.25:
            return C["light"] if band else C["dark"]
        return C["underWarm"]
    # Body, neck and tail base, by height relative to the spine.
    if h > 0.82:
        return C["baseDark"]  # spine stripe
    if 0.45 < h <= 0.66 and -0.42 < z < 0.5:
        return C["light"]  # cream back streaks, readable from the chase camera
    if h > 0.2:
        return C["base"]
    if h > -0.08:
        return C["light"] if -0.62 < z < 0.6 else C["baseLight"]  # cream streak, cheek to tail
    if h > -0.5:
        return C["baseLight"]
    return C["under"] if z < 0.3 else C["underWarm"]


col_attr = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
for poly in me.polygons:
    cen = game(poly.center)
    n = poly.normal
    nrm = Vector((n.x, n.z, -n.y))
    c = face_color(cen, nrm)
    for li in poly.loop_indices:
        col_attr.data[li].color = (c[0], c[1], c[2], 1.0)
me.color_attributes.active_color = col_attr

# ------------------------------------------------------------------ baked ambient occlusion
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 64
ao = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
mat = bpy.data.materials.new("Bake")
obj.data.materials.append(mat)
me.color_attributes.active_color = ao
bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
# Multiply AO into the plumage, softened so it reads as form, not dirt.
for i in range(len(col_attr.data)):
    a = ao.data[i].color[0]
    k = 0.62 + 0.38 * a
    c = col_attr.data[i].color
    col_attr.data[i].color = (c[0] * k, c[1] * k, c[2] * k, 1.0)

# ------------------------------------------------------------------ armature (matches BONE_DEFS)
BONES = [
    ("root", None, (0, 0, 0)), ("pelvis", "root", (0, 0.67, 0)), ("chest", "pelvis", (0, 0.69, -0.24)),
    ("neck1", "chest", (0, 0.76, -0.44)), ("neck2", "neck1", (0, 0.87, -0.57)), ("head", "neck2", (0, 0.96, -0.66)),
    ("tail1", "pelvis", (0, 0.68, 0.14)), ("tail2", "tail1", (0, 0.675, 0.38)), ("tail3", "tail2", (0, 0.67, 0.62)),
    ("tail4", "tail3", (0, 0.665, 0.86)),
    ("thighL", "pelvis", (-0.1, 0.64, 0)), ("shinL", "thighL", (-0.11, 0.42, -0.08)), ("metaL", "shinL", (-0.11, 0.17, 0.06)), ("toeL", "metaL", (-0.11, 0.03, 0)),
    ("thighR", "pelvis", (0.1, 0.64, 0)), ("shinR", "thighR", (0.11, 0.42, -0.08)), ("metaR", "shinR", (0.11, 0.17, 0.06)), ("toeR", "metaR", (0.11, 0.03, 0)),
    ("upperArmL", "chest", (-0.15, 0.68, -0.33)), ("foreArmL", "upperArmL", (-0.205, 0.6, -0.24)), ("handL", "foreArmL", (-0.215, 0.62, -0.375)),
    ("upperArmR", "chest", (0.15, 0.68, -0.33)), ("foreArmR", "upperArmR", (0.205, 0.6, -0.24)), ("handR", "foreArmR", (0.215, 0.62, -0.375)),
]
# Bone tails: the first child's head, or a short extension for leaf bones.
TAILS = {"head": (0, 0.95, -1.0), "tail4": (0, 0.66, 1.08), "toeL": (-0.11, 0.01, -0.1), "toeR": (0.11, 0.01, -0.1),
         "handL": (-0.215, 0.59, -0.44), "handR": (0.215, 0.59, -0.44), "root": (0, 0.3, 0)}
arm_data = bpy.data.armatures.new("Rig")
arm = bpy.data.objects.new("Rig", arm_data)
scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
eb = {}
for name, parent, head in BONES:
    b = arm_data.edit_bones.new(name)
    b.head = B(*head)
    child = next((c for c in BONES if c[1] == name), None)
    tail = TAILS.get(name) or (child[2] if child else (head[0], head[1] + 0.05, head[2]))
    if name == "pelvis":
        tail = (0, 0.69, -0.24)
    b.tail = B(*tail)
    if (b.tail - b.head).length < 1e-3:
        b.tail = b.head + Vector((0, 0, 0.03))
    if parent:
        b.parent = eb[parent]
    b.use_deform = name != "root"
    eb[name] = b
bpy.ops.object.mode_set(mode="OBJECT")

bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# ------------------------------------------------------------------ export (custom compact binary)
# Format .rrm v1 (little endian):
#   magic 'RRM1', u32 nVerts, u32 nTris, u32 nBones, bone names (u8 len + utf8) ...
#   positions f32 x3, joints u8 x4, weights u8 x4 (sum 255)  per vertex
#   indices u16 x3, color u8 x3 per triangle
bone_names = [b[0] for b in BONES]
group_to_bone = {g.index: bone_names.index(g.name) for g in obj.vertex_groups if g.name in bone_names}
verts = []
unweighted = 0
for v in me.vertices:
    ws = sorted(((g.weight, group_to_bone[g.group]) for g in v.groups if g.group in group_to_bone and g.weight > 1e-4), reverse=True)[:4]
    if not ws:
        unweighted += 1
        ws = [(1.0, bone_names.index("pelvis"))]
    tot = sum(w for w, _ in ws)
    q = [int(round(255 * w / tot)) for w, _ in ws]
    q[0] += 255 - sum(q)
    joints = [j for _, j in ws] + [0] * (4 - len(ws))
    weights = q + [0] * (4 - len(q))
    g = game(v.co)
    verts.append((g, joints, weights))
tris = []
for poly in me.polygons:
    c = col_attr.data[poly.loop_indices[0]].color
    # Store colors back in sRGB bytes.
    def srgb(x):
        x = max(0.0, min(1.0, x))
        return int(round(255 * (x * 12.92 if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055)))
    vi = list(poly.vertices)
    # Blender (x,-z,y) -> game swaps handedness? No: the mapping is a rotation, so winding is preserved.
    tris.append((vi, (srgb(c[0]), srgb(c[1]), srgb(c[2]))))

with open(args.out, "wb") as f:
    f.write(b"RRM1")
    f.write(struct.pack("<III", len(verts), len(tris), len(bone_names)))
    for n in bone_names:
        e = n.encode()
        f.write(struct.pack("<B", len(e)) + e)
    for g, j, w in verts:
        f.write(struct.pack("<fff", g.x, g.y, g.z))
        f.write(bytes(j))
        f.write(bytes(w))
    for vi, c in tris:
        f.write(struct.pack("<HHH", *vi))
        f.write(bytes(c))
print(f"wrote {args.out}: {len(verts)} verts, {len(tris)} tris, {unweighted} unweighted verts")

if args.preview:
    # Quick turntable-free preview render (for review only).
    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = B(2.6, 1.3, -2.4)
    cam.rotation_euler = (math.radians(72), 0, math.radians(132))
    scene.camera = cam
    light = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    light.rotation_euler = (math.radians(50), 0, math.radians(30))
    scene.collection.objects.link(light)
    scene.render.resolution_x = scene.render.resolution_y = 640
    scene.cycles.samples = 32
    scene.render.filepath = args.preview
    bpy.ops.render.render(write_still=True)
    print("preview", args.preview)
