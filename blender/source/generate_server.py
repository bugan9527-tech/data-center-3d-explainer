"""Original teaching server. Run in Blender 4.5; no third-party assets required.

Blender: X width, Y front/back (front is negative), Z up.
glTF: X width, Y up, Z front/back. Named assembly roots are the UI contract.
"""
import bpy
from pathlib import Path
from math import pi, sin, cos

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, metal=0.0, rough=.5):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metal
    bsdf.inputs['Roughness'].default_value = rough
    return mat

M = {
    'steel': material('Chassis silver', (.48,.57,.64), .65, .38),
    'pcb': material('Motherboard teal', (.035,.26,.22), .2),
    'ram': material('Memory green', (.12,.37,.23), .15),
    'nic': material('Network blue PCB', (.07,.24,.42), .15),
    'black': material('Chips and sockets', (.035,.055,.075)),
    'gold': material('Contact gold', (.68,.44,.1), .65),
    'silver': material('Heat sink aluminum', (.73,.79,.82), .8, .3),
    'fan': material('Fan blades', (.22,.31,.36), .35),
    'copper': material('Board traces', (.22,.52,.43), .4),
    'power': material('Power supply steel', (.43,.48,.56), .65),
}
groups = {}
for name in ['chassis','motherboard','cpu','memory','nic','psu','fans']:
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    groups[name] = obj

def box(name, pos, size, mat, group, rotation=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if rotation:
        obj.rotation_euler = rotation
    obj.data.materials.append(M[mat])
    obj.parent = groups[group]
    return obj

def cylinder(name, pos, radius, depth, mat, group, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=depth, location=pos)
    obj = bpy.context.object
    obj.name = name
    if rotation:
        obj.rotation_euler = rotation
    obj.data.materials.append(M[mat])
    obj.parent = groups[group]
    return obj

# Low sidewalls retain a complete chassis silhouette while exposing all six parts.
box('Open server tray', (0,0,.04), (4.8,3.5,.08), 'steel','chassis')
for x in [-2.37,2.37]:
    box('Tray sidewall', (x,0,.20), (.06,3.5,.32), 'steel','chassis')
    box('Rack ear', (x,-1.82,.16), (.18,.22,.23), 'silver','chassis')
box('Rear IO wall', (0,1.72,.17), (4.8,.06,.26), 'steel','chassis')
box('Front intake rail', (0,-1.72,.15), (4.8,.06,.22), 'steel','chassis')

# Mainboard with copper paths, sockets, connector bank and mounting screws.
box('Main circuit board', (-.1,-.05,.16), (4.3,2.15,.06), 'pcb','motherboard')
for x in [-1.95,1.8]:
    for y in [-.9,.95]:
        cylinder('Board standoff', (x,y,.2), .045,.035,'silver','motherboard')
for i in range(11):
    y = -.78+i*.15
    box('Copper bus path', (-.05,y,.195), (2.95,.015,.005), 'copper','motherboard')
for x in [-1.55,-1.28,-1.01]:
    box('Board controller', (x,-.68,.23), (.18,.24,.065), 'black','motherboard')
box('CPU socket', (-.62,.05,.22), (.98,.98,.08), 'black','motherboard')
for x in [.55,.82,1.09,1.36]:
    box('DIMM socket', (x,-.02,.23), (.12,1.42,.08), 'black','motherboard')
box('PCIe expansion socket', (-1.75,.65,.235), (.16,.8,.09), 'black','motherboard')
box('Power connector bank', (1.88,.65,.24), (.18,.4,.12), 'gold','motherboard')

# CPU package and a recognizable finned heat sink, distinct from a simple cube.
box('Processor substrate', (-.62,.05,.29), (.80,.80,.07), 'pcb','cpu')
box('CPU metal lid', (-.62,.05,.345), (.63,.63,.045), 'silver','cpu')
box('Heat sink base', (-.62,.05,.39), (.86,.86,.05), 'silver','cpu')
for i in range(13):
    box('Heat sink fin', (-1.01+i*.065,.05,.55), (.025,.85,.3), 'silver','cpu')
for x in [-1.08,-.16]:
    cylinder('Heat sink screw', (x,.05,.40), .035,.04,'gold','cpu')

# Four vertical DIMMs with discrete chips, exposed gold contacts, and end clips.
for x in [.55,.82,1.09,1.36]:
    box('Memory DIMM PCB', (x,-.02,.48), (.045,1.25,.43), 'ram','memory')
    for y in [-.48,-.18,.12,.42]:
        box('Memory IC', (x-.04,y,.5), (.04,.23,.21), 'black','memory')
    box('DIMM contacts', (x,-.02,.285), (.05,1.12,.055), 'gold','memory')
    for y in [-.70,.66]:
        box('Memory retaining clip', (x,y,.31), (.12,.07,.16), 'silver','memory')

# Upright PCIe NIC with rear dual ports and a small controller heat sink.
box('NIC upright PCB', (-1.75,.79,.49), (.06,1.05,.48), 'nic','nic')
box('PCIe edge connector', (-1.75,.65,.28), (.07,.7,.07), 'gold','nic')
box('NIC controller', (-1.69,.66,.5), (.08,.32,.25), 'black','nic')
for y in [.47,.54,.61,.68,.75,.82]:
    box('NIC cooling fin', (-1.61,y,.5), (.10,.025,.27), 'silver','nic')
box('Rear IO bracket', (-1.75,1.45,.48), (.46,.06,.63), 'silver','nic')
for x in [-1.87,-1.63]:
    box('Ethernet socket', (x,1.49,.50), (.19,.12,.19), 'steel','nic')
    box('Ethernet port opening', (x,1.558,.50), (.14,.015,.13), 'black','nic')

# Twin power modules behind the mainboard. Slots, handles, and connectors.
for x in [.64,1.62]:
    box('Power supply enclosure', (x,1.37,.36), (.84,.57,.49), 'power','psu')
    for i in range(7):
        box('PSU vent', (x-.31+i*.10,1.665,.39), (.04,.016,.26), 'black','psu')
    box('PSU pull handle', (x,1.79,.38), (.3,.13,.055), 'gold','psu')
    box('PSU output connector', (x,1.04,.28), (.3,.10,.13), 'gold','psu')

# Front intake fan wall. Each fan has a square frame, circular hub and six blades.
for x in [-1.8,-.9,0,.9,1.8]:
    for z in [.18,.79]:
        box('Fan frame horizontal', (x,-1.35,z), (.74,.28,.065), 'black','fans')
    for dx in [-.34,.34]:
        box('Fan frame vertical', (x+dx,-1.35,.485), (.065,.28,.61), 'black','fans')
    cylinder('Fan hub', (x,-1.36,.485), .105,.13,'silver','fans',(pi/2,0,0))
    for j in range(6):
        a = j*pi/3
        box('Fan blade', (x+sin(a)*.17,-1.36,.485+cos(a)*.17), (.14,.055,.28), 'fan','fans',(0,a+.35,0))

# Consolidate by material within each selectable assembly; no texture downloads.
for root in groups.values():
    for mat in M.values():
        objects = [o for o in list(root.children) if o.type == 'MESH' and o.data.materials[0] == mat]
        if not objects:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = root.name + '_' + mat.name.replace(' ', '_')

bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/source/server-internal.blend'))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/server-internal.glb'), export_format='GLB', export_cameras=False, export_lights=False)
print('SERVER_ASSET_READY')
