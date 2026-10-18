import type { ReactElement } from 'react';
import { hexToRgb } from '../mosaic/color';
import type { PartProfile } from '../mosaic/types';

// Isometric drawing, in stud units: x runs right-down, y left-down, z up. One stud pitch = 1 unit (8mm).
const COS = Math.cos(Math.PI / 6);
const SIN = 0.5;
type Point = [number, number];
const iso = (x: number, y: number, z: number): Point => [(x - y) * COS, (x + y) * SIN - z];

/** Part heights in stud pitches (a brick is 9.6mm tall on an 8mm pitch). */
const HEIGHT: Record<PartProfile, number> = { brick: 1.2, plate: 0.4, tile: 0.4, baseplate: 0.15, technic: 1.6 };
const STUD_RADIUS = 0.3;
const STUD_HEIGHT = 0.2;
/** Big plates are drawn as a 6x6 stylisation; 48x48 studs would be noise at icon size. */
const MAX_STUDS = 6;

/** Default colour for brick icons, where the part rather than a colour is being chosen. */
export const PART_ICON_BLUE = '#3B74C9';

const shade = (hex: string, amount: number) => {
    const { r, g, b } = hexToRgb(hex);
    // dark parts get lighter sides instead of darker so their shape still reads
    const dark = r * 0.3 + g * 0.59 + b * 0.11 < 70;
    const mix = (c: number) => Math.round(dark ? c + (255 - c) * amount * 0.6 : c * (1 - amount));
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

const outline = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    return r * 0.3 + g * 0.59 + b * 0.11 < 70 ? 'rgba(255, 255, 255, 0.35)' : 'rgba(0, 0, 0, 0.35)';
};

/** A horizontal circle (radius r, centre x,y,z) projects to an axis-aligned ellipse. */
const ellipseRadii = (r: number) => ({ rx: r * Math.SQRT2 * COS, ry: r * Math.SQRT2 * SIN });

const polygon = (points: Point[]) => points.map((p) => p.join(',')).join(' ');

interface Drawing {
    shapes: ReactElement[];
    points: Point[];
}

const drawBox = (d: Drawing, size: number, height: number, color: string, stroke: string) => {
    const top = [iso(0, 0, height), iso(size, 0, height), iso(size, size, height), iso(0, size, height)];
    const right = [iso(size, 0, 0), iso(size, size, 0), iso(size, size, height), iso(size, 0, height)];
    const left = [iso(0, size, 0), iso(size, size, 0), iso(size, size, height), iso(0, size, height)];
    d.points.push(...top, ...right, ...left);
    d.shapes.push(
        <polygon key="left" points={polygon(left)} fill={shade(color, 0.18)} stroke={stroke} />,
        <polygon key="right" points={polygon(right)} fill={shade(color, 0.32)} stroke={stroke} />,
        <polygon key="top" points={polygon(top)} fill={color} stroke={stroke} />,
    );
};

const drawCylinder = (
    d: Drawing,
    key: string,
    cx: number,
    cy: number,
    z: number,
    radius: number,
    height: number,
    color: string,
    stroke: string,
) => {
    const { rx, ry } = ellipseRadii(radius);
    const [bx, by] = iso(cx, cy, z);
    const [, ty] = iso(cx, cy, z + height);
    d.points.push([bx - rx, ty - ry], [bx + rx, by + ry]);
    d.shapes.push(
        <path
            key={`${key}-side`}
            d={`M ${bx - rx} ${ty} L ${bx - rx} ${by} A ${rx} ${ry} 0 0 0 ${bx + rx} ${by} L ${bx + rx} ${ty} Z`}
            fill={shade(color, 0.25)}
            stroke={stroke}
        />,
        <ellipse key={`${key}-top`} cx={bx} cy={ty} rx={rx} ry={ry} fill={color} stroke={stroke} />,
    );
};

/** Technic holes on the two visible side faces. */
const drawHoles = (d: Drawing, size: number, height: number) => {
    const z = height / 2;
    const r = Math.min(0.35, height * 0.28);
    const hole = (key: string, centre: (t: number) => [number, number, number]) => {
        const points = Array.from({ length: 16 }, (_, i) => {
            const [x, y, zz] = centre((i / 16) * Math.PI * 2);
            return iso(x, y, zz);
        });
        d.shapes.push(<polygon key={key} points={polygon(points)} fill="rgba(0, 0, 0, 0.55)" />);
    };
    for (const at of [0.25, 0.5, 0.75]) {
        const along = size * at;
        hole(`hr${at}`, (t) => [size, along + r * Math.cos(t), z + r * Math.sin(t)]);
        hole(`hl${at}`, (t) => [along + r * Math.cos(t), size, z + r * Math.sin(t)]);
    }
};

interface PartIconProps {
    profile: PartProfile;
    /** Studs per side. */
    size: number;
    round?: boolean;
    color: string;
    px?: number;
}

/** A small isometric drawing of a part, so the app needs no product photos. */
export const PartIcon = ({ profile, size, round = false, color, px = 32 }: PartIconProps) => {
    const d: Drawing = { shapes: [], points: [] };
    const stroke = outline(color);
    const studs = profile !== 'tile';
    const footprint = Math.min(size, MAX_STUDS);
    const height = HEIGHT[profile];

    if (round) {
        const r = footprint / 2;
        drawCylinder(d, 'body', r, r, 0, r * 0.98, height, color, stroke);
        // round plates have one centre stud whatever their size
        if (studs) drawCylinder(d, 'stud', r, r, height, STUD_RADIUS, STUD_HEIGHT, color, stroke);
    } else {
        drawBox(d, footprint, height, color, stroke);
        if (profile === 'technic') drawHoles(d, footprint, height);
        if (studs) {
            const positions = Array.from({ length: footprint * footprint }, (_, i) => [
                i % footprint,
                Math.floor(i / footprint),
            ])
                // back to front so nearer studs overlap farther ones
                .sort(([ax, ay], [bx, by]) => ax + ay - (bx + by));
            const radius = profile === 'baseplate' ? STUD_RADIUS * 0.9 : STUD_RADIUS;
            for (const [x, y] of positions)
                drawCylinder(d, `s${x}-${y}`, x + 0.5, y + 0.5, height, radius, STUD_HEIGHT, color, stroke);
        }
    }

    const xs = d.points.map((p) => p[0]);
    const ys = d.points.map((p) => p[1]);
    const pad = 0.15;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const width = Math.max(...xs) - minX + pad;
    const heightBox = Math.max(...ys) - minY + pad;
    const span = Math.max(width, heightBox);
    // centre the drawing in a square box
    const viewBox = [minX - (span - width) / 2, minY - (span - heightBox) / 2, span, span].join(' ');

    return (
        <svg
            width={px}
            height={px}
            viewBox={viewBox}
            aria-hidden
            style={{ flexShrink: 0 }}
            strokeWidth={span / 60}
            strokeLinejoin="round"
        >
            {d.shapes}
        </svg>
    );
};

/** A Technic pin seen from the side: two friction shafts either side of a collar. */
export const PinIcon = ({ color, px = 32 }: { color: string; px?: number }) => {
    const stroke = outline(color);
    return (
        <svg width={px} height={px} viewBox="0 0 32 32" aria-hidden style={{ flexShrink: 0 }} strokeWidth={0.8}>
            <g transform="rotate(-30 16 16)">
                <rect x="3" y="12" width="26" height="8" rx="2" fill={color} stroke={stroke} />
                <rect x="14.5" y="10.5" width="3" height="11" rx="1" fill={shade(color, 0.25)} stroke={stroke} />
                <line x1="5" y1="16" x2="11" y2="16" stroke={stroke} strokeWidth="1.2" />
                <line x1="21" y1="16" x2="27" y2="16" stroke={stroke} strokeWidth="1.2" />
            </g>
        </svg>
    );
};
