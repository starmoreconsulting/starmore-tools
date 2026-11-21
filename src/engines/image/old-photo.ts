export interface OldPhotoSettings {
	fade: number;
	contrast: number;
	warmth: number;
	denoise: number;
	grain: number;
	seed: number;
}

export function restoreOldPhotoPixels(data: Uint8ClampedArray, width: number, height: number, settings: OldPhotoSettings): Uint8ClampedArray {
	const output = new Uint8ClampedArray(data);
	const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast));
	let seed = Math.abs(Math.trunc(settings.seed)) || 1;
	for (let index = 0; index < output.length; index += 4) {
		seed = (seed * 48271) % 2147483647;
		const grain = ((seed / 2147483647) - 0.5) * settings.grain * 2;
		const r = output[index];
		const g = output[index + 1];
		const b = output[index + 2];
		const luma = r * 0.299 + g * 0.587 + b * 0.114;
		let nextR = contrastFactor * (luma - 128) + 128 + settings.warmth * 18 + grain;
		let nextG = contrastFactor * (luma - 128) + 128 + settings.warmth * 4 + grain;
		let nextB = contrastFactor * (luma - 128) + 128 - settings.warmth * 12 + grain;
		const fadeAmount = settings.fade / 100;
		const fadedR = nextR + (246 - nextR) * fadeAmount;
		const fadedG = nextG + (242 - nextG) * fadeAmount;
		const fadedB = nextB + (224 - nextB) * fadeAmount;
		output[index] = Math.max(0, Math.min(255, fadedR));
		output[index + 1] = Math.max(0, Math.min(255, fadedG));
		output[index + 2] = Math.max(0, Math.min(255, fadedB));
	}

	if (settings.denoise > 0) {
		const strength = Math.min(1, settings.denoise / 100);
		const copy = new Uint8ClampedArray(output);
		for (let y = 1; y < height - 1; y += 1) {
			for (let x = 1; x < width - 1; x += 1) {
				const index = (y * width + x) * 4;
				for (let channel = 0; channel < 3; channel += 1) {
					const top = copy[index - width * 4 + channel];
					const bottom = copy[index + width * 4 + channel];
					const left = copy[index - 4 + channel];
					const right = copy[index + 4 + channel];
					const average = (top + bottom + left + right) / 4;
					output[index + channel] = copy[index + channel] * (1 - strength) + average * strength;
				}
			}
		}
	}
	return output;
}
