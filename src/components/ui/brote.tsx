// Brote, la mascota de root: un brote con dos hojas. SVG puro (sin hooks ni clases),
// así sirve en la app y en el icono que genera next/og.

export type BroteMood = "feliz" | "celebra" | "piensa";

const INK = "#1F2430";
const LEAF = "#5DBB63";
const LEAF_DARK = "#3E9A4A";
const BODY = "#8FD694";

export function Brote({ size = 48, mood = "feliz", label }: { size?: number; mood?: BroteMood; label?: string }) {
  const eyes =
    mood === "celebra" ? (
      <>
        <path d="M41 77 Q47 70 53 77" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M67 77 Q73 70 79 77" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx="47" cy="76" r="5.5" fill={INK} />
        <circle cx="73" cy="76" r="5.5" fill={INK} />
        <circle cx="48.8" cy="74.2" r="1.8" fill="#FFFFFF" />
        <circle cx="74.8" cy="74.2" r="1.8" fill="#FFFFFF" />
      </>
    );
  const mouth =
    mood === "celebra" ? (
      <path d="M51 88 Q60 102 69 88 Z" fill={INK} />
    ) : mood === "piensa" ? (
      <path d="M54 92 L66 90" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    ) : (
      <path d="M52 89 Q60 97 68 89" stroke={INK} strokeWidth="3.5" fill="none" strokeLinecap="round" />
    );

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flexShrink: 0 }}
    >
      <path d="M60 34 C 50 12, 26 10, 24 28 C 36 36, 50 37, 60 34 Z" fill={LEAF} />
      <path d="M60 34 C 70 10, 96 10, 96 28 C 84 37, 70 37, 60 34 Z" fill={LEAF_DARK} />
      <path d="M60 34 L60 44" stroke={LEAF_DARK} strokeWidth="4" strokeLinecap="round" />
      <path d="M60 42 C 88 42, 102 62, 100 82 C 98 104, 80 114, 60 114 C 40 114, 22 104, 20 82 C 18 62, 32 42, 60 42 Z" fill={BODY} />
      <ellipse cx="44" cy="58" rx="9" ry="5" fill="#FFFFFF" opacity="0.35" />
      {eyes}
      <ellipse cx="38" cy="88" rx="6.5" ry="3.8" fill="#FF8FA3" opacity="0.75" />
      <ellipse cx="82" cy="88" rx="6.5" ry="3.8" fill="#FF8FA3" opacity="0.75" />
      {mouth}
      {mood === "celebra" && (
        <>
          <path d="M14 44 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#FFC53D" />
          <path d="M104 50 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#FFC53D" />
        </>
      )}
      {mood === "piensa" && (
        <>
          <circle cx="102" cy="30" r="4" fill={LEAF} />
          <circle cx="110" cy="18" r="6" fill={LEAF} />
        </>
      )}
    </svg>
  );
}
