import { Box } from './primitives.jsx';
import { twinPalette } from '../data/twinData.js';

// Right-front service strip. Everything here stays inside the floor's opaque
// core (|x| ≤ 5.1, z ≤ 3.3) so no prop straddles the fade band, and every piece
// is inert: no click handlers and no raycast, so it cannot take a click meant
// for a rack or a request anchor.
const inert = { raycast: () => null };

const marking = '#1d4a68';

function SparesCabinet({ position }) {
  return <group position={position}>
    <Box {...inert} position={[0,.06,0]} size={[.76,.12,.46]} color="#182635" roughness={.72} metalness={.25} />
    <Box {...inert} position={[0,.62,0]} size={[.72,1.02,.42]} color="#243443" roughness={.48} metalness={.4} />
    <Box {...inert} position={[0,.63,.212]} size={[.62,.84,.014]} color="#1a2a38" roughness={.45} metalness={.45} />
    <Box {...inert} position={[0,.63,.221]} size={[.05,.84,.008]} color={twinPalette.accentDeep} metalness={.4} />
    <Box {...inert} position={[.18,.69,.224]} size={[.19,.022,.012]} color={twinPalette.accent} metalness={.5} />
    <Box {...inert} position={[0,1.16,0]} size={[.74,.06,.44]} color="#2a3c4c" roughness={.55} />
  </group>;
}

function PalletStack({ position }) {
  return <group position={position}>
    <Box {...inert} position={[0,.045,0]} size={[.85,.09,.65]} color="#1c2a37" roughness={.9} />
    <Box {...inert} position={[-.18,.21,0]} size={[.38,.24,.42]} color="#263847" roughness={.7} />
    <Box {...inert} position={[.2,.18,.02]} size={[.3,.18,.36]} color="#20303e" roughness={.7} />
    <Box {...inert} position={[.02,.37,0]} size={[.28,.14,.3]} color="#2b3d4d" roughness={.7} />
  </group>;
}

function ServiceCart({ position }) {
  const posts = [[-.26,-.19],[.26,-.19],[-.26,.19],[.26,.19]];
  return <group position={position}>
    {posts.map(([x,z]) => <group key={`p${x}-${z}`}>
      <Box {...inert} position={[x,.42,z]} size={[.035,.8,.035]} color="#3b4e5f" metalness={.65} roughness={.35} />
      <Box {...inert} position={[x,.045,z]} size={[.055,.09,.055]} color="#14212c" roughness={.7} />
    </group>)}
    <Box {...inert} position={[0,.14,0]} size={[.56,.04,.42]} color="#263745" roughness={.6} />
    <Box {...inert} position={[0,.82,0]} size={[.56,.035,.42]} color="#263745" roughness={.6} />
    <Box {...inert} position={[.28,.95,0]} size={[.03,.03,.42]} color="#3b4e5f" metalness={.65} />
    <Box {...inert} position={[0,.24,0]} size={[.3,.15,.26]} color="#1f303e" roughness={.7} />
  </group>;
}

export default function FloorProps() {
  return <group>
    {/* Aisle markings: thin slabs on the floor plane, not clickable. */}
    <Box {...inert} position={[-.1,.006,1.32]} size={[7.6,.012,.06]} color={marking} metalness={.4} castShadow={false} />
    <Box {...inert} position={[1.35,.006,3.05]} size={[5.4,.012,.06]} color={marking} metalness={.4} castShadow={false} />
    <SparesCabinet position={[4.7,0,1.7]} />
    <PalletStack position={[4.2,0,2.45]} />
    <ServiceCart position={[4.55,0,3.1]} />
  </group>;
}
