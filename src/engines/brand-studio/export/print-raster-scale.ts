export const PRINT_TARGET_DPI = 600;
export const PRINT_MINIMUM_DPI = 300;
export const PRINT_MAX_CANVAS_SIDE = 12_000;
export const PRINT_BATCH_ONE_MAX_PIXELS = 48_000_000;
export const PRINT_LOW_MEMORY_MAX_PIXELS = 16_777_216;
export const PRINT_BLEED_AND_MARK_MARGIN_MM = 18;

export interface PrintRasterDeviceInfo {
	userAgent?: string;
	platform?: string;
	maxTouchPoints?: number;
	deviceMemory?: number;
}

export interface PrintRasterLimits {
	maxPixels: number;
	maxSide: number;
	targetDpi: number;
	minimumDpi: number;
}

export interface PrintRasterScaleChoice {
	scale: number;
	width: number;
	height: number;
	effectiveDpi: number;
	physicalWidthPixels: number;
	physicalHeightPixels: number;
	totalPhysicalPixels: number;
}

export function getPrintRasterLimits(device: PrintRasterDeviceInfo): PrintRasterLimits {
	const ios = /iPhone|iPad|iPod/i.test(device.userAgent ?? '')
		|| (device.platform === 'MacIntel' && (device.maxTouchPoints ?? 0) > 1);
	const lowMemory = device.deviceMemory === undefined || device.deviceMemory <= 4;
	return {
		maxPixels: ios || lowMemory ? PRINT_LOW_MEMORY_MAX_PIXELS : PRINT_BATCH_ONE_MAX_PIXELS,
		maxSide: PRINT_MAX_CANVAS_SIDE,
		targetDpi: PRINT_TARGET_DPI,
		minimumDpi: PRINT_MINIMUM_DPI,
	};
}

function fitsLimits(width: number, height: number, scale: number, limits: PrintRasterLimits): boolean {
	const pixelWidth = Math.ceil(width * scale);
	const pixelHeight = Math.ceil(height * scale);
	return pixelWidth <= limits.maxSide
		&& pixelHeight <= limits.maxSide
		&& pixelWidth * pixelHeight <= limits.maxPixels;
}

export function choosePrintRasterScale(
	widthMm: number,
	heightMm: number,
	limits: PrintRasterLimits = {
		maxPixels: PRINT_BATCH_ONE_MAX_PIXELS,
		maxSide: PRINT_MAX_CANVAS_SIDE,
		targetDpi: PRINT_TARGET_DPI,
		minimumDpi: PRINT_MINIMUM_DPI,
	},
): PrintRasterScaleChoice {
	if (![widthMm, heightMm].every((value) => Number.isFinite(value) && value > 0)) {
		throw new Error('The print design has invalid physical dimensions.');
	}
	if (![limits.maxPixels, limits.maxSide, limits.targetDpi, limits.minimumDpi]
		.every((value) => Number.isFinite(value) && value > 0)) {
		throw new Error('The print raster limits are invalid.');
	}

	const physicalWidthMm = widthMm + PRINT_BLEED_AND_MARK_MARGIN_MM;
	const physicalHeightMm = heightMm + PRINT_BLEED_AND_MARK_MARGIN_MM;
	const targetScale = limits.targetDpi / 25.4;
	let scale = Math.min(
		targetScale,
		limits.maxSide / physicalWidthMm,
		limits.maxSide / physicalHeightMm,
		Math.sqrt(limits.maxPixels / (physicalWidthMm * physicalHeightMm)),
	);

	while (!fitsLimits(physicalWidthMm, physicalHeightMm, scale, limits)) scale *= 0.999;

	const width = Math.max(1, Math.round(widthMm * scale));
	const height = Math.max(1, Math.round(heightMm * scale));
	const effectiveDpi = Math.min(width / widthMm, height / heightMm) * 25.4;
	if (effectiveDpi < limits.minimumDpi) {
		throw new Error(
			`This print page cannot be rasterized at 300 DPI within this device's pixel and canvas limits. `
			+ 'Remove unsupported characters to export a vector PDF instead.',
		);
	}

	const physicalWidthPixels = Math.ceil(physicalWidthMm * scale);
	const physicalHeightPixels = Math.ceil(physicalHeightMm * scale);
	return {
		scale,
		width,
		height,
		effectiveDpi,
		physicalWidthPixels,
		physicalHeightPixels,
		totalPhysicalPixels: physicalWidthPixels * physicalHeightPixels,
	};
}

export function getCurrentPrintRasterLimits(): PrintRasterLimits {
	const device = typeof navigator === 'undefined'
		? {}
		: {
			userAgent: navigator.userAgent,
			platform: navigator.platform,
			maxTouchPoints: navigator.maxTouchPoints,
			deviceMemory: 'deviceMemory' in navigator
				? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
				: undefined,
		};
	return getPrintRasterLimits(device);
}
