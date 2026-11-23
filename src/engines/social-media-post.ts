export type SocialPostLayout = 'centered' | 'editorial' | 'bold-band';

export interface SocialMediaPostOptions {
	width: number;
	height: number;
	title: string;
	body: string;
	footer: string;
	backgroundColor: string;
	accentColor: string;
	textColor: string;
	layout: SocialPostLayout;
	fontSize: number;
}

interface PostShape {
	type: 'rect' | 'circle';
	x: number;
	y: number;
	width?: number;
	height?: number;
	radius?: number;
	fill: string;
}

interface PostText {
	text: string;
	x: number;
	y: number;
	color: string;
	fontSize: number;
	fontWeight: number;
	align: CanvasTextAlign;
	lineHeight: number;
}

export interface SocialMediaPostScene {
	width: number;
	height: number;
	shapes: PostShape[];
	text: PostText[];
}

const DEFAULT_COLORS = {
	backgroundColor: '#f5f0e8',
	accentColor: '#b95236',
	textColor: '#20211f',
};

function safeColor(value: string, fallback: string): string {
	return /^#[\da-f]{6}$/i.test(value) ? value : fallback;
}

function safeDimension(value: number): number {
	return Number.isFinite(value) ? Math.min(4096, Math.max(1, Math.round(value))) : 1080;
}

function safeText(value: string, limit: number): string {
	return value.slice(0, limit).trim();
}

function wrapText(value: string, maxCharacters: number, maxLines: number): string[] {
	const words = value.trim().split(/\s+/).filter(Boolean);
	if (!words.length) return [];
	const lines: string[] = [];
	let line = '';
	for (const word of words) {
		const next = line ? `${line} ${word}` : word;
		if (next.length <= maxCharacters || !line) {
			line = next;
			continue;
		}
		lines.push(line);
		line = word;
		if (lines.length === maxLines) break;
	}
	if (lines.length < maxLines && line) lines.push(line);
	const consumed = lines.join(' ').length;
	if (consumed < words.join(' ').length && lines.length) {
		const last = lines.length - 1;
		lines[last] = `${lines[last].replace(/[.…]+$/, '')}…`;
	}
	return lines;
}

export function createSocialMediaPostScene(options: SocialMediaPostOptions): SocialMediaPostScene {
	const width = safeDimension(options.width);
	const height = safeDimension(options.height);
	const background = safeColor(options.backgroundColor, DEFAULT_COLORS.backgroundColor);
	const accent = safeColor(options.accentColor, DEFAULT_COLORS.accentColor);
	const foreground = safeColor(options.textColor, DEFAULT_COLORS.textColor);
	const scale = Math.min(width, height) / 1080;
	const requestedFontSize = Number.isFinite(options.fontSize) ? options.fontSize : 88;
	const titleSize = Math.min(180, Math.max(24, requestedFontSize)) * scale;
	const bodySize = titleSize * 0.36;
	const footerSize = titleSize * 0.2;
	const margin = width * 0.105;
	const isCentered = options.layout === 'centered';
	const isEditorial = options.layout === 'editorial';
	const align: CanvasTextAlign = isCentered ? 'center' : 'left';
	const textX = isCentered ? width / 2 : margin + (isEditorial ? width * 0.035 : 0);
	const textWidth = width - margin * 2 - (isEditorial ? width * 0.035 : 0);
	const titleLines = wrapText(safeText(options.title, 240), Math.max(8, Math.floor(textWidth / (titleSize * 0.57))), 4);
	const bodyLines = wrapText(safeText(options.body, 480), Math.max(12, Math.floor(textWidth / (bodySize * 0.55))), 6);
	const footerLines = wrapText(safeText(options.footer, 100), Math.max(12, Math.floor(textWidth / (footerSize * 0.55))), 1);
	const titleLineHeight = titleSize * 1.08;
	const bodyLineHeight = bodySize * 1.5;
	const titleBlockHeight = titleLines.length * titleLineHeight;
	const bodyBlockHeight = bodyLines.length * bodyLineHeight;
	const contentHeight = titleBlockHeight + (bodyLines.length ? bodySize * 0.9 + bodyBlockHeight : 0);
	const contentTop = Math.max(height * 0.2, (height - contentHeight) / 2);
	const titleY = isEditorial ? height * 0.34 : contentTop;
	const bodyY = titleY + titleBlockHeight + bodySize * 0.9;
	const shapes: PostShape[] = [{ type: 'rect', x: 0, y: 0, width, height, fill: background }];

	if (isEditorial) {
		shapes.push({ type: 'rect', x: 0, y: 0, width: Math.max(10, width * 0.022), height, fill: accent });
		shapes.push({ type: 'circle', x: width * 0.88, y: height * 0.16, radius: Math.min(width, height) * 0.065, fill: accent });
	} else if (options.layout === 'bold-band') {
		shapes.push({ type: 'rect', x: 0, y: height * 0.23, width, height: height * 0.54, fill: accent });
	}

	const text: PostText[] = [];
	titleLines.forEach((value, index) => text.push({
		text: value, x: textX, y: titleY + index * titleLineHeight,
		color: foreground,
		fontSize: titleSize, fontWeight: 700, align, lineHeight: titleLineHeight,
	}));
	bodyLines.forEach((value, index) => text.push({
		text: value, x: textX, y: bodyY + index * bodyLineHeight,
		color: foreground,
		fontSize: bodySize, fontWeight: 400, align, lineHeight: bodyLineHeight,
	}));
	footerLines.forEach((value, index) => text.push({
		text: value, x: textX, y: height - height * 0.09 + index * footerSize,
		color: accent,
		fontSize: footerSize, fontWeight: 700, align, lineHeight: footerSize * 1.2,
	}));
	return { width, height, shapes, text };
}

function escapeXml(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function createSocialMediaPostSvg(options: SocialMediaPostOptions): string {
	const scene = createSocialMediaPostScene(options);
	const shapes = scene.shapes.map((shape) => shape.type === 'rect'
		? `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" fill="${shape.fill}"/>`
		: `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}" fill="${shape.fill}"/>`).join('');
	const text = scene.text.map((line) => `<text x="${line.x}" y="${line.y}" fill="${line.color}" font-family="Arial, Helvetica, sans-serif" font-size="${line.fontSize}" font-weight="${line.fontWeight}" text-anchor="${line.align === 'center' ? 'middle' : 'start'}">${escapeXml(line.text)}</text>`).join('');
	const title = escapeXml(safeText(options.title, 240) || 'Social media post');
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="post-title"><title id="post-title">${title}</title>${shapes}${text}</svg>`;
}

export function drawSocialMediaPost(context: CanvasRenderingContext2D, options: SocialMediaPostOptions): void {
	const scene = createSocialMediaPostScene(options);
	context.canvas.width = scene.width;
	context.canvas.height = scene.height;
	context.clearRect(0, 0, scene.width, scene.height);
	for (const shape of scene.shapes) {
		context.fillStyle = shape.fill;
		if (shape.type === 'rect') context.fillRect(shape.x, shape.y, shape.width ?? 0, shape.height ?? 0);
		else {
			context.beginPath();
			context.arc(shape.x, shape.y, shape.radius ?? 0, 0, Math.PI * 2);
			context.fill();
		}
	}
	context.textBaseline = 'alphabetic';
	for (const line of scene.text) {
		context.fillStyle = line.color;
		context.font = `${line.fontWeight} ${line.fontSize}px Arial, Helvetica, sans-serif`;
		context.textAlign = line.align;
		context.fillText(line.text, line.x, line.y);
	}
}
