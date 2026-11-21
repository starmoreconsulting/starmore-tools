export function fillMask(mask: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, endX: number, endY: number, radius: number) {
	const result = new Uint8ClampedArray(mask);
	const dx = endX - startX;
	const dy = endY - startY;
	const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius * 0.5)));
	for (let step = 0; step <= steps; step += 1) {
		const x = Math.round(startX + dx * step / steps);
		const y = Math.round(startY + dy * step / steps);
		for (let py = -radius; py <= radius; py += 1) {
			for (let px = -radius; px <= radius; px += 1) {
				if (px * px + py * py > radius * radius) continue;
				const mx = x + px;
				const my = y + py;
				if (mx >= 0 && my >= 0 && mx < width && my < height) result[my * width + mx] = 255;
			}
		}
	}
	return result;
}

export function hasMaskedPixels(mask: Uint8ClampedArray) {
	return mask.some((value) => value > 0);
}

export function inpaintMaskedPixels(pixels: Uint8ClampedArray, mask: Uint8ClampedArray, width: number, height: number, iterations = 12) {
	const output = new Uint8ClampedArray(pixels);
	for (let pass = 0; pass < iterations; pass += 1) {
		const copy = new Uint8ClampedArray(output);
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const index = y * width + x;
				if (mask[index] === 0) continue;
				let red = 0;
				let green = 0;
				let blue = 0;
				let count = 0;
				for (let dy = -1; dy <= 1; dy += 1) {
					for (let dx = -1; dx <= 1; dx += 1) {
						const mx = x + dx;
						const my = y + dy;
						if (mx < 0 || my < 0 || mx >= width || my >= height) continue;
						const neighbor = my * width + mx;
						if (mask[neighbor] !== 0) continue;
						const pixel = neighbor * 4;
						red += copy[pixel]; green += copy[pixel + 1]; blue += copy[pixel + 2]; count += 1;
					}
				}
				if (count > 0) {
					const pixel = index * 4;
					output[pixel] = red / count;
					output[pixel + 1] = green / count;
					output[pixel + 2] = blue / count;
					output[pixel + 3] = 255;
				}
			}
		}
	}
	return output;
}
