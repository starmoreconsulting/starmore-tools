import DOMPurify from 'dompurify';
import { createDefaultElement, type Element as LogoElement } from '../model/types';
import { sanitizeReferenceSvg } from '../store/references';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ELEMENTS = 500;
const MAX_NODES = 10_000;
const MAX_DEPTH = 64;
const MAX_PATH_CHARS = 1_000_000;
const MAX_COORDINATE = 1_000_000;
type Matrix = [number, number, number, number, number, number];
type ImportResult = { elements: LogoElement[]; imported: number; skipped: number; truncated: boolean; limitReason?: string };
type InheritedStyle = { fill?: string; stroke?: string; strokeWidth?: number; opacity: number };

function multiply(left: Matrix, right: Matrix): Matrix {
	const [a, b, c, d, e, f] = left;
	const [g, h, i, j, k, l] = right;
	return [
		a * g + c * h, b * g + d * h,
		a * i + c * j, b * i + d * j,
		a * k + c * l + e, b * k + d * l + f,
	];
}

function transformPoint(matrix: Matrix, x: number, y: number): [number, number] {
	return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
}

function numberList(value: string): number[] {
	const matches = value.match(/[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi) ?? [];
	const values = matches.map(Number);
	if (values.some((number) => !Number.isFinite(number))) throw new Error('This SVG contains invalid numeric values.');
	return values;
}

function parseTransform(value: string | null): Matrix {
	let result: Matrix = [1, 0, 0, 1, 0, 0];
	if (!value) return result;
	const expression = /([a-z]+)\s*\(([^)]*)\)/gi;
	let match: RegExpExecArray | null;
	let consumed = '';
	while ((match = expression.exec(value))) {
		consumed += match[0];
		const values = numberList(match[2]);
		if (values.some((number) => !Number.isFinite(number))) throw new Error('This SVG contains invalid transform values.');
		let next: Matrix;
		switch (match[1].toLowerCase()) {
			case 'matrix':
				if (values.length !== 6) throw new Error('Unsupported SVG transform.');
				next = values as Matrix;
				break;
			case 'translate':
				if (values.length < 1 || values.length > 2) throw new Error('Unsupported SVG transform.');
				next = [1, 0, 0, 1, values[0], values[1] ?? 0];
				break;
			case 'scale':
				if (values.length < 1 || values.length > 2) throw new Error('Unsupported SVG transform.');
				next = [values[0], 0, 0, values[1] ?? values[0], 0, 0];
				break;
			case 'rotate': {
				if (values.length !== 1 && values.length !== 3) throw new Error('Unsupported SVG transform.');
				const angle = values[0] * Math.PI / 180;
				const rotation: Matrix = [Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0];
				next = values.length === 1 ? rotation : multiply(
					multiply([1, 0, 0, 1, values[1], values[2]], rotation),
					[1, 0, 0, 1, -values[1], -values[2]],
				);
				break;
			}
			default:
				throw new Error('Unsupported SVG transform.');
		}
		result = multiply(result, next);
	}
	if (consumed.replace(/[\s,]/g, '') !== value.replace(/[\s,]/g, '')) throw new Error('Unsupported SVG transform.');
	return result;
}

function parseLength(value: string | null, fallback: number): number {
	const number = Number.parseFloat(value ?? '');
	return Number.isFinite(number) ? number : fallback;
}

function parsePoints(value: string): number[][] {
	const values = numberList(value);
	if (values.length < 4 || values.length % 2 !== 0) throw new Error('This SVG polygon has invalid points.');
	return Array.from({ length: values.length / 2 }, (_, index) => [values[index * 2], values[index * 2 + 1]]);
}

function transformedPath(data: string, matrix: Matrix): string {
	if (!data || data.length > MAX_PATH_CHARS) throw new Error('This SVG path is empty or too large to import.');
	const tokens = data.match(/[a-z]|[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?/gi) ?? [];
	if (data.replace(/[a-z]|[-+]?(?:\d*\.?\d+)(?:e[-+]?\d+)?|[\s,]/gi, '')) {
		throw new Error('This SVG path contains unsupported data.');
	}
	const sx = Math.hypot(matrix[0], matrix[1]);
	const sy = Math.hypot(matrix[2], matrix[3]);
	const scale = (sx + sy) / 2;
	if (Math.abs(sx - sy) > 0.001 || Math.abs(matrix[0] * matrix[2] + matrix[1] * matrix[3]) > 0.001 || matrix[0] * matrix[3] - matrix[1] * matrix[2] < 0) {
		throw new Error('This SVG path uses a non-uniform or skewed transform.');
	}
	const angle = Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI;
	const output: string[] = [];
	let index = 0;
	let command = '';
	let movePoint = true;
	let x = 0;
	let y = 0;
	let startX = 0;
	let startY = 0;
	const counts: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };
	const point = (px: number, py: number) => {
		const transformed = transformPoint(matrix, px, py);
		if (!transformed.every(Number.isFinite) || Math.max(Math.abs(transformed[0]), Math.abs(transformed[1])) > MAX_COORDINATE) {
			throw new Error('This SVG path has invalid coordinates.');
		}
		return transformed.map((value) => Number(value.toFixed(4)));
	};
	while (index < tokens.length) {
		if (/^[a-z]$/i.test(tokens[index])) {
			command = tokens[index++];
			if (command.toUpperCase() === 'M') movePoint = true;
		}
		if (!command) throw new Error('This SVG path has no command.');
		const upper = command.toUpperCase();
		if (upper === 'Z') {
			output.push('Z');
			x = startX;
			y = startY;
			command = '';
			continue;
		}
		const count = counts[upper];
		if (!count || index + count > tokens.length || /^[a-z]$/i.test(tokens[index])) throw new Error('This SVG path command is incomplete.');
		const values = tokens.slice(index, index + count).map(Number);
		if (values.some((value) => !Number.isFinite(value))) throw new Error('This SVG path has invalid coordinates.');
		index += count;
		const relative = command !== upper;
		const absolutePoint = (px: number, py: number): [number, number] => [relative ? x + px : px, relative ? y + py : py];
		if (upper === 'M' || upper === 'L' || upper === 'T') {
			const [nx, ny] = absolutePoint(values[0], values[1]);
			output.push(`${upper === 'M' ? (movePoint ? 'M' : 'L') : upper} ${point(nx, ny).join(' ')}`);
			x = nx;
			y = ny;
			if (upper === 'M') {
				movePoint = false;
				startX = x;
				startY = y;
				command = relative ? 'l' : 'L';
			}
		} else if (upper === 'H' || upper === 'V') {
			const [nx, ny] = upper === 'H' ? [relative ? x + values[0] : values[0], y] : [x, relative ? y + values[0] : values[0]];
			output.push(`L ${point(nx, ny).join(' ')}`);
			x = nx;
			y = ny;
		} else if (upper === 'C' || upper === 'S' || upper === 'Q') {
			const pairs = Array.from({ length: count / 2 }, (_, pairIndex) => absolutePoint(values[pairIndex * 2], values[pairIndex * 2 + 1]));
			const transformed = pairs.flatMap(([px, py]) => point(px, py));
			output.push(`${upper} ${transformed.join(' ')}`);
			[x, y] = pairs[pairs.length - 1];
		} else if (upper === 'A') {
			const [nx, ny] = absolutePoint(values[5], values[6]);
			output.push(`A ${Number((values[0] * scale).toFixed(4))} ${Number((values[1] * scale).toFixed(4))} ${Number((values[2] + angle).toFixed(4))} ${values[3]} ${values[4]} ${point(nx, ny).join(' ')}`);
			x = nx;
			y = ny;
		}
	}
	return output.join(' ');
}

function styleFor(element: SVGElement, inherited: InheritedStyle): InheritedStyle {
	const fill = element.getAttribute('fill');
	const stroke = element.getAttribute('stroke');
	const widthValue = element.getAttribute('stroke-width');
	const opacityValue = element.getAttribute('opacity');
	const fillOpacityValue = element.getAttribute('fill-opacity');
	const width = widthValue === null ? inherited.strokeWidth : Number(widthValue);
	const opacity = opacityValue === null ? 1 : Number(opacityValue);
	const fillOpacity = fillOpacityValue === null ? 1 : Number(fillOpacityValue);
	return {
		fill: fill && !/url\s*\(/i.test(fill) ? fill : inherited.fill,
		stroke: stroke && !/url\s*\(/i.test(stroke) ? stroke : inherited.stroke,
		strokeWidth: width !== undefined && Number.isFinite(width) && width >= 0 ? width : inherited.strokeWidth,
		opacity: inherited.opacity * (Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1)
			* (Number.isFinite(fillOpacity) ? Math.min(1, Math.max(0, fillOpacity)) : 1),
	};
}

function makeElement(
	node: SVGElement,
	matrix: Matrix,
	inherited: InheritedStyle,
	boardWidth: number,
	boardHeight: number,
): LogoElement {
	const style = styleFor(node, inherited);
	const fill = style.fill ?? '#203b32';
	const stroke = style.stroke;
	const strokeWidth = style.strokeWidth ?? 1;
	const attrs = (name: string, fallback = 0) => parseLength(node.getAttribute(name), fallback);
	const sx = Math.hypot(matrix[0], matrix[1]);
	const sy = Math.hypot(matrix[2], matrix[3]);
	const angle = Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI;
	if (![...matrix, sx, sy, angle].every(Number.isFinite) || sx <= 0 || sy <= 0 || Math.abs(matrix[0] * matrix[2] + matrix[1] * matrix[3]) > 0.001 || matrix[0] * matrix[3] - matrix[1] * matrix[2] < 0) {
		throw new Error('This SVG shape uses a skewed or reflected transform.');
	}
	const addShape = (shape: string, x: number, y: number, width: number, height: number, radius = 0) => {
		if (![x, y, width, height, radius].every(Number.isFinite) || width <= 0 || height <= 0 || Math.max(Math.abs(x), Math.abs(y), width, height) > MAX_COORDINATE) {
			throw new Error('This SVG shape has invalid or unsupported dimensions.');
		}
		const center = transformPoint(matrix, x + width / 2, y + height / 2);
		return createDefaultElement('shape', {
			name: `Imported ${shape}`,
			shape,
			x: center[0] - width * sx / 2,
			y: center[1] - height * sy / 2,
			width: width * sx,
			height: height * sy,
			rotation: angle,
			opacity: style.opacity,
			fill,
			stroke,
			strokeWidth,
			radius: radius * Math.min(sx, sy),
			role: 'other',
		});
	};

	switch (node.localName) {
		case 'rect': {
			const width = attrs('width');
			const height = attrs('height');
			if (width <= 0 || height <= 0) throw new Error('This SVG rectangle has invalid dimensions.');
			return addShape(attrs('rx') || attrs('ry') ? 'rounded-rectangle' : 'rectangle', attrs('x'), attrs('y'), width, height, attrs('rx') || attrs('ry'));
		}
		case 'circle': {
			const radius = attrs('r');
			if (radius <= 0) throw new Error('This SVG circle has invalid dimensions.');
			return addShape('circle', attrs('cx') - radius, attrs('cy') - radius, radius * 2, radius * 2);
		}
		case 'ellipse':
			if (attrs('rx') <= 0 || attrs('ry') <= 0) throw new Error('This SVG ellipse has invalid dimensions.');
			return addShape('circle', attrs('cx') - attrs('rx'), attrs('cy') - attrs('ry'), attrs('rx') * 2, attrs('ry') * 2);
		case 'path': {
			const path = transformedPath(node.getAttribute('d') ?? '', matrix);
			if (/NaN|Infinity/.test(path)) throw new Error('This SVG path has invalid coordinates.');
			return createDefaultElement('path', {
				name: 'Imported path',
				x: 0,
				y: 0,
				width: boardWidth,
				height: boardHeight,
				d: path,
				fill,
				stroke,
				strokeWidth,
				fillRule: node.getAttribute('fill-rule') === 'evenodd' ? 'evenodd' : 'nonzero',
				opacity: style.opacity,
				role: 'other',
			});
		}
		case 'line': {
			const [x1, y1] = transformPoint(matrix, attrs('x1'), attrs('y1'));
			const [x2, y2] = transformPoint(matrix, attrs('x2'), attrs('y2'));
			if (![x1, y1, x2, y2].every(Number.isFinite) || Math.max(Math.abs(x1), Math.abs(y1), Math.abs(x2), Math.abs(y2)) > MAX_COORDINATE) {
				throw new Error('This SVG line has invalid coordinates.');
			}
			return createDefaultElement('path', {
				name: 'Imported line',
				x: 0,
				y: 0,
				width: boardWidth,
				height: boardHeight,
				d: `M ${x1} ${y1} L ${x2} ${y2}`,
				fill: 'none',
				stroke: stroke ?? fill,
				strokeWidth,
				opacity: style.opacity,
				role: 'other',
			});
		}
		case 'polyline':
		case 'polygon': {
			if ((node.getAttribute('points')?.length ?? 0) > MAX_PATH_CHARS) throw new Error('This SVG polygon is too large to import.');
			const points = parsePoints(node.getAttribute('points') ?? '').map(([x, y]) => transformPoint(matrix, x, y));
			if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || Math.max(Math.abs(x), Math.abs(y)) > MAX_COORDINATE)) {
				throw new Error('This SVG polygon has invalid coordinates.');
			}
			const d = `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')}${node.localName === 'polygon' ? ' Z' : ''}`;
			return createDefaultElement('path', {
				name: `Imported ${node.localName}`,
				x: 0,
				y: 0,
				width: boardWidth,
				height: boardHeight,
				d,
				fill: node.localName === 'polyline' && !node.getAttribute('fill') ? 'none' : fill,
				stroke,
				strokeWidth,
				opacity: style.opacity,
				role: 'other',
			});
		}
		default:
			throw new Error(`Unsupported SVG element: ${node.localName}.`);
	}
}

export function importSvg(contents: string, boardWidth: number, boardHeight: number): ImportResult {
	if (new TextEncoder().encode(contents).byteLength > MAX_FILE_BYTES) throw new Error('SVG files must be 10 MB or smaller.');
	if (![boardWidth, boardHeight].every(Number.isFinite) || boardWidth < 1 || boardHeight < 1) {
		throw new Error('The logo artboard has invalid dimensions.');
	}
	const sanitized = sanitizeReferenceSvg(contents);
	const sanitizerSkipped = DOMPurify.removed.filter((item) => 'element' in item && item.element.nodeType === Node.ELEMENT_NODE).length;
	const document = new DOMParser().parseFromString(sanitized, 'image/svg+xml');
	if (document.querySelector('parsererror') || document.documentElement.localName !== 'svg') {
		throw new Error('This SVG could not be parsed. Choose a valid SVG file.');
	}
	const root = document.documentElement;
	const viewBox = numberList(root.getAttribute('viewBox') ?? '');
	if (viewBox.length !== 0 && (viewBox.length !== 4 || viewBox[2] <= 0 || viewBox[3] <= 0)) {
		throw new Error('This SVG has an invalid viewBox.');
	}
	const sourceWidth = viewBox.length === 4 && viewBox[2] > 0 ? viewBox[2] : parseLength(root.getAttribute('width'), boardWidth);
	const sourceHeight = viewBox.length === 4 && viewBox[3] > 0 ? viewBox[3] : parseLength(root.getAttribute('height'), boardHeight);
	if (![sourceWidth, sourceHeight].every(Number.isFinite) || sourceWidth <= 0 || sourceHeight <= 0) {
		throw new Error('This SVG has invalid canvas dimensions.');
	}
	const sourceX = viewBox.length === 4 ? viewBox[0] : 0;
	const sourceY = viewBox.length === 4 ? viewBox[1] : 0;
	const scale = Math.min(boardWidth * 0.8 / sourceWidth, boardHeight * 0.8 / sourceHeight);
	const rootMap: Matrix = [scale, 0, 0, scale, (boardWidth - sourceWidth * scale) / 2 - sourceX * scale, (boardHeight - sourceHeight * scale) / 2 - sourceY * scale];
	const initialStyle: InheritedStyle = { opacity: 1 };
	const elements: LogoElement[] = [];
	let skipped = sanitizerSkipped;
	let truncated = false;
	let limitReason: string | undefined;
	let visited = 0;
	const visit = (node: SVGElement, parentMatrix: Matrix, parentStyle: InheritedStyle, depth = 0) => {
		visited += 1;
		if (depth > MAX_DEPTH) {
			skipped += 1;
			limitReason ??= 'The SVG nesting limit';
			return;
		}
		if (visited > MAX_NODES) {
			truncated = true;
			limitReason = 'The SVG complexity limit';
			return;
		}
		if (elements.length >= MAX_ELEMENTS) {
			truncated = true;
			limitReason = 'The 500-element limit';
			return;
		}
		let matrix: Matrix;
		try {
			matrix = multiply(parentMatrix, parseTransform(node.getAttribute('transform')));
		} catch {
			skipped += 1;
			return;
		}
		const style = styleFor(node, parentStyle);
		if (node.localName === 'svg' || node.localName === 'g') {
			const children = Array.from(node.children);
			for (const [index, child] of children.entries()) {
				if (elements.length >= MAX_ELEMENTS) {
					truncated = true;
					limitReason = 'The 500-element limit';
					break;
				}
				if (visited >= MAX_NODES && index + 1 < children.length) {
					truncated = true;
					limitReason = 'The SVG complexity limit';
					break;
				}
				visit(child as SVGElement, matrix, style, depth + 1);
			}
			return;
		}
		if (['defs', 'title', 'desc', 'metadata'].includes(node.localName)) return;
		if (['filter', 'mask', 'clipPath'].includes(node.localName)) {
			skipped += 1;
			return;
		}
		if (!['rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path'].includes(node.localName)) {
			skipped += 1;
			return;
		}
		if (['filter', 'mask', 'clip-path'].some((name) => {
			const value = node.getAttribute(name);
			return Boolean(value && value !== 'none');
		})) {
			skipped += 1;
			return;
		}
		try {
			elements.push(makeElement(node, matrix, parentStyle, boardWidth, boardHeight));
		} catch {
			skipped += 1;
		}
	};
	const rootMatrix = multiply(rootMap, parseTransform(root.getAttribute('transform')));
	const rootStyle = styleFor(root, initialStyle);
	for (const child of Array.from(root.children)) visit(child as SVGElement, rootMatrix, rootStyle);
	if (truncated) skipped += Math.max(1, document.querySelectorAll('rect,circle,ellipse,line,polyline,polygon,path').length - elements.length);
	if (!elements.length) throw new Error('No supported shapes were found in this SVG.');
	return { elements, imported: elements.length, skipped, truncated, ...(limitReason ? { limitReason } : {}) };
}

export function importCustomSvgIcon(contents: string, boardWidth: number, boardHeight: number): ImportResult {
	const result = importSvg(contents, boardWidth, boardHeight);
	const group = createDefaultElement('group', {
		name: 'Custom SVG icon',
		role: 'icon',
		x: 0,
		y: 0,
		width: boardWidth,
		height: boardHeight,
		fill: '#203b32',
		stroke: '#203b32',
		strokeWidth: 2,
		children: result.elements,
	});
	return { ...result, elements: [group] };
}
