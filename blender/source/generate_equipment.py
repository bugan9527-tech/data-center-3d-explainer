"""Network / storage cabinets. Run with Blender 4.5 in background.

The common enclosure is intentionally shared in proportion, while the functional
assemblies differ in geometry. X=width, -Y=front, Z=up. No external resources.

S5: every functional assembly is a single `part_*` mesh whose origin sits at its
geometry centre, matching the compute cabinet contract so the web teardown can
add a pull-out offset to the recorded base instead of overwriting it.
"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

NETWORK_PARTS = [
    'part_patch_panel', 'part_patch_leads', 'part_forwarding_unit',
    'part_ingress_ports', 'part_compute_ports', 'part_storage_ports',
    'part_standby_switch', 'part_cable_manager',
    'part_edge_router', 'part_firewall', 'part_storage_switch', 'part_mgmt_switch',
]
STORAGE_PARTS = ['part_controller_01', 'part_controller_02',
                 *[f'part_shelf_{index:02d}' for index in range(1, 6)]]
BACKUP_PARTS = ['part_backup_server_01', 'part_backup_server_02', 'part_tape_library',
                'part_backup_shelf_01', 'part_backup_shelf_02']


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


def empty(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def box(name, location, size, mat, parent, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.parent = parent
    if bevel:
        mod = obj.modifiers.new('Manufactured edges', 'BEVEL')
        mod.width, mod.segments = bevel, 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


def cable(points, mat, parent):
    data = bpy.data.curves.new('Patch lead', 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth, data.bevel_resolution = .009, 2
    spline = data.splines.new('BEZIER')
    spline.bezier_points.add(len(points)-1)
    for point, co in zip(spline.bezier_points, points):
        point.co = co
        point.handle_left_type = point.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new('Patch lead', data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = parent
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)


def join(objects, name=None):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    if name:
        objects[0].name = name
    return objects[0]


def generate(kind):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Remove orphan assets between exports; no hidden geometry in the GLB.
    for data in list(bpy.data.materials):
        if not data.users:
            bpy.data.materials.remove(data)
    mats = {
        'frame': material('Graphite steel', (.075,.105,.14), .65,.38),
        'shell': material('Cabinet panels', (.13,.17,.21), .55,.45),
        'silver': material('Brushed aluminum', (.48,.54,.59), .7,.36),
        'black': material('Recessed ports and vents', (.018,.03,.042), .1,.85),
        'blue': material('Blue patch leads', (.025,.25,.58), .15,.5),
        'teal': material('Storage release catches', (.035,.38,.4), .25,.5),
        'led': material('Status indicators', (.1,.75,.48), .1,.4,1.5),
    }
    shell, bank, frame = empty('enclosure'), empty('server_bank'), empty('rack_frame')

    def b(name, loc, size, key, group, bevel=0):
        return box(name, loc, size, mats[key], group, bevel)

    for x in [-.415,.415]:
        for y in [-.545,.545]:
            b('Upright', (x,y,1.1), (.045,.055,2.2), 'frame', frame,.006)
        b('Side panel',(x,0,1.14),(.025,1.04,2.08),'shell',shell,.006)
    for z in [.065,2.19]:
        b('Frame cross member',(0,0,z),(.86,1.15,.065),'frame',frame,.008)
    b('Top cover',(0,0,2.2),(.84,1.1,.035),'shell',shell,.006)
    b('Rear panel',(0,.55,1.12),(.78,.025,2.08),'shell',shell)
    for x in [-.35,.35]:
        for y in [-.45,.45]:
            b('Adjustable foot',(x,y,.015),(.1,.1,.03),'black',frame)

    defs = NETWORK_PARTS if kind == 'network' else BACKUP_PARTS if kind == 'backup' else STORAGE_PARTS
    groups = {}
    for name in defs:
        groups[name] = empty(name)
        groups[name].parent = bank

    if kind == 'network':
        # Two patch fields above two switching units. The upper switch owns the
        # three grouped port fields; the lower unit stays as a standby assembly.
        patch, leads = groups['part_patch_panel'], groups['part_patch_leads']
        forwarding = groups['part_forwarding_unit']
        ingress, compute = groups['part_ingress_ports'], groups['part_compute_ports']
        storage_ports = groups['part_storage_ports']
        standby, cabling = groups['part_standby_switch'], groups['part_cable_manager']
        for z in [1.89,1.65]:
            b('Patch panel',(0,-.49,z),(.75,.08,.18),'frame',patch,bevel=.005)
            for col in range(8):
                x = -.29+col*.083
                b('Patch socket surround',(x,-.538,z),(.058,.012,.07),'silver',patch)
                b('Patch socket recess',(x,-.548,z),(.041,.008,.047),'black',patch)
        for z, chassis in [(1.29,forwarding),(.96,standby)]:
            b('Switch chassis',(0,-.01,z),(.75,.94,.23),'silver',chassis,bevel=.008)
            for row in [-1,1]:
                for col in range(8):
                    x = -.27+col*.071
                    port_group = (ingress if col < 2 else compute if col < 5 else storage_ports) if z == 1.29 else chassis
                    b('Grouped switch port',(x,-.489,z+row*.046),(.05,.018,.053),'black',port_group)
                    if col % 2 == 0:
                        b('Port indicator',(x,-.501,z+row*.046+.031),(.016,.008,.009),'led',port_group)
            b('Switch uplink',( .326,-.49,z),(.035,.02,.13),'blue',chassis)
        b('Cable management panel',(0,-.46,.46),(.75,.13,.53),'frame',cabling,bevel=.009)
        for index in range(8):
            b('Cable manager finger',(-.3+index*.087,-.55,.46),(.033,.12,.35),'black',cabling,bevel=.004)
        for index in range(4):
            x=-.25+index*.15
            cable([(x,-.56,1.65),(x-.03,-.7,1.55),(x+.04,-.7,1.39),(x+.04,-.52,1.336)],mats['blue'],leads)
        for x in [-.365,.365]:
            b('Vertical cable duct',(x,-.4,1.24),(.04,.08,1.6),'black',leads)

        # Edge, security and network-plane units fill the bays the original layout
        # left empty, so no existing assembly has to move: above the patch field,
        # between the patch field and the switches, between the two switches, and
        # between the cabling panel and the standby switch.
        edge, firewall = groups['part_edge_router'], groups['part_firewall']
        storage_switch, mgmt = groups['part_storage_switch'], groups['part_mgmt_switch']

        b('Edge router chassis',(0,-.02,2.08),(.75,.90,.13),'silver',edge,bevel=.006)
        for col in range(4):
            x=-.27+col*.075
            b('WAN port',(x,-.478,2.075),(.052,.016,.055),'black',edge)
            b('WAN link indicator',(x,-.489,2.111),(.014,.008,.009),'led',edge)
        b('Router console port',(.30,-.478,2.075),(.05,.016,.05),'blue',edge)

        b('Firewall chassis',(0,-.02,1.48),(.75,.90,.13),'silver',firewall,bevel=.006)
        for col in range(6):
            b('Firewall vent',(-.24+col*.055,-.478,1.48),(.03,.012,.07),'black',firewall)
        for col in range(2):
            b('Firewall status',(.24+col*.05,-.489,1.48),(.016,.008,.016),'led',firewall)
        b('Firewall bypass port',(-.33,-.478,1.48),(.05,.016,.055),'blue',firewall)

        b('Storage switch chassis',(0,-.02,1.125),(.75,.90,.085),'silver',storage_switch,bevel=.005)
        for col in range(6):
            b('Storage fabric port',(-.22+col*.06,-.478,1.125),(.045,.014,.045),'teal',storage_switch)
        b('Storage fabric indicator',(.30,-.489,1.125),(.014,.008,.009),'led',storage_switch)

        b('Management switch chassis',(0,-.02,.785),(.75,.90,.10),'silver',mgmt,bevel=.005)
        for col in range(10):
            b('Management port',(-.29+col*.064,-.478,.785),(.042,.014,.042),'black',mgmt)
        b('Management indicator',(.33,-.489,.785),(.014,.008,.009),'led',mgmt)
    elif kind == 'storage':
        # Five shelves, each owning its three disk carriers, plus two controllers.
        controller_one, controller_two = groups['part_controller_01'], groups['part_controller_02']
        shelves = [groups[f'part_shelf_{index:02d}'] for index in range(1, 6)]
        for row in range(5):
            z=.3+row*.285
            shelf = shelves[row]
            b('Storage shelf',(0,-.005,z),(.75,.96,.24),'frame',shelf,bevel=.008)
            for col in range(3):
                x=-.247+col*.247
                b('Disk carrier',(x,-.505,z),(.228,.05,.205),'silver',shelf,bevel=.004)
                b('Carrier inset',(x,-.537,z+.018),(.192,.018,.132),'black',shelf,bevel=.002)
                for slot in range(5):
                    b('Carrier ventilation',(x-.074+slot*.036,-.55,z+.023),(.013,.009,.078),'shell',shelf)
                b('Release handle',(x,-.563,z-.066),(.16,.023,.024),'teal',shelf,bevel=.003)
                b('Disk status',(x+.085,-.552,z+.075),(.014,.01,.016),'led',shelf)
        for z, controller in [(1.83,controller_two),(2.03,controller_one)]:
            b('Redundant controller',(0,-.01,z),(.75,.95,.16),'silver',controller,bevel=.006)
            for x in [-.25,-.13,.13,.25]:
                b('Controller data port',(x,-.5,z),(.075,.025,.06),'black',controller)
            b('Controller status',(0,-.52,z),(.022,.012,.022),'led',controller)
        # Two visible uplinks leave the primary controller toward the overhead tray.
        for x in [-.25,.25]:
            cable([(x,-.52,2.03),(x,-.63,2.12),(x,-.45,2.23),(x,.0,2.26)],mats['blue'],controller_one)

    else:
        # Backup cabinet: two backup servers on top, a tape library owning its
        # cartridge field, and two disk shelves. Deliberately a different
        # silhouette from the primary storage racks so the two read apart.
        server_one, server_two = groups['part_backup_server_01'], groups['part_backup_server_02']
        tape = groups['part_tape_library']
        shelves = [groups['part_backup_shelf_01'], groups['part_backup_shelf_02']]

        for z, server in [(1.96, server_one), (1.70, server_two)]:
            b('Backup server chassis',(0,-.02,z),(.75,.90,.22),'silver',server,bevel=.007)
            for col in range(3):
                b('Backup drive bay',(-.27+col*.09,-.478,z+.03),(.075,.018,.09),'black',server,bevel=.002)
            b('Backup server status',(0,-.489,z-.06),(.02,.008,.016),'led',server)
            b('Backup service port',(.31,-.478,z),(.05,.016,.05),'blue',server)

        # Tape library: 2 x 8 cartridge slots, an operator panel and a mail slot.
        b('Tape library chassis',(0,-.02,1.15),(.75,.90,.62),'frame',tape,bevel=.008)
        for row in range(2):
            for col in range(8):
                x=-.30+col*.085
                z=1.31-row*.20
                b('Cartridge slot',(x,-.478,z),(.07,.016,.155),'black',tape,bevel=.002)
                b('Cartridge handle',(x,-.49,z-.055),(.05,.012,.024),'teal',tape)
                b('Cartridge status',(x,-.49,z+.058),(.012,.008,.008),'led',tape)
        b('Library operator panel',(0,-.478,1.00),(.30,.020,.085),'black',tape,bevel=.002)
        b('Library mail slot',(.31,-.478,1.00),(.06,.020,.085),'silver',tape,bevel=.002)

        for z, shelf in [(.66, shelves[0]), (.34, shelves[1])]:
            b('Backup shelf',(0,-.005,z),(.75,.96,.24),'frame',shelf,bevel=.008)
            for col in range(3):
                x=-.247+col*.247
                b('Backup disk carrier',(x,-.505,z),(.228,.05,.205),'silver',shelf,bevel=.004)
                b('Backup carrier inset',(x,-.537,z+.018),(.192,.018,.132),'black',shelf,bevel=.002)
                b('Backup release handle',(x,-.563,z-.066),(.16,.023,.024),'teal',shelf,bevel=.003)
                b('Backup disk status',(x+.085,-.552,z+.075),(.014,.01,.016),'led',shelf)

    # The enclosure and frame keep one mesh per material, as before.
    for parent in [shell, frame]:
        for mat in mats.values():
            objects=[obj for obj in list(parent.children) if obj.type=='MESH' and obj.data.materials[0]==mat]
            if not objects:
                continue
            join(objects, parent.name+'_'+mat.name.replace(' ','_'))

    # Each functional group collapses to one part_* mesh. Its origin moves to the
    # geometry centre so the front end can treat the loaded translation as a base.
    for name in defs:
        group = groups[name]
        objects=[obj for obj in list(group.children) if obj.type=='MESH']
        if not objects:
            continue
        part = join(objects)
        part.parent = bank
        # Remove the empty before renaming; otherwise Blender suffixes the mesh
        # with `.001` because the empty still owns the plain name.
        bpy.data.objects.remove(group)
        part.name = name
        bpy.ops.object.select_all(action='DESELECT')
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    stem=kind+'-rack'
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/'source'/(stem+'.blend')))
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public'/'models'/(stem+'.glb')),export_format='GLB',export_cameras=False,export_lights=False)
    print('EQUIPMENT_ASSET_READY',stem)


for kind in ['network','storage','backup']:
    generate(kind)
