export type WatermarkPosition = 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export function normalizeWatermarkText(text: string) {
	return text.trim().replace(/\s+/g, ' ').slice(0, 200);
}

export function normalizeWatermarkOptions(size: number, opacity: number, rotation: number) {
	if (!Number.isFinite(size) || size < 6 || size > 144) throw new Error('Font size must be between 6 and 144 points.');
	if (!Number.isFinite(opacity) || opacity < 5 || opacity > 100) throw new Error('Opacity must be between 5% and 100%.');
	if (!Number.isFinite(rotation) || rotation < -180 || rotation > 180) throw new Error('Rotation must be between -180° and 180°.');
	return { size, opacity: opacity / 100, rotation };
}
