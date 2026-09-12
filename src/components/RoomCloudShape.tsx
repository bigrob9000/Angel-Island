type PuffKind = "shadow" | "body" | "highlight";

type Puff = {
  w: number;
  h: number;
  top: number;
  left: number;
  kind: PuffKind;
};

/** Five distinct cumulus silhouettes — one per room slot. */
const CLOUD_VARIANTS: Puff[][] = [
  [
    { kind: "shadow", w: 140, h: 36, top: 98, left: 38 },
    { kind: "body", w: 96, h: 68, top: 52, left: 18 },
    { kind: "body", w: 112, h: 76, top: 38, left: 58 },
    { kind: "body", w: 88, h: 64, top: 48, left: 118 },
    { kind: "body", w: 72, h: 54, top: 28, left: 92 },
    { kind: "body", w: 58, h: 46, top: 22, left: 38 },
    { kind: "highlight", w: 48, h: 36, top: 34, left: 72 },
  ],
  [
    { kind: "shadow", w: 168, h: 34, top: 96, left: 22 },
    { kind: "body", w: 104, h: 62, top: 58, left: 8 },
    { kind: "body", w: 118, h: 70, top: 44, left: 62 },
    { kind: "body", w: 102, h: 64, top: 50, left: 132 },
    { kind: "body", w: 76, h: 52, top: 36, left: 108 },
    { kind: "body", w: 64, h: 44, top: 30, left: 28 },
    { kind: "highlight", w: 52, h: 38, top: 42, left: 88 },
  ],
  [
    { kind: "shadow", w: 132, h: 38, top: 100, left: 48 },
    { kind: "body", w: 88, h: 88, top: 46, left: 34 },
    { kind: "body", w: 96, h: 78, top: 32, left: 78 },
    { kind: "body", w: 74, h: 62, top: 58, left: 118 },
    { kind: "body", w: 62, h: 52, top: 18, left: 62 },
    { kind: "body", w: 54, h: 46, top: 68, left: 72 },
    { kind: "highlight", w: 44, h: 34, top: 38, left: 58 },
  ],
  [
    { kind: "shadow", w: 150, h: 36, top: 98, left: 30 },
    { kind: "body", w: 92, h: 66, top: 54, left: 12 },
    { kind: "body", w: 108, h: 72, top: 40, left: 52 },
    { kind: "body", w: 86, h: 60, top: 50, left: 118 },
    { kind: "body", w: 70, h: 50, top: 26, left: 98 },
    { kind: "body", w: 56, h: 44, top: 32, left: 24 },
    { kind: "highlight", w: 46, h: 34, top: 44, left: 76 },
  ],
  [
    { kind: "shadow", w: 190, h: 40, top: 102, left: 18 },
    { kind: "body", w: 118, h: 74, top: 56, left: 0 },
    { kind: "body", w: 128, h: 78, top: 44, left: 58 },
    { kind: "body", w: 112, h: 70, top: 52, left: 128 },
    { kind: "body", w: 86, h: 58, top: 34, left: 108 },
    { kind: "body", w: 68, h: 48, top: 28, left: 36 },
    { kind: "highlight", w: 56, h: 40, top: 46, left: 82 },
  ],
];

export const ROOM_CLOUD_BOX = { width: 280, height: 168 } as const;

function labelOffsetForPuffs(puffs: Puff[], boxW: number, boxH: number) {
  const body = puffs.filter((puff) => puff.kind === "body");
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const puff of body) {
    minX = Math.min(minX, puff.left);
    maxX = Math.max(maxX, puff.left + puff.w);
    minY = Math.min(minY, puff.top);
    maxY = Math.max(maxY, puff.top + puff.h);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  return {
    x: Math.round(cx - boxW / 2),
    y: Math.round(cy - boxH / 2),
  };
}

/** Shift labels from box center to each cloud silhouette's visual center. */
export const ROOM_CLOUD_LABEL_OFFSETS = CLOUD_VARIANTS.map((puffs) =>
  labelOffsetForPuffs(puffs, ROOM_CLOUD_BOX.width, ROOM_CLOUD_BOX.height),
);

type Props = {
  variant: number;
};

export function RoomCloudShape({ variant }: Props) {
  const puffs = CLOUD_VARIANTS[variant % CLOUD_VARIANTS.length] ?? CLOUD_VARIANTS[0];

  return (
    <div className="room-cloud-shape" aria-hidden>
      {puffs.map((puff, index) => (
        <div
          key={index}
          className={`room-cloud-blob room-cloud-blob--${puff.kind}`}
          style={{
            width: puff.w,
            height: puff.h,
            top: puff.top,
            left: puff.left,
          }}
        />
      ))}
    </div>
  );
}
