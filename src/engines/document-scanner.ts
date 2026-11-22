export interface ScanPoint {
	x: number;
	y: number;
}

export type ScanCorners = [ScanPoint, ScanPoint, ScanPoint, ScanPoint];
export type ScanEnhancement = 'color' | 'grayscale' | 'black-white';

export interface ScanImage {
	width: number;
	height: number;
	data: Uint8ClampedArray;
}

const DETECTION_MAX_EDGE = 360;
const MAX_OUTPUT_EDGE = 3000;

function distance(first: ScanPoint, second: ScanPoint): number {
	return Math.hypot(first.x - second.x, first.y - second.y);
}

export function validateScanCorners(corners: ScanCorners, width: number, height: number): void {
	if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 2 || height < 2) {
		throw new Error('Image dimensions are too small to scan.');
	}
	if (corners.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x >= width || y >= height)) {
		throw new Error('Document corners must be inside the image.');
	}
	const [topLeft, topRight, bottomRight, bottomLeft] = corners;
	const cross = (a: ScanPoint, b: ScanPoint, c: ScanPoint) => (
		(b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
	);
	const turns = [
		cross(topLeft, topRight, bottomRight),
		cross(topRight, bottomRight, bottomLeft),
		cross(bottomRight, bottomLeft, topLeft),
		cross(bottomLeft, topLeft, topRight),
	];
	if (turns.some((turn) => turn <= 0)) throw new Error('Document corners must form a clockwise quadrilateral without crossing.');
	const area = Math.abs(corners.reduce((sum, point, index) => {
		const next = corners[(index + 1) % corners.length];
		return sum + point.x * next.y - next.x * point.y;
	}, 0)) / 2;
	if (area < width * height * 0.02) throw new Error('Selected document area is too small. Adjust the corners around the page.');
}

export function detectDocumentCorners(image: ScanImage): ScanCorners {
	if (image.width < 8 || image.height < 8 || image.data.length < image.width * image.height * 4) {
		throw new Error('Image is too small or incomplete for document edge detection.');
	}
	const scale = Math.min(1, DETECTION_MAX_EDGE / Math.max(image.width, image.height));
	const sampleWidth = Math.max(8, Math.round(image.width * scale));
	const sampleHeight = Math.max(8, Math.round(image.height * scale));
	const gray = new Float32Array(sampleWidth * sampleHeight);
	for (let y = 0; y < sampleHeight; y += 1) {
		for (let x = 0; x < sampleWidth; x += 1) {
			const sourceX = Math.min(image.width - 1, Math.round(x / scale));
			const sourceY = Math.min(image.height - 1, Math.round(y / scale));
			const index = (sourceY * image.width + sourceX) * 4;
			gray[y * sampleWidth + x] = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114;
		}
	}

	const edges: Array<{ x: number; y: number; score: number }> = [];
	for (let y = 1; y < sampleHeight - 1; y += 1) {
		for (let x = 1; x < sampleWidth - 1; x += 1) {
			const index = y * sampleWidth + x;
			const gx = -gray[index - sampleWidth - 1] + gray[index - sampleWidth + 1]
				- 2 * gray[index - 1] + 2 * gray[index + 1]
				- gray[index + sampleWidth - 1] + gray[index + sampleWidth + 1];
			const gy = -gray[index - sampleWidth - 1] - 2 * gray[index - sampleWidth] - gray[index - sampleWidth + 1]
				+ gray[index + sampleWidth - 1] + 2 * gray[index + sampleWidth] + gray[index + sampleWidth + 1];
			const score = Math.hypot(gx, gy);
			if (score > 90) edges.push({ x, y, score });
		}
	}
	if (edges.length < 8) throw new Error('Could not detect document edges. Improve the lighting or adjust the page corners manually.');

	const choose = (score: (point: { x: number; y: number }) => number): ScanPoint => {
		let best = edges[0];
		let bestValue = score(best);
		for (const point of edges.slice(1)) {
			const value = score(point);
			if (value > bestValue || (value === bestValue && point.score > best.score)) {
				best = point;
				bestValue = value;
			}
		}
		return { x: Math.round(best.x / scale), y: Math.round(best.y / scale) };
	};

	const corners: ScanCorners = [
		choose(({ x, y }) => -(x + y)),
		choose(({ x, y }) => x - y),
		choose(({ x, y }) => x + y),
		choose(({ x, y }) => y - x),
	];
	try {
		validateScanCorners(corners, image.width, image.height);
	} catch {
		throw new Error('Could not confidently detect a page quadrilateral. Improve the lighting or adjust the page corners manually.');
	}
	const averageWidth = (distance(corners[0], corners[1]) + distance(corners[3], corners[2])) / 2;
	const averageHeight = (distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2;
	if (averageWidth < image.width * 0.12 || averageHeight < image.height * 0.12) {
		throw new Error('Could not confidently detect a page quadrilateral. Improve the framing or adjust the page corners manually.');
	}
	return corners;
}

function solveLinearSystem(matrix: number[][], values: number[]): number[] {
	const size = values.length;
	const rows = matrix.map((row, index) => [...row, values[index]]);
	for (let column = 0; column < size; column += 1) {
		let pivot = column;
		for (let row = column + 1; row < size; row += 1) {
			if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
		}
		if (Math.abs(rows[pivot][column]) < 1e-10) throw new Error('The selected corners do not form a usable perspective transform.');
		[rows[column], rows[pivot]] = [rows[pivot], rows[column]];
		const divisor = rows[column][column];
		for (let entry = column; entry <= size; entry += 1) rows[column][entry] /= divisor;
		for (let row = 0; row < size; row += 1) {
			if (row === column) continue;
			const factor = rows[row][column];
			for (let entry = column; entry <= size; entry += 1) rows[row][entry] -= factor * rows[column][entry];
		}
	}
	return rows.map((row) => row[size]);
}

function perspectiveTransform(corners: ScanCorners, width: number, height: number): number[] {
	const destinations: ScanPoint[] = [
		{ x: 0, y: 0 },
		{ x: width - 1, y: 0 },
		{ x: width - 1, y: height - 1 },
		{ x: 0, y: height - 1 },
	];
	const matrix: number[][] = [];
	const values: number[] = [];
	corners.forEach((source, index) => {
		const destination = destinations[index];
		matrix.push([destination.x, destination.y, 1, 0, 0, 0, -source.x * destination.x, -source.x * destination.y]);
		values.push(source.x);
		matrix.push([0, 0, 0, destination.x, destination.y, 1, -source.y * destination.x, -source.y * destination.y]);
		values.push(source.y);
	});
	return solveLinearSystem(matrix, values);
}

export function rectifyDocumentImage(source: ScanImage, corners: ScanCorners): ScanImage {
	validateScanCorners(corners, source.width, source.height);
	const outputWidth = Math.max(2, Math.round((distance(corners[0], corners[1]) + distance(corners[3], corners[2])) / 2));
	const outputHeight = Math.max(2, Math.round((distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2));
	const outputScale = Math.min(1, MAX_OUTPUT_EDGE / outputWidth, MAX_OUTPUT_EDGE / outputHeight);
	const width = Math.max(2, Math.round(outputWidth * outputScale));
	const height = Math.max(2, Math.round(outputHeight * outputScale));
	const transform = perspectiveTransform(corners, width, height);
	const output = new Uint8ClampedArray(width * height * 4);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const denominator = transform[6] * x + transform[7] * y + 1;
			const sourceX = (transform[0] * x + transform[1] * y + transform[2]) / denominator;
			const sourceY = (transform[3] * x + transform[4] * y + transform[5]) / denominator;
			const x0 = Math.floor(sourceX);
			const y0 = Math.floor(sourceY);
			const x1 = Math.min(source.width - 1, x0 + 1);
			const y1 = Math.min(source.height - 1, y0 + 1);
			const dx = sourceX - x0;
			const dy = sourceY - y0;
			const outputIndex = (y * width + x) * 4;
			for (let channel = 0; channel < 3; channel += 1) {
				const topLeft = source.data[(y0 * source.width + x0) * 4 + channel];
				const topRight = source.data[(y0 * source.width + x1) * 4 + channel];
				const bottomLeft = source.data[(y1 * source.width + x0) * 4 + channel];
				const bottomRight = source.data[(y1 * source.width + x1) * 4 + channel];
				output[outputIndex + channel] = Math.round(
					topLeft * (1 - dx) * (1 - dy)
					+ topRight * dx * (1 - dy)
					+ bottomLeft * (1 - dx) * dy
					+ bottomRight * dx * dy,
				);
			}
			output[outputIndex + 3] = 255;
		}
	}
	return { width, height, data: output };
}

export function enhanceScannedImage(image: ScanImage, mode: ScanEnhancement): ScanImage {
	if (image.data.length !== image.width * image.height * 4) throw new Error('Image pixel data is incomplete.');
	const output = new Uint8ClampedArray(image.data);
	if (mode === 'color') return { width: image.width, height: image.height, data: output };
	for (let index = 0; index < output.length; index += 4) {
		const luminance = Math.round(output[index] * 0.299 + output[index + 1] * 0.587 + output[index + 2] * 0.114);
		const value = mode === 'grayscale'
			? luminance
			: (luminance >= 180 ? 255 : 0);
		output[index] = value;
		output[index + 1] = value;
		output[index + 2] = value;
		output[index + 3] = 255;
	}
	return { width: image.width, height: image.height, data: output };
}
