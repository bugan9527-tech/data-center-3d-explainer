import { racks } from './roomLayout.js';

// Each pose frames a world box (width × height) at a given vertical fov; the rig
// turns that into a camera distance, so `position` only supplies the direction.
// Overview keeps a long lens (14°) to stay close to the old orthographic look;
// chapters sit at 30°, close-ups open up to 45° so the room reads from inside.
export const roomCameras = [
  { id: 'overview', title: '机房总览', position: [12,10.5,16], target: [.4,.6,-.5], width: 15.2, height: 10.8, fov: 14 },
  { id: 'network', title: '网络设备', position: [-.8,5.9,8.8], target: [-2.7,1,.1], width: 9.8, height: 8.4, fov: 30 },
  { id: 'compute', title: '计算服务器', position: [4.2,5.6,9], target: [-.9,1,0], width: 9.5, height: 8.4, fov: 30 },
  { id: 'storage', title: '存储设备', position: [7.2,5.4,8.5], target: [1.9,1,.1], width: 9.2, height: 8.2, fov: 30 },
  { id: 'power', title: 'UPS 与配电', position: [6.4,6.2,5.2], target: [2.4,1,-2.9], width: 9.2, height: 8.2, fov: 30 },
  { id: 'cooling', title: '制冷设备', position: [-.3,6.4,5.1], target: [-3.1,1,-2.7], width: 9.2, height: 8.2, fov: 30 },
];

// Original close-ups still used by 6 of the 13 support nodes; the other seven nodes
// are covered by functionCameras below. Triggered only by the 特写 button.
export const supportCameras = {
  'power-feed': { position: [6.6, 3.1, -.7], target: [4.55, 1.55, -4.3], width: 3.0, height: 2.7, fov: 34 },
  'power-ups': { position: [4.2, 2.9, 1.2], target: [2.6, 1.15, -3.55], width: 3.0, height: 2.7, fov: 40 },
  'power-pdu': { position: [5.7, 2.9, 1.2], target: [3.9, 1.15, -3.55], width: 3.0, height: 2.7, fov: 40 },
  'cool-crac': { position: [-5.5, 4.9, 2.2], target: [-3.75, 1.0, -3.45], width: 4.8, height: 4.3, fov: 36 },
  'cool-vent': { position: [1.3, 4.2, 5.4], target: [-1.65, .45, 1.5], width: 4.4, height: 3.9, fov: 38 },
  'cool-air': { position: [-3.3, 2.2, 4.0], target: [-1.65, 1.25, .8], width: 2.6, height: 2.3, fov: 45 },
};

// Interior viewpoints, reached only from a support step's 特写 button. The eye is
// meant to sit exactly where `position` says, so the framing box is solved back
// from that distance: height = 2 · |position − target| · tan(fov/2), width = height.
// With a square box the derived distance lands on the authored eye at landscape
// sizes and only drifts ~10% on portrait ones.
export const functionCameras = {
  // Eye 1.55 at the front row's cold aisle, looking down the row along +x.
  'cold-aisle': { position: [-3.4, 1.55, 1.9], target: [1.2, 1.15, 1.75], width: 4.81, height: 4.81, fov: 55 },
  // Eye 1.7 between the two rows, the hot aisle the exhausts face into.
  'hot-aisle': { position: [-4.75, 1.7, -.27], target: [1.4, 1.0, -.28], width: 5.77, height: 5.77, fov: 50 },
  // Straight on the C01 front, 1.7 out, centred at 1.25 so the whole rack fits.
  'rack-front': { position: [-1.65, 1.3, 2.8], target: [-1.65, 1.25, 1.1], width: 1.96, height: 1.96, fov: 60 },
  // From knee height up at the busway running over the rows at y = 2.86.
  'busway-up': { position: [1.4, .35, 2.3], target: [1.0, 2.86, -.27], width: 3.76, height: 3.76, fov: 55 },
  // Eye 0.5 skimming the floor along the supply run toward a front-row vent.
  'floor-low': { position: [-2.6, .5, 3.3], target: [.2, .12, 1.9], width: 3.08, height: 3.08, fov: 52 },
};

// P2-3: two support base views, applied only when entering 持续支撑 or
// switching its power/cooling chapter. The power view sits to the right and
// frames UPS → distribution → busway → C01; the cooling view sits to the left,
// frames both CRACs, the floor and the front-row inlet side, and lifts the
// existing cooling pitch (33.1°) by ~7.0° so the supply band sits mid-frame.
export const teardownCameras = {
  'teardown-network': { position: [-3.3, 3.3, 6.4], target: [-3.2, 1.1, .65], width: 5.4, height: 4.4, fov: 34 },
  'teardown-compute': { position: [-1.3, 3.3, 6.4], target: [-1.2, 1.1, .65], width: 5.4, height: 4.4, fov: 34 },
  'teardown-storage': { position: [2.45, 3.3, 6.4], target: [2.55, 1.1, .65], width: 5.4, height: 4.4, fov: 34 },
  // B01 faces -z like the rest of the rear row, so this one has to look back from
  // the rear-left corner: the back wall rules out a straight-on view.
  'teardown-backup': { position: [-.8, 2.55, -3.9], target: [2.1, 1.2, -1.3], width: 3.4, height: 2.8, fov: 36 },
};

// Four close-ups cover the nine rows plus the top fan tray; the detail list maps
// each part to one of them instead of authoring eleven separate poses.
export const teardownPartCameras = {
  'teardown-part-low': { position: [-1.65, 1.55, 3.0], target: [-1.65, .62, 1.45], width: 1.35, height: 1.0, fov: 38 },
  'teardown-part-mid': { position: [-1.65, 1.75, 3.0], target: [-1.65, 1.15, 1.45], width: 1.35, height: 1.0, fov: 38 },
  'teardown-part-high': { position: [-1.65, 2.25, 3.0], target: [-1.65, 1.69, 1.45], width: 1.35, height: 1.0, fov: 38 },
  'teardown-part-top': { position: [-1.65, 2.6, 2.8], target: [-1.65, 2.0, 1.4], width: 1.3, height: 1.0, fov: 38 },
  // The PDU sits on the cabinet's left edge, so it needs its own left-front view
  // instead of the rack-centred low pose.
  'teardown-part-pdu': { position: [-2.35, 1.15, 3.0], target: [-2.16, .45, 1.52], width: 1.6, height: 1.4, fov: 32 },
  // Network and storage keep one rack-focused view for every part: their blocks
  // are wide, and a per-part close-up from the front is blocked by the parts
  // already pulled toward the camera.
  'teardown-network-parts': { position: [-3.3, 3.0, 6.2], target: [-3.2, 1.1, .65], width: 4.4, height: 3.8, fov: 34 },
  'teardown-storage-parts': { position: [2.45, 3.0, 6.2], target: [2.55, 1.1, .65], width: 4.4, height: 3.8, fov: 34 },
};

export const infraCameras = {
  'teardown-ups': { position: [5.6, 2.35, 1.9], target: [3.05, 1.0, -3.5], width: 4.2, height: 3.6, fov: 34 },
  'teardown-distribution': { position: [6.4, 2.35, 1.6], target: [4.2, 1.0, -3.5], width: 4.2, height: 3.6, fov: 34 },
  'teardown-crac': { position: [-6.9, 2.35, 1.9], target: [-3.85, 1.0, -3.5], width: 4.4, height: 3.8, fov: 34 },
  // The exterior platform sits outside the raised floor, so this one frames from
  // the open right side instead of through the room.
  'teardown-genset': { position: [10.4, 2.6, -.8], target: [7.0, .85, -2.2], width: 6.6, height: 5.6, fov: 34 },
};

export const supportBaseCameras = {
  'support-power': { position: [7.8, 5.9, 6.8], target: [1.5, 1.0, -1.9], width: 15.8, height: 9.88, fov: 30 },
  'support-cooling': { position: [-10.27, 13.16, 10.36], target: [-.5, .6, -.9], width: 17.1, height: 10.69, fov: 30 },
};

export function cameraPose(id, rackId) {
  if (id === 'entry') {
    const rack = racks.find(rack => rack.id === rackId) || racks[2];
    return { position: [rack.x+2.4,3.1,rack.z+6], target: [rack.x,1.1,rack.z], width: 5.5, height: 5.5, fov: 32 };
  }
  // Double-click inspection: stand on the cabinet's own front side, a few metres
  // out, so the whole rack fits without entering the teardown pose.
  if (id === 'rack-close') {
    const rack = racks.find(rack => rack.id === rackId) || racks[2];
    const facing = Math.cos(rack.rotation || 0) >= 0 ? 1 : -1;
    return {
      position: [rack.x + 1.15, 2.55, rack.z + facing * 4.1],
      target: [rack.x, 1.2, rack.z],
      width: 3.4, height: 3.0, fov: 36,
    };
  }
  // Monitoring has a location action while the six chapter views stay unchanged.
  if (id === 'monitoring') return { position: [3.5,5.2,4.7], target: [.2,1.7,-3.7], width: 9.2, height: 8.2, fov: 30 };
  if (supportBaseCameras[id]) return supportBaseCameras[id];
  if (teardownCameras[id]) return teardownCameras[id];
  if (infraCameras[id]) return infraCameras[id];
  if (teardownPartCameras[id]) return teardownPartCameras[id];
  if (supportCameras[id]) return supportCameras[id];
  if (functionCameras[id]) return functionCameras[id];
  return roomCameras.find(pose => pose.id === id) || roomCameras[0];
}
