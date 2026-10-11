/**
 * The signature visual for the auth screens: a schematic of a buried
 * grounding grid — a mesh of bonded conductors with ground rods at the
 * intersections — with one slow pulse showing fault current dissipating
 * outward from a strike point across the mesh. This is literally what
 * the product models, so it doubles as an explanation, not just decor.
 */
export function GroundingGridArt() {
  const cols = [40, 100, 160, 220, 280, 340];
  const rows = [40, 100, 160, 220, 280, 340];
  const strike = { x: 160, y: 160 };

  return (
    <svg
      viewBox="0 0 380 380"
      className="h-full w-full"
      role="img"
      aria-label="نمای شماتیک شبکه زمین"
    >
      <defs>
        <radialGradient id="strikeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-copper-text)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--color-copper-text)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* mesh conductors */}
      {rows.map((y) => (
        <line
          key={`h-${y}`}
          x1={cols[0]}
          y1={y}
          x2={cols[cols.length - 1]}
          y2={y}
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
      ))}
      {cols.map((x) => (
        <line
          key={`v-${x}`}
          x1={x}
          y1={rows[0]}
          x2={x}
          y2={rows[rows.length - 1]}
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
      ))}

      {/* ground rods at each node */}
      {rows.map((y) =>
        cols.map((x) => (
          <circle key={`n-${x}-${y}`} cx={x} cy={y} r="3" fill="var(--color-surface-2)" stroke="var(--color-text-faint)" strokeWidth="1" />
        )),
      )}

      {/* fault dissipation pulse, traveling outward from the strike node */}
      <circle cx={strike.x} cy={strike.y} r="10" fill="url(#strikeGlow)">
        <animate attributeName="r" values="6;70" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx={strike.x} cy={strike.y} r="4.5" fill="var(--color-copper-text)" />

      {/* conductors nearest the strike point carry the accent color */}
      <line x1={cols[0]} y1={strike.y} x2={cols[cols.length - 1]} y2={strike.y} stroke="var(--color-copper)" strokeWidth="2" opacity="0.55" />
      <line x1={strike.x} y1={rows[0]} x2={strike.x} y2={rows[rows.length - 1]} stroke="var(--color-copper)" strokeWidth="2" opacity="0.55" />
    </svg>
  );
}