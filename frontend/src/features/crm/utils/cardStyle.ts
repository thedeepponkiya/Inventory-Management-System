import { pieColors } from '../../../components/dashboard/dashboardUtils';

// Same hue families as pieColors (blue/green/amber/violet/red/sky/orange/pink/slate), but at a
// dark, text-legible 700-shade - pieColors' pastel 300-shades work as a fill (avatar
// background, chart slice) but are too low-contrast to read as text on a light background.
const badgeTextColors = ['#1d4ed8', '#15803d', '#b45309', '#6d28d9', '#b91c1c', '#0369a1', '#c2410c', '#be185d', '#334155'];

function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

export function getInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

// Deterministic string -> pastel color, so the same lead/source always gets the same color
// across re-renders and reorders without needing a dedicated color column in the DB. Suited
// for use as a fill (avatar background, chart slice) - see getBadgeColors for text.
export function getColorForString(value: string): string {
    return pieColors[hashString(value) % pieColors.length];
}

// Deterministic string -> a legible {text, bg} pair for pill badges (e.g. the source badge on
// a Kanban card) - same hash as getColorForString so a given source stays visually linked to
// its pastel color elsewhere, but with a dark, readable text color against a light background.
export function getBadgeColors(value: string): { text: string; bg: string } {
    const index = hashString(value) % pieColors.length;
    return { text: badgeTextColors[index], bg: `${pieColors[index]}26` };
}
