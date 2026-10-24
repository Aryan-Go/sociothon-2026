import type { CSSProperties } from "react";
import { BOTTLE_BY_ID } from "../data/bottles";

interface BottleGlyphProps {
  bottleTypeId: string;
  size?: number;
  className?: string;
  muted?: boolean;
}

export function BottleGlyph({
  bottleTypeId,
  size = 72,
  className = "",
  muted = false,
}: BottleGlyphProps) {
  const bottle = BOTTLE_BY_ID[bottleTypeId];
  const color = bottle?.color ?? "#b9d6c4";
  const code = bottle?.code ?? "PET";
  const style = {
    "--bottle-color": muted ? "#b9c4bc" : color,
    "--bottle-soft": muted ? "#e6e8e3" : bottle?.softColor ?? "#edf3ee",
    width: size,
    height: size * 1.62,
  } as CSSProperties;

  return (
    <div className={`bottle-glyph ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 72 118" fill="none" role="presentation">
        <rect x="27" y="4" width="18" height="10" rx="4" fill="var(--bottle-color)" opacity=".78" />
        <rect x="29" y="13" width="14" height="8" rx="2" fill="var(--bottle-soft)" stroke="var(--bottle-color)" strokeWidth="2" />
        <path
          d="M30 21h12c1.7 0 3 1.3 3 3v12c0 3.2 1.2 6.3 3.4 8.7A18 18 0 0 1 53 56.8V101c0 7.2-5.8 13-13 13H32c-7.2 0-13-5.8-13-13V56.8c0-4.3 1.5-8.5 4.6-11.9a14.8 14.8 0 0 0 3.4-9.9V24c0-1.7 1.3-3 3-3Z"
          fill="var(--bottle-soft)"
          stroke="var(--bottle-color)"
          strokeWidth="2.5"
        />
        <path d="M28 54h16v34a8 8 0 0 1-8 8 8 8 0 0 1-8-8V54Z" fill="var(--bottle-color)" opacity=".24" />
        <rect x="29" y="65" width="14" height="22" rx="3" fill="var(--bottle-color)" opacity=".9" />
        <text
          x="36"
          y="79"
          textAnchor="middle"
          fill="#10251b"
          fontSize="6.5"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {code}
        </text>
        <path d="M25 43h22" stroke="var(--bottle-color)" strokeWidth="2" strokeLinecap="round" opacity=".6" />
        <path d="M31 30v7" stroke="white" strokeWidth="2" strokeLinecap="round" opacity=".75" />
      </svg>
    </div>
  );
}
