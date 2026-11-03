"""Create an original, reusable cabinet asset for the engineering explainer."""
import bpy
from pathlib import Path
from math import radians

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metal=0.0, rough=0.5, emission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return mat

mats = {
    'frame': material('Graphite steel', (.075, .105, .14), .65, .38),
    'panel': material('Cabinet panels', (.13, .17, .21), .55, .45),
    'silver': material('Brushed aluminum', (.43, .49, .54), .8, .33),
    'server': material('Server chassis', (.19, .24, .29), .7, .42),
    'black': material('Ventilation openings', (.018, .03, .042), .1, .9),
    'pcb': material('PCB green', (.035, .2, .14), .15, .65),
    'blue': material('Network ports', (.025, .25, .58), .3, .45),
    'led': material('Status LEDs', (.1, .75, .48), .15, .4, 1.8),
}

def empty(name, parent=None, location=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.parent = parent
    return obj

shell = empty('enclosure')
servers = empty('server_bank')
frame = empty('rack_frame')

def box(name, location, size, material_key, parent, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mats[material_key])
    obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('Manufactured edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj

# Blender Z is vertical; front is negative Y (positive Z in glTF).
for x in [-.415, .415]:
    for y in [-.545, .545]:
        box('Upright', (x,y,1.10), (.045,.055,2.2), 'frame', frame, .008)
    box('Side panel', (x,0,1.14), (.025,1.04,2.08), 'panel', shell, .008)
for z in [.065, 2.19]:
    box('Frame cross member', (0,0,z), (.86,1.15,.065), 'frame', frame, .01)
box('Top cover', (0,0,2.2), (.84,1.1,.035), 'panel', shell, .008)
box('Rear panel', (0,.55,1.12), (.78,.025,2.08), 'panel', shell)
for x in [-.35,.35]:
    for y in [-.45,.45]:
        box('Adjustable feet', (x,y,.015), (.1,.1,.03), 'black', frame)

row_parts = []
for row in range(9):
    z = .23 + row*.205
    parts = []
    parts.append(box('Server tray', (0,-.005,z), (.74,.95,.145), 'server', servers, .008))
    parts.append(box('Front plate', (0,-.5,z), (.75,.035,.145), 'silver', servers, .005))
    for x in [-.32,.32]:
        parts.append(box('Handle', (x,-.54,z), (.025,.045,.09), 'frame', servers, .004))
    for vent in range(9):
        parts.append(box('Vent slot', (-.23+vent*.045,-.522,z), (.022,.008,.086), 'black', servers))
    for port in range(2):
        parts.append(box('Network port', (.205+port*.052,-.522,z+.016), (.038,.009,.042), 'blue', servers))
    parts.append(box('Status LED', (.3,-.525,z-.035), (.012,.009,.014), 'led', servers))
    parts.append(box('PCB', (0,-.02,z+.077), (.6,.65,.009), 'pcb', servers))
    parts.append(box('Processor heat sink', (0,-.02,z+.098), (.16,.16,.032), 'silver', servers))
    row_parts.append(parts)

# Join by material inside the shell and frame, retaining two meaningful groups.
for parent in [shell, frame]:
    for mat in mats.values():
        objects = [obj for obj in list(parent.children) if obj.type == 'MESH' and obj.data.materials[0] == mat]
        if not objects:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = parent.name + '_' + mat.name.replace(' ', '_')

# The server bank keeps one object per 1U row so each server can be pulled out
# on its own. Joining is unchanged geometry; only the grouping differs.
for index, objects in enumerate(row_parts, start=1):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    part = objects[0]
    part.name = f'part_server_{index:02d}'
    # Put each part's origin at its own bounds centre; the viewer pulls along +z.
    bpy.ops.object.select_all(action='DESELECT')
    part.select_set(True)
    bpy.context.view_layer.objects.active = part
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

# The fan tray and PDU are separate web-scene components today, so the bank
# carries named anchors only: the part contract exists without adding triangles
# or changing the cabinet's rendered appearance.
empty('part_fan_tray', servers, (0, -.18, 1.94))
empty('part_pdu', servers, (-.51, -.2, .45))

export_path = ROOT / 'public' / 'models' / 'server-rack.glb'
export_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'source'/'server-rack.blend'))
bpy.ops.export_scene.gltf(filepath=str(export_path), export_format='GLB', export_cameras=False, export_lights=False)
print('RACK_ASSET_READY', export_path)
