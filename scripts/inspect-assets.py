"""Inspect the embedded glTF JSON without Blender or third-party packages."""
import json
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
stats = []
for path in sorted((ROOT/'public'/'models').glob('*.glb')):
    raw = path.read_bytes()
    assert raw[:4] == b'glTF', path
    length = struct.unpack_from('<I',raw,12)[0]
    gltf = json.loads(raw[20:20+length])
    triangles = 0
    for mesh in gltf.get('meshes',[]):
        for primitive in mesh['primitives']:
            if primitive.get('mode',4) == 4:
                accessor = primitive.get('indices',primitive['attributes']['POSITION'])
                triangles += gltf['accessors'][accessor]['count']//3
    roots = [node.get('name') for node in gltf['nodes'] if 'mesh' not in node]
    if path.stem.endswith('rack'):
        assert {'enclosure','server_bank','rack_frame'} <= set(roots), roots
    required = {'network-rack': set(),
                'storage-rack': set(),
                'infrastructure': {'ups','distribution','rack_pdu','crac','floor_vent','fan_tray','feed_panel','CRAC fan A','Tray fan A'}}.get(path.stem, set())
    assert required <= set(roots), (path, required - set(roots))
    parts = []
    if path.stem.endswith('rack'):
        bank = next(node for node in gltf['nodes'] if node.get('name') == 'server_bank')
        children = bank.get('children', [])
        parts = sorted(gltf['nodes'][index].get('name') for index in children)
        contract = {
            'server-rack': [f'part_server_{index:02d}' for index in range(1, 10)],
            'network-rack': ['part_patch_panel','part_patch_leads','part_forwarding_unit',
                             'part_ingress_ports','part_compute_ports','part_storage_ports',
                             'part_standby_switch','part_cable_manager'],
            'storage-rack': ['part_controller_01','part_controller_02',
                             *[f'part_shelf_{index:02d}' for index in range(1, 6)]],
            'backup-rack': ['part_backup_server_01','part_backup_server_02','part_tape_library',
                            'part_backup_shelf_01','part_backup_shelf_02'],
        }[path.stem]
        assert set(contract) <= set(parts), (path, sorted(set(contract) - set(parts)))
        # Server parts and every network/storage part must be real geometry; only
        # the two compute anchors are allowed to stay mesh-less because the web
        # already renders FanTray/RackPdu at those coordinates.
        anchors = ['part_fan_tray', 'part_pdu']
        assert all(gltf['nodes'][index].get('mesh') is not None
                   for index in children
                   if gltf['nodes'][index].get('name') in contract
                   and gltf['nodes'][index].get('name') not in anchors), path
        if path.stem == 'server-rack':
            assert set(anchors) <= set(parts), (path, 'missing anchors', sorted(set(anchors) - set(parts)))
            assert all(gltf['nodes'][index].get('mesh') is None
                       for index in children
                       if gltf['nodes'][index].get('name') in anchors), (path, 'anchor must stay mesh-less')
    assert all('uri' not in buffer for buffer in gltf.get('buffers',[])), path
    entry = dict(file=path.name,bytes=len(raw),meshes=len(gltf.get('meshes',[])),
                 materials=len(gltf.get('materials',[])),triangles=triangles,
                 textures=len(gltf.get('textures',[])),nodes=roots)
    if parts:
        entry['parts'] = parts
    stats.append(entry)
output = ROOT/'outputs'/'equipment-assets.json'
output.parent.mkdir(parents=True,exist_ok=True)
output.write_text(json.dumps(stats,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(stats,ensure_ascii=False,indent=2))
