"""Original power and cooling equipment for the room exhibit.

Run with Blender 4.5 in background:
  blender.exe --background --factory-startup --python-exit-code 1
            --python blender/source/generate_infrastructure.py

Blender axes: Z up, -Y is the equipment front (glTF +Z). Every device is built
around its own origin and then spread along X only so the .blend stays
readable; the web scene places each cloned assembly in the room itself.
No external textures, fonts or models are used.
"""
import bpy
from math import radians, cos, sin
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TAU = 6.283185307


def material(name, color, metal=.3, rough=.5, emission=0):
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


MATS = {
    'paint': material('Equipment paint', (.62, .70, .76), .25, .55),
    'shell': material('Dark equipment panel', (.20, .26, .32), .45, .5),
    'dark': material('Graphite frame', (.09, .12, .16), .6, .4),
    'metal': material('Brushed aluminum', (.55, .61, .66), .75, .34),
    'black': material('Vents and openings', (.015, .025, .035), .1, .9),
    'screen': material('Control display', (.16, .62, .72), .1, .3, 1.1),
    'led': material('Status indicators', (.1, .78, .46), .1, .4, 1.6),
    'amber': material('Warning label', (.78, .52, .09), .1, .55),
    'coil': material('Heat exchange coil', (.09, .46, .52), .55, .35),
    'cold': material('Supply air opening', (.13, .62, .74), .2, .5, .5),
}


def empty(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def cube(name, loc, size, key, parent, bevel=0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(MATS[key])
    obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('Manufactured edges', 'BEVEL')
        mod.width, mod.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


def cyl(name, loc, radius, depth, key, parent, rot=(0, 0, 0), segments=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(MATS[key])
    obj.parent = parent
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return obj


def fan(name, center, radius, parent, blades=5, ring=True):
    """Axial fan facing -Y. Blades sit on their own empty so the page can spin them."""
    cx, cy, cz = center
    if ring:
        cyl('Fan housing', (cx, cy + .02, cz), radius, .05, 'dark', parent, rot=(radians(90), 0, 0), segments=28)
        cyl('Fan mouth', (cx, cy - .005, cz), radius * .92, .012, 'black', parent, rot=(radians(90), 0, 0), segments=28)
    spin = empty(name)
    spin.location = (cx, cy - .02, cz)
    spin.parent = parent
    cyl('Fan hub', (0, 0, 0), radius * .24, .035, 'metal', spin, rot=(radians(90), 0, 0), segments=16)
    for index in range(blades):
        angle = TAU * index / blades
        bx, bz = cos(angle) * radius * .52, sin(angle) * radius * .52
        blade = cube('Fan blade', (bx, 0, bz), (radius * .82, .014, radius * .34), 'metal', spin)
        blade.rotation_euler = (radians(18), -angle, 0)
        blade.location = (bx, 0, bz)
    for index in range(4):
        angle = TAU * index / 4 + .4
        cube('Fan guard spoke', (cos(angle) * radius * .55, cy - .045, cz + sin(angle) * radius * .55),
             (.02, .012, radius * 1.05), 'metal', parent, rot=(0, -angle, 0))
    join_by_material(spin)
    return spin


def join_by_material(parent):
    for key in MATS:
        objects = [obj for obj in list(parent.children) if obj.type == 'MESH' and len(obj.children) == 0 and obj.data.materials and obj.data.materials[0] == MATS[key]]
        if not objects:
            continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        bpy.ops.object.join()
        objects[0].name = parent.name + '_' + key


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def build_ups(group):
    """Double-door UPS: display, bypass switch, battery-module vents and top cable entry."""
    cube('UPS plinth', (0, 0, .05), (.98, .84, .1), 'dark', group, .006)
    cube('UPS body', (0, 0, 1.03), (1.0, .86, 1.84), 'paint', group, .01)
    for x in (-.25, .25):
        cube('UPS door', (x, -.442, 1.05), (.47, .03, 1.7), 'shell', group, .005)
        cube('UPS door edge', (x, -.456, 1.05), (.42, .008, 1.6), 'paint', group, .003)
    cube('UPS door gap', (0, -.452, 1.05), (.026, .026, 1.7), 'black', group)
    for x in (-.055, .055):
        cube('UPS handle', (x, -.472, 1.02), (.02, .026, .4), 'metal', group, .003)
    cube('UPS display bezel', (-.25, -.468, 1.62), (.34, .022, .3), 'black', group, .004)
    cube('UPS display', (-.25, -.482, 1.65), (.27, .008, .16), 'screen', group)
    for index in range(3):
        cube('UPS indicator', (-.32 + index * .055, -.484, 1.44), (.026, .008, .018), 'led', group)
    cube('UPS bypass plate', (.25, -.468, 1.5), (.26, .018, .2), 'metal', group, .004)
    cyl('UPS bypass switch', (.25, -.484, 1.5), .05, .02, 'dark', group, rot=(radians(90), 0, 0), segments=18)
    cube('UPS bypass knob', (.25, -.494, 1.52), (.055, .014, .024), 'amber', group)
    cube('UPS battery label', (.25, -.468, 1.54), (.2, .006, .04), 'paint', group)
    for index in range(5):
        cube('UPS bypass note', (.25, -.468, 1.4 - index * .026), (.18, .006, .012), 'dark', group)
    for x in (-.25, .25):
        for index in range(7):
            cube('UPS vent', (x, -.464, .28 + index * .05), (.42, .014, .022), 'black', group)
    cube('UPS warning label', (.33, -.462, .92), (.11, .01, .08), 'amber', group, .002)
    cube('UPS top panel', (0, 0, 1.955), (.96, .82, .03), 'metal', group, .004)
    for index in range(6):
        cube('UPS top louver', (-.3 + index * .12, 0, 1.972), (.05, .62, .012), 'black', group)
    cube('UPS cable entry', (0, .34, 1.92), (.34, .12, .1), 'dark', group, .004)
    for x in (-.5, .5):
        for index in range(4):
            cube('UPS side vent', (x, -.2 + index * .13, 1.3), (.012, .1, .28), 'black', group)


def build_distribution(group):
    """Distribution cabinet: main switch, three breaker rows, meter and door hardware."""
    cube('Distribution plinth', (0, 0, .05), (.98, .82, .1), 'dark', group, .006)
    cube('Distribution body', (0, 0, 1.03), (1.02, .86, 1.84), 'paint', group, .01)
    cube('Distribution door', (0, -.435, 1.03), (.94, .03, 1.82), 'shell', group, .005)
    cube('Distribution door inset', (0, -.455, 1.03), (.86, .012, 1.7), 'paint', group, .004)
    cube('Distribution meter bezel', (0, -.468, 1.79), (.4, .016, .18), 'black', group, .003)
    cube('Distribution meter', (0, -.478, 1.79), (.32, .008, .1), 'screen', group)
    cube('Distribution bus plate', (0, -.462, 1.3), (.82, .014, .62), 'dark', group, .003)
    for row in range(3):
        z = 1.46 - row * .16
        cube('Distribution DIN rail', (0, -.47, z), (.8, .01, .028), 'metal', group)
        for col in range(6):
            x = -.3 + col * .12
            cube('Distribution breaker', (x, -.474, z + .045), (.075, .026, .07), 'black', group, .003)
            cube('Distribution toggle', (x, -.49, z + .055), (.03, .014, .026), 'metal', group)
            cube('Distribution breaker tag', (x, -.488, z + .012), (.04, .008, .016), 'amber', group)
    cube('Distribution main switch', (-.28, -.47, .86), (.2, .02, .26), 'metal', group, .004)
    cyl('Distribution main handle', (-.28, -.49, .86), .06, .035, 'dark', group, rot=(radians(90), 0, 0), segments=18)
    cube('Distribution handle', (.4, -.47, 1.24), (.03, .035, .24), 'metal', group, .004)
    cube('Distribution lock', (.4, -.478, 1.04), (.05, .02, .04), 'dark', group)
    for index in range(3):
        cube('Distribution hinge', (-.45, -.462, .6 + index * .45), (.035, .03, .12), 'metal', group)
    cube('Distribution warning label', (0, -.458, 1.62), (.34, .01, .1), 'amber', group, .002)
    for index in range(6):
        cube('Distribution vent', (0, -.452, .22 + index * .045), (.66, .012, .018), 'black', group)
    cube('Distribution top', (0, 0, 1.955), (.98, .82, .03), 'metal', group, .004)
    cube('Distribution cable entry', (0, .32, 1.94), (.3, .12, .08), 'dark', group, .004)


def build_rack_pdu(group):
    """Zero-U rack PDU: outlet strip, breaker, status light and mounting ears."""
    cube('Rack PDU body', (0, 0, .62), (.11, .15, 1.22), 'dark', group, .005)
    cube('Rack PDU face', (0, -.078, .62), (.09, .012, 1.14), 'paint', group, .003)
    for index in range(8):
        z = .17 + index * .105
        cube('Rack PDU outlet', (0, -.086, z), (.058, .014, .056), 'black', group, .003)
        cube('Rack PDU outlet slot', (0, -.094, z + .008), (.018, .008, .012), 'dark', group)
        if index % 3 == 0:
            cube('Rack PDU indicator', (.036, -.09, z - .022), (.012, .008, .01), 'led', group)
    cube('Rack PDU breaker', (0, -.086, 1.14), (.05, .016, .05), 'metal', group, .002)
    cube('Rack PDU breaker lever', (0, -.098, 1.14), (.018, .012, .026), 'dark', group)
    cube('Rack PDU inlet', (0, -.085, 1.22), (.055, .02, .04), 'metal', group, .003)
    for z in (.06, 1.18):
        cube('Rack PDU ear', (0, -.01, z), (.2, .05, .02), 'metal', group, .003)
    cube('Rack PDU label', (0, -.09, 1.03), (.07, .006, .05), 'amber', group)


def build_crac(group):
    """Downflow room cooler: top return grille with fans, coil, low supply opening."""
    cube('CRAC base', (0, 0, .06), (1.12, .98, .12), 'dark', group, .006)
    cube('CRAC body', (0, 0, .99), (1.14, .98, 1.62), 'paint', group, .01)
    cube('CRAC top', (0, 0, 1.83), (1.18, 1.0, .05), 'metal', group, .006)
    # Return opening (top of the front face) with two visible fans.
    cube('CRAC return frame top', (0, -.498, 1.82), (1.04, .03, .04), 'metal', group, .004)
    cube('CRAC return frame bottom', (0, -.498, 1.5), (1.04, .03, .04), 'metal', group, .004)
    for x in (-.52, .52):
        cube('CRAC return frame side', (x, -.498, 1.66), (.04, .03, .36), 'metal', group, .004)
    cube('CRAC return duct', (0, -.47, 1.66), (1.0, .05, .3), 'black', group)
    fan('CRAC fan A', (-.245, -.49, 1.66), .135, group)
    fan('CRAC fan B', (.245, -.49, 1.66), .135, group)
    # Coil behind a louvered panel.
    cube('CRAC coil housing', (0, -.47, 1.3), (1.0, .06, .34), 'dark', group)
    cube('CRAC coil', (0, -.49, 1.3), (.9, .04, .26), 'coil', group)
    for index in range(11):
        cube('CRAC coil fin', (-.4 + index * .08, -.5, 1.3), (.012, .02, .26), 'dark', group)
    for index in range(2):
        cube('CRAC louver', (0, -.505, 1.42 - index * .06), (.94, .014, .014), 'metal', group)
    cube('CRAC louver frame', (0, -.492, 1.3), (1.02, .03, .4), 'metal', group, .004)
    # Control display.
    cube('CRAC display bezel', (0, -.5, 1.06), (.36, .02, .18), 'black', group, .003)
    cube('CRAC display', (0, -.512, 1.06), (.3, .008, .11), 'screen', group)
    for index in range(3):
        cube('CRAC indicator', ([-.3, -.26, -.22][index], -.5, .9), (.022, .012, .018), 'led', group)
    cube('CRAC service door', (0, -.468, .72), (.98, .02, .3), 'shell', group, .004)
    cube('CRAC door handle', (.4, -.492, .72), (.04, .03, .16), 'dark', group, .003)
    # Low supply opening feeding the raised-floor plenum.
    cube('CRAC supply frame', (0, -.49, .28), (.98, .03, .22), 'metal', group, .004)
    cube('CRAC supply mouth', (0, -.478, .28), (.9, .04, .16), 'black', group)
    cube('CRAC supply lip', (0, -.5, .17), (.92, .05, .04), 'cold', group)
    for index in range(3):
        cube('CRAC supply vane', (0, -.49, .23 + index * .045), (.86, .014, .012), 'metal', group)
    # Door seams, latches and side service panel.
    for x in (-.575, .575):
        cube('CRAC side panel', (x, .03, 1.05), (.02, .72, .9), 'metal', group, .004)
        for index in range(4):
            cube('CRAC panel screw', (x + (-.012 if x < 0 else .012), -.3, .72 + index * .22), (.014, .014, .014), 'dark', group)
    for z in (1.42, .72):
        cube('CRAC latch', (.44, -.505, z), (.05, .03, .09), 'dark', group, .003)
    cube('CRAC nameplate', (-.3, -.505, .62), (.3, .012, .1), 'metal', group, .002)
    for index in range(4):
        cube('CRAC top grille', (-.42 + index * .28, .12, 1.86), (.2, .5, .012), 'black', group)
    cyl('CRAC drain', (0, .52, .42), .03, .66, 'metal', group, segments=12)
    cube('CRAC drain elbow', (0, .52, .1), (.08, .1, .05), 'metal', group)


def build_floor_vent(group):
    """Perforated raised-floor tile used in both cold aisles."""
    cube('Floor tile frame', (0, 0, .022), (.74, .62, .044), 'metal', group, .004)
    cube('Floor tile recess', (0, 0, .04), (.66, .54, .016), 'black', group)
    for index in range(7):
        cube('Floor tile bar', (0, -.225 + index * .075, .046), (.64, .014, .014), 'paint', group)
    for index in range(6):
        cube('Floor tile rib', (-.275 + index * .11, 0, .05), (.014, .52, .012), 'paint', group)
    cube('Floor tile tab', (-.34, .25, .026), (.06, .08, .05), 'dark', group)


def build_fan_tray(group):
    """1U server fan module; blades spin in the web scene."""
    cube('Fan tray chassis', (0, 0, .08), (.76, .58, .16), 'paint', group, .006)
    cube('Fan tray face', (0, -.29, .08), (.74, .02, .14), 'shell', group, .004)
    for x in (-.185, .185):
        cube('Fan tray shroud', (x, -.292, .08), (.3, .022, .13), 'black', group, .003)
        cyl('Fan tray ring', (x, -.305, .08), .132, .02, 'metal', group, rot=(radians(90), 0, 0), segments=24)
    fan('Tray fan A', (-.185, -.3, .08), .115, group, ring=False)
    fan('Tray fan B', (.185, -.3, .08), .115, group, ring=False)
    cube('Fan tray handle', (0, -.302, .015), (.22, .018, .016), 'metal', group)
    cube('Fan tray connector', (0, .3, .08), (.24, .04, .08), 'metal', group, .003)
    cube('Fan tray label', (.3, -.3, .13), (.08, .01, .03), 'amber', group)


def build_feed_panel(group):
    """Wall-mounted utility feed box that starts the teaching power chain."""
    cube('Feed enclosure', (0, 0, .7), (.5, .14, .72), 'paint', group, .008)
    cube('Feed door', (0, -.08, .7), (.44, .02, .64), 'shell', group, .004)
    cube('Feed meter', (0, -.095, .86), (.24, .01, .12), 'screen', group)
    cube('Feed breaker', (0, -.095, .66), (.06, .02, .08), 'black', group, .003)
    cube('Feed label', (0, -.095, .46), (.2, .008, .06), 'amber', group)
    for index in range(4):
        cube('Feed gland', (-.15 + index * .1, .08, .3), (.06, .06, .1), 'metal', group)


DEVICES = [
    ('ups', build_ups, [-4.4]),
    ('distribution', build_distribution, [-2.6]),
    ('rack_pdu', build_rack_pdu, [-1.1]),
    ('crac', build_crac, [.6]),
    ('floor_vent', build_floor_vent, [2.2]),
    ('fan_tray', build_fan_tray, [3.4]),
    ('feed_panel', build_feed_panel, [4.6]),
]


# ---- Part split -----------------------------------------------------------
# Each serviceable device keeps a few named part groups so the page can pull the
# insides out (battery, breakers, coil ...) instead of merging everything by
# material. Geometry is untouched; only the grouping changes.
PART_RULES = {
    'ups': [
        ('part_ups_battery', lambda n: 'vent' in n or 'battery' in n or 'warning' in n),
        ('part_ups_door', lambda n: 'door' in n or 'handle' in n),
        ('part_ups_control', lambda n: 'display' in n or 'indicator' in n or 'bypass' in n or 'louver' in n),
        ('part_ups_cabinet', lambda n: n in ('UPS body', 'UPS plinth', 'UPS top panel', 'UPS cable entry')),
    ],
    'distribution': [
        ('part_dist_breakers', lambda n: 'breaker' in n or 'toggle' in n or 'DIN rail' in n or 'bus plate' in n),
        ('part_dist_switch', lambda n: 'main switch' in n or 'main handle' in n or n in ('Distribution handle', 'Distribution lock')),
        ('part_dist_meter', lambda n: 'meter' in n),
        ('part_dist_door', lambda n: 'door' in n or n in ('Distribution handle', 'Distribution lock', 'Distribution hinge')),
        ('part_dist_cabinet', lambda n: True),
    ],
    'crac': [
        ('part_crac_fans', lambda n: n.startswith('CRAC fan') or 'return' in n),
        ('part_crac_coil', lambda n: 'coil' in n or 'louver' in n),
        ('part_crac_control', lambda n: 'display' in n or 'indicator' in n or 'service door' in n or 'door handle' in n or 'latch' in n or 'nameplate' in n),
        ('part_crac_cabinet', lambda n: True),
    ],
}


def split_parts(group, rules):
    """Reparent the loose build objects into named part groups and join each."""
    # Re-read the live children each round: joining removes objects, so a
    # snapshot would hold dead references.
    for name, match in rules:
        part = empty(name)
        part.parent = group
        chosen = [obj for obj in list(group.children)
                  if obj is not part and obj.parent is group and not obj.name.startswith('part_') and match(obj.name)]
        for obj in chosen:
            obj.parent = part
        meshes = [obj for obj in part.children if obj.type == 'MESH']
        if len(meshes) > 1:
            bpy.ops.object.select_all(action='DESELECT')
            for obj in meshes:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = meshes[0]
            bpy.ops.object.join()
        if meshes:
            bpy.ops.object.select_all(action='DESELECT')
            meshes[0].select_set(True)
            bpy.context.view_layer.objects.active = meshes[0]
            meshes[0].name = name
            bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    return group


def main():
    reset()
    groups = []
    for name, builder, _ in DEVICES:
        group = empty(name)
        builder(group)
        if name in PART_RULES:
            split_parts(group, PART_RULES[name])
        else:
            join_by_material(group)
        groups.append((name, group))
    # Spread the devices for a readable source file only; the page repositions
    # each cloned assembly with its own room coordinates.
    for (name, group), (_, _, xs) in zip(groups, DEVICES):
        group.location = (xs[0], 0, 0)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'blender' / 'source' / 'infrastructure.blend'))
    bpy.ops.export_scene.gltf(filepath=str(ROOT / 'public' / 'models' / 'infrastructure.glb'),
                              export_format='GLB', export_cameras=False, export_lights=False,
                              export_apply=True)
    print('INFRASTRUCTURE_ASSET_READY', ROOT / 'public' / 'models' / 'infrastructure.glb')


main()
