export interface ColorKeyOptions {
	key: [number, number, number];
	tolerance: number;
	softEdge: number;
	connectedOnly: boolean;
	seed?: { x: number; y: number };
	cleanupNoise: boolean;
}

export interface TrimOptions {
	enabled: boolean;
	padding: number;
}

function colorDistance(data: Uint8ClampedArray, offset: number, key: [number, number, number]): number {
	return Math.hypot(data[offset] - key[0], data[offset + 1] - key[1], data[offset + 2] - key[2]);
}

function connectedPixels(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	options: ColorKeyOptions,
): Uint8Array | null {
	if (!options.connectedOnly) return null;
	if (!options.seed) throw new Error('Click the background colour before using connected-area removal.');
	const startX = Math.max(0, Math.min(width - 1, Math.floor(options.seed.x)));
	const startY = Math.max(0, Math.min(height - 1, Math.floor(options.seed.y)));
	const start = startY * width + startX;
	if (colorDistance(data, start * 4, options.key) > options.tolerance + options.softEdge) {
		throw new Error('The picked point is outside the selected colour tolerance. Pick the background again or increase tolerance.');
	}
	const selected = new Uint8Array(width * height);
	const queue = new Int32Array(width * height);
	let read = 0;
	let write = 0;
	selected[start] = 1;
	queue[write++] = start;
	const maximumDistance = options.tolerance + options.softEdge + (options.cleanupNoise ? 12 : 0);
	while (read < write) {
		const index = queue[read++];
		const x = index % width;
		const y = Math.floor(index / width);
		for (let dy = -1; dy <= 1; dy += 1) {
			for (let dx = -1; dx <= 1; dx += 1) {
				if (dx === 0 && dy === 0) continue;
				const nextX = x + dx;
				const nextY = y + dy;
				if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
				const next = nextY * width + nextX;
				if (selected[next] || colorDistance(data, next * 4, options.key) > maximumDistance) continue;
				selected[next] = 1;
				queue[write++] = next;
			}
		}
	}
	return selected;
}

export function applyColorKey(
	source: Uint8ClampedArray,
	width: number,
	height: number,
	options: ColorKeyOptions,
): Uint8ClampedArray {
	if (width < 1 || height < 1 || source.length !== width * height * 4) {
		throw new Error('The image pixel data is incomplete.');
	}
	const tolerance = Math.max(0, Math.min(255, options.tolerance));
	const softEdge = Math.max(0, Math.min(100, options.softEdge));
	const connected = connectedPixels(source, width, height, { ...options, tolerance, softEdge });
	const output = source.slice();
	const matches = new Uint8Array(width * height);
	for (let index = 0; index < matches.length; index += 1) {
		matches[index] = colorDistance(source, index * 4, options.key) <= tolerance ? 1 : 0;
	}

	for (let index = 0; index < matches.length; index += 1) {
		const offset = index * 4;
		let distance = colorDistance(source, offset, options.key);
		let isBackground = connected ? Boolean(connected[index]) : distance <= tolerance + softEdge;
		if (!isBackground && options.cleanupNoise && distance <= tolerance + softEdge + 12) {
			const x = index % width;
			const y = Math.floor(index / width);
			for (let dy = -1; dy <= 1 && !isBackground; dy += 1) {
				for (let dx = -1; dx <= 1; dx += 1) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx >= 0 && ny >= 0 && nx < width && ny < height && matches[ny * width + nx]) {
						isBackground = true;
						break;
					}
				}
			}
		}
		if (!isBackground) continue;

		const alpha = distance <= tolerance ? 0
			: softEdge > 0 ? Math.max(0, Math.min(255, Math.round((distance - tolerance) / softEdge * 255)))
				: 0;
		if (alpha < 255) {
			const remaining = alpha / 255;
			if (alpha === 0) {
				output[offset] = output[offset + 1] = output[offset + 2] = 0;
			} else {
				for (let channel = 0; channel < 3; channel += 1) {
					output[offset + channel] = Math.max(0, Math.min(255, Math.round((source[offset + channel] - options.key[channel] * (1 - remaining)) / remaining)));
				}
			}
			output[offset + 3] = Math.round(source[offset + 3] * remaining);
		}
	}
	return output;
}

export function trimTransparentPixels(
	source: Uint8ClampedArray,
	width: number,
	height: number,
	padding: number,
): { data: Uint8ClampedArray; width: number; height: number } {
	let left = width;
	let top = height;
	let right = -1;
	let bottom = -1;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			if (source[(y * width + x) * 4 + 3] === 0) continue;
			left = Math.min(left, x);
			top = Math.min(top, y);
			right = Math.max(right, x);
			bottom = Math.max(bottom, y);
		}
	}
	if (right < left || bottom < top) return { data: source.slice(), width, height };
	const pad = Math.max(0, Math.floor(padding));
	left = Math.max(0, left - pad);
	top = Math.max(0, top - pad);
	right = Math.min(width - 1, right + pad);
	bottom = Math.min(height - 1, bottom + pad);
	const outputWidth = right - left + 1;
	const outputHeight = bottom - top + 1;
	const data = new Uint8ClampedArray(outputWidth * outputHeight * 4);
	for (let y = 0; y < outputHeight; y += 1) {
		const sourceStart = ((top + y) * width + left) * 4;
		data.set(source.subarray(sourceStart, sourceStart + outputWidth * 4), y * outputWidth * 4);
	}
	return { data, width: outputWidth, height: outputHeight };
}

export function detectCornerColor(data: Uint8ClampedArray, width: number, height: number): [number, number, number] | null {
	if (width < 1 || height < 1 || data.length !== width * height * 4) return null;
	const points = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
	const colors = points.map(([x, y]) => {
		const offset = (y * width + x) * 4;
		return [data[offset], data[offset + 1], data[offset + 2]] as [number, number, number];
	});
	const average = colors[0].map((_, channel) => Math.round(colors.reduce((sum, color) => sum + color[channel], 0) / colors.length)) as [number, number, number];
	return colors.every((color) => Math.hypot(color[0] - average[0], color[1] - average[1], color[2] - average[2]) <= 30)
		? average
		: null;
}
