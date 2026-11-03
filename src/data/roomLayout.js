// The rear row is rotated so both rows face outward: their backs form the hot
// aisle in the middle and their fronts face the two cold aisles, matching the
// cooling arrows. All request anchors use the front row only.
export const racks = [
  { id: 'N01', kind: 'network', x: -3.65, z: .65 }, { id: 'N02', kind: 'network', x: -3.65, z: -1.15, rotation: Math.PI },
  { id: 'C01', kind: 'compute', x: -1.65, z: .65 }, { id: 'C02', kind: 'compute', x: -.3, z: .65 },
  { id: 'C03', kind: 'compute', x: -1.65, z: -1.15, rotation: Math.PI }, { id: 'C04', kind: 'compute', x: -.3, z: -1.15, rotation: Math.PI },
  { id: 'S01', kind: 'storage', x: 2.1, z: .65 }, { id: 'S02', kind: 'storage', x: 3.55, z: .65 },
  // Backup cabinet sits in the rear row beside the storage pair so the copy and
  // the primary it protects read as one group.
  { id: 'B01', kind: 'backup', x: 2.1, z: -1.15, rotation: Math.PI },
];

export const rackModels = { network: '/models/network-rack.glb', compute: '/models/server-rack.glb', storage: '/models/storage-rack.glb', backup: '/models/backup-rack.glb' };
