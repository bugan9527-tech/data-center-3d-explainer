export function Box({ position, size, color, metalness = .15, roughness = .65, ...props }) {
  return <mesh position={position} castShadow receiveShadow {...props}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
  </mesh>;
}
