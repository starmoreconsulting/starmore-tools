export interface BoxShadowOptions {
	horizontal: number;
	vertical: number;
	blur: number;
	spread: number;
	color: string;
	opacity: number;
	inset: boolean;
}

export function clampShadowNumber(value: number, minimum: number, maximum: number): number {
	if (!Number.isFinite(value)) return minimum;
	return Math.min(maximum, Math.max(minimum, value));
}

export function hexToRgba(hex: string, opacity: number): string {
	if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Choose a valid 6-digit hex colour.');
	const red = parseInt(hex.slice(1, 3), 16);
	const green = parseInt(hex.slice(3, 5), 16);
	const blue = parseInt(hex.slice(5, 7), 16);
	const percentage = clampShadowNumber(opacity, 0, 100);
	const alpha = percentage === 0 ? '0' : percentage === 100 ? '1' : (percentage / 100).toFixed(2).replace(/0$/, '').replace(/\.$/, '');
	return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function buildBoxShadowCss(options: BoxShadowOptions): string {
	const horizontal = clampShadowNumber(options.horizontal, -100, 100);
	const vertical = clampShadowNumber(options.vertical, -100, 100);
	const blur = clampShadowNumber(options.blur, 0, 100);
	const spread = clampShadowNumber(options.spread, -100, 100);
	const color = hexToRgba(options.color, options.opacity);
	const parts = [`${horizontal}px`, `${vertical}px`, `${blur}px`, `${spread}px`, color];
	if (options.inset) parts.push('inset');
	return parts.join(' ');
}
