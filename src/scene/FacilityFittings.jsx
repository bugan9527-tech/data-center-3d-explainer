import { Box } from './primitives.jsx';

// Small building-services fittings that the requirement doc lists but the scene
// still lacked: leak detection, the earthing bar and emergency lighting. They are
// deliberately thin and low-contrast so they never compete with the racks.
//
// Mounting rule learned the hard way: the left wall dissolves from y 1.15 up, so
// everything here hangs on the back wall (solid to y 2.4) or lies on the floor.

function LeakTape({ points, end }) {
  return <group>
    {points.slice(0, -1).map((from, index) => {
      const to = points[index + 1];
      const alongX = Math.abs(to[0] - from[0]) > Math.abs(to[2] - from[2]);
      const length = alongX ? Math.abs(to[0] - from[0]) : Math.abs(to[2] - from[2]);
      return <Box key={index}
        position={[(from[0] + to[0]) / 2, .022, (from[2] + to[2]) / 2]}
        size={alongX ? [length, .02, .04] : [.04, .02, length]}
        color="#3f9aa8" roughness={.55} metalness={.2} />;
    })}
    <Box position={end} size={[.14, .10, .11]} color="#1d3b45" roughness={.5} metalness={.3} />
    <Box position={[end[0], end[1] + .028, end[2]]} size={[.06, .012, .05]} color="#4fd1e0" roughness={.4} />
  </group>;
}

// Flat copper bar on the back wall with three risers down to the floor: the
// equal-potential bond every rack row is tied to.
function EarthingBar() {
  const risers = [4.25, 5.45];
  return <group>
    <Box position={[4.85, .46, -4.755]} size={[1.7, .06, .018]} color="#c98a3c" metalness={.85} roughness={.35} />
    {risers.map((x) => <group key={x}>
      <Box position={[x, .23, -4.755]} size={[.04, .46, .016]} color="#c98a3c" metalness={.85} roughness={.35} />
      <Box position={[x, .014, -4.70]} size={[.09, .028, .14]} color="#a9702f" metalness={.8} roughness={.4} />
    </group>)}
    <Box position={[5.72, .46, -4.755]} size={[.16, .11, .026]} color="#6c7982" roughness={.5} />
  </group>;
}

function EmergencyLight({ position }) {
  return <group position={position}>
    <Box position={[0, 0, 0]} size={[.24, .11, .06]} color="#cfd8de" roughness={.5} />
    <Box position={[0, -.012, .032]} size={[.19, .055, .012]} color="#f4e9c8" roughness={.35}
      emissive="#f4e9c8" emissiveIntensity={.55} />
    <Box position={[0, .062, -.02]} size={[.05, .02, .02]} color="#8b98a2" metalness={.5} />
  </group>;
}

export default function FacilityFittings({ monitoringVisible = true, powerVisible = true }) {
  return <group>
    {monitoringVisible && <>
      {/* Along the CRAC fronts and again along the back wall — the two places a
          chilled-water leak would show up first. */}
      <LeakTape points={[[-5.1, 0, -2.95], [4.0, 0, -2.95]]} end={[4.12, .06, -2.95]} />
      <LeakTape points={[[-5.5, 0, -4.58], [4.5, 0, -4.58]]} end={[4.62, .06, -4.58]} />
    </>}
    {powerVisible && <>
      <EarthingBar />
      <EmergencyLight position={[-3.9, 2.32, -4.75]} />
      <EmergencyLight position={[3.6, 2.32, -4.75]} />
    </>}
  </group>;
}
