import type { Element, ElementRole, ElementType, LogoArrangement, LogoIndustry, LogoProject, LogoStyle } from '../model/types';
import { sanitizeReferenceSvg, type ReferenceLayer } from '../store/references';

const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_ELEMENTS = 5000;
const MAX_GROUP_DEPTH = 30;
const elementTypes = new Set<ElementType>(['text', 'shape', 'icon', 'image', 'group', 'path']);
const elementRoles = new Set<ElementRole>(['icon', 'name', 'tagline', 'decor', 'other']);
const industries = new Set<LogoIndustry>(['Technology', 'Business', 'Fashion', 'Construction', 'Food', 'Transport', 'Education', 'Health', 'Creative', 'General']);
const styles = new Set<LogoStyle>(['Minimalist', 'Modern', 'Corporate', 'Luxury', 'Futuristic', 'Geometric', 'Vintage', 'Elegant', 'Bold', 'Abstract', 'Playful', 'Professional']);
const arrangements = new Set<LogoArrangement>(['icon-above-text', 'icon-left', 'icon-right', 'text-only', 'badge']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function requiredString(record: Record<string, unknown>, key: string, maximum = 200): string {
	const value = record[key];
	if (typeof value !== 'string' || value.length < 1 || value.length > maximum) {
		throw new Error(`The project file has an invalid “${key}” field.`);
	}
	return value;
}

function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
	const value = record[key];
	if (value === undefined) return undefined;
	if (!finiteNumber(value)) throw new Error(`The project file has an invalid “${key}” value.`);
	return value;
}

function optionalString(record: Record<string, unknown>, key: string, maximum = 10000): string | undefined {
	const value = record[key];
	if (value === undefined) return undefined;
	if (typeof value !== 'string' || value.length > maximum) {
		throw new Error(`The project file has an invalid “${key}” value.`);
	}
	return value;
}

function validateElement(value: unknown, depth: number, count: { value: number }): Element {
	if (!isRecord(value)) throw new Error('The project file contains an invalid element.');
	if (depth > MAX_GROUP_DEPTH) throw new Error('The project file has too many nested groups.');
	count.value += 1;
	if (count.value > MAX_ELEMENTS) throw new Error('The project file contains too many elements.');

	const type = value.type;
	if (typeof type !== 'string' || !elementTypes.has(type as ElementType)) {
		throw new Error('The project file contains an unsupported element type.');
	}
	for (const key of ['x', 'y', 'width', 'height', 'rotation', 'opacity']) {
		if (!finiteNumber(value[key])) throw new Error(`An element has an invalid “${key}” value.`);
	}
	if (typeof value.locked !== 'boolean' || typeof value.visible !== 'boolean') {
		throw new Error('An element has invalid visibility or lock settings.');
	}

	const element: Element = {
		id: requiredString(value, 'id', 160),
		type: type as ElementType,
		x: value.x as number,
		y: value.y as number,
		width: value.width as number,
		height: value.height as number,
		rotation: value.rotation as number,
		opacity: value.opacity as number,
		locked: value.locked,
		visible: value.visible,
	};
	if (value.role !== undefined) {
		if (typeof value.role !== 'string' || !elementRoles.has(value.role as ElementRole)) {
			throw new Error('An element has an unsupported role.');
		}
		element.role = value.role as ElementRole;
	}
	const name = optionalString(value, 'name', 200);
	if (name !== undefined) element.name = name;
	if (element.width < 0 || element.height < 0 || element.opacity < 0 || element.opacity > 1) {
		throw new Error('An element has dimensions or opacity outside the supported range.');
	}

	for (const key of ['fill', 'stroke', 'text', 'fontFamily', 'shape', 'iconName', 'src'] as const) {
		const result = optionalString(value, key, key === 'src' ? Math.ceil(10 * 1024 * 1024 * 4 / 3) + 1024 : 10000);
		if (result !== undefined) element[key] = result;
	}
	const fieldName = optionalString(value, 'fieldName', 100);
	if (fieldName !== undefined && (type === 'text' || type === 'image')) element.fieldName = fieldName;
	if (value.fit !== undefined && type === 'image') {
		if (value.fit !== 'contain' && value.fit !== 'cover') throw new Error('An image element has an invalid fit rule.');
		element.fit = value.fit;
	}
	if (type === 'image') element.fit ??= 'contain';
	const path = optionalString(value, 'd', 1_000_000);
	if (path !== undefined) element.d = path;
	if (value.fillRule !== undefined) {
		if (value.fillRule !== 'nonzero' && value.fillRule !== 'evenodd') {
			throw new Error('A path element has an invalid fill rule.');
		}
		element.fillRule = value.fillRule;
	}
	for (const key of ['strokeWidth', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'curve', 'radius'] as const) {
		const result = optionalNumber(value, key);
		if (result !== undefined) element[key] = result;
	}
	for (const key of ['sides', 'points'] as const) {
		const result = optionalNumber(value, key);
		if (result !== undefined) element[key] = Math.min(12, Math.max(3, Math.round(result)));
	}
	if (value.gradient !== undefined) {
		if (!isRecord(value.gradient)
			|| (value.gradient.type !== 'linear' && value.gradient.type !== 'radial')
			|| !finiteNumber(value.gradient.angle)
			|| !Array.isArray(value.gradient.stops)
			|| value.gradient.stops.length < 2
			|| value.gradient.stops.length > 4) {
			throw new Error('An element has an invalid gradient fill.');
		}
		const stops = value.gradient.stops.map((stop) => {
			if (!isRecord(stop) || !finiteNumber(stop.offset) || stop.offset < 0 || stop.offset > 1
				|| typeof stop.color !== 'string' || !/^#[\da-f]{6}$/i.test(stop.color)) {
				throw new Error('An element has an invalid gradient stop.');
			}
			return { offset: stop.offset, color: stop.color };
		});
		element.gradient = {
			type: value.gradient.type,
			angle: value.gradient.angle,
			stops,
		};
	}
	if (value.shadow !== undefined) {
		if (!isRecord(value.shadow)
			|| !finiteNumber(value.shadow.offsetX)
			|| !finiteNumber(value.shadow.offsetY)
			|| !finiteNumber(value.shadow.blur)
			|| value.shadow.blur < 0
			|| typeof value.shadow.color !== 'string'
			|| !/^#[\da-f]{6}$/i.test(value.shadow.color)) {
			throw new Error('An element has an invalid shadow effect.');
		}
		element.shadow = {
			offsetX: value.shadow.offsetX,
			offsetY: value.shadow.offsetY,
			blur: value.shadow.blur,
			color: value.shadow.color,
		};
	}
	if (value.align !== undefined) {
		if (value.align !== 'left' && value.align !== 'center' && value.align !== 'right') {
			throw new Error('An element has an invalid text alignment.');
		}
		element.align = value.align;
	}
	if (value.pathData !== undefined) {
		const validPath = typeof value.pathData === 'string'
			|| (Array.isArray(value.pathData) && value.pathData.every((pair) => (
				Array.isArray(pair) && pair.every(finiteNumber)
			)));
		if (!validPath) throw new Error('An element has invalid path data.');
		element.pathData = value.pathData as string | number[][];
	}
	if (value.children !== undefined) {
		if (!Array.isArray(value.children)) throw new Error('A group has invalid child elements.');
		element.children = value.children.map((child) => validateElement(child, depth + 1, count));
	}
	return element;
}

export function validateLogoProject(value: unknown): LogoProject {
	if (!isRecord(value)) throw new Error('This file is not a Logo Studio project.');
	if (!finiteNumber(value.version)) throw new Error('The project file is missing its version.');
	if (value.version > 1) {
		throw new Error('This project was created with a newer version of Logo Studio. Update the app to open it.');
	}
	if (value.version !== 1) throw new Error('This project version is not supported by this version of Logo Studio.');
	if (!isRecord(value.artboard) || !isRecord(value.variants)) {
		throw new Error('The project file is missing its artboard or design data.');
	}

	const width = value.artboard.width;
	const height = value.artboard.height;
	if (!finiteNumber(width) || !finiteNumber(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
		throw new Error('The project file has invalid artboard dimensions.');
	}
	const background = value.artboard.background;
	if (typeof background !== 'string' || background.length > 100) {
		throw new Error('The project file has an invalid artboard background.');
	}

	const count = { value: 0 };
	const variants: Record<string, Element[]> = {};
	for (const [name, elements] of Object.entries(value.variants)) {
		if (!name || name.length > 80 || !Array.isArray(elements)) {
			throw new Error('The project file contains an invalid design variant.');
		}
		variants[name] = elements.map((element) => validateElement(element, 0, count));
	}
	if (!variants.primary) throw new Error('The project file is missing its primary design.');
	let variantBackgrounds: Record<string, string> | undefined;
	if (value.variantBackgrounds !== undefined) {
		if (!isRecord(value.variantBackgrounds)) throw new Error('The project file contains invalid variant backgrounds.');
		variantBackgrounds = {};
		for (const [name, background] of Object.entries(value.variantBackgrounds)) {
			if (!variants[name] || typeof background !== 'string' || background.length > 100) {
				throw new Error('The project file contains an invalid variant background.');
			}
			variantBackgrounds[name] = background;
		}
	}
	let variantSources: Record<string, string> | undefined;
	if (value.variantSources !== undefined) {
		if (!isRecord(value.variantSources)) throw new Error('The project file contains invalid variant sources.');
		variantSources = {};
		for (const [name, signature] of Object.entries(value.variantSources)) {
			if (!variants[name] || typeof signature !== 'string' || signature.length > 1_000_000) {
				throw new Error('The project file contains an invalid variant source.');
			}
			variantSources[name] = signature;
		}
	}
	let variantColors: Record<string, string> | undefined;
	if (value.variantColors !== undefined) {
		if (!isRecord(value.variantColors)) throw new Error('The project file contains invalid variant colours.');
		variantColors = {};
		for (const [name, color] of Object.entries(value.variantColors)) {
			if (!variants[name] || typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color)) {
				throw new Error('The project file contains an invalid variant colour.');
			}
			variantColors[name] = color;
		}
	}
	let generation: LogoProject['generation'];
	if (value.generation !== undefined) {
		if (!isRecord(value.generation) || !isRecord(value.generation.fontPair)
			|| typeof value.generation.seed !== 'number' || !Number.isFinite(value.generation.seed)
			|| typeof value.generation.layoutId !== 'string'
			|| typeof value.generation.paletteName !== 'string'
			|| typeof value.generation.icon !== 'string'
			|| typeof value.generation.fontPair.name !== 'string'
			|| typeof value.generation.fontPair.primary !== 'string'
			|| typeof value.generation.fontPair.secondary !== 'string') {
			throw new Error('The project file contains invalid generator information.');
		}
		generation = {
			layoutId: value.generation.layoutId.slice(0, 100),
			seed: value.generation.seed,
			paletteName: value.generation.paletteName.slice(0, 100),
			icon: value.generation.icon.slice(0, 100),
			fontPair: {
				name: value.generation.fontPair.name.slice(0, 100),
				primary: value.generation.fontPair.primary.slice(0, 100),
				secondary: value.generation.fontPair.secondary.slice(0, 100),
			},
		};
	}

	let brief: LogoProject['brief'];
	if (value.brief !== undefined) {
		if (!isRecord(value.brief)
			|| typeof value.brief.businessName !== 'string'
			|| !value.brief.businessName.trim()
			|| value.brief.businessName.length > 200
			|| typeof value.brief.tagline !== 'string'
			|| value.brief.tagline.length > 300
			|| typeof value.brief.description !== 'string'
			|| value.brief.description.length > 1000
			|| typeof value.brief.industry !== 'string'
			|| !industries.has(value.brief.industry as LogoIndustry)
			|| typeof value.brief.style !== 'string'
			|| !styles.has(value.brief.style as LogoStyle)
			|| typeof value.brief.preferredPalette !== 'string'
			|| value.brief.preferredPalette.length > 80
			|| typeof value.brief.arrangement !== 'string'
			|| !arrangements.has(value.brief.arrangement as LogoArrangement)
			|| (value.brief.customColor !== undefined && (typeof value.brief.customColor !== 'string' || !/^#[\da-f]{6}$/i.test(value.brief.customColor)))) {
			throw new Error('The project file contains an invalid design brief.');
		}
		brief = {
			businessName: value.brief.businessName,
			tagline: value.brief.tagline,
			description: value.brief.description,
			industry: value.brief.industry as LogoIndustry,
			style: value.brief.style as LogoStyle,
			preferredPalette: value.brief.preferredPalette,
			arrangement: value.brief.arrangement as LogoArrangement,
			...(typeof value.brief.customColor === 'string' ? { customColor: value.brief.customColor } : {}),
		};
	}

	return {
		version: 1,
		id: requiredString(value, 'id', 160),
		name: requiredString(value, 'name'),
		updatedAt: finiteNumber(value.updatedAt) ? value.updatedAt : Date.now(),
		artboard: { width, height, background },
		variants,
		...(variantBackgrounds ? { variantBackgrounds } : {}),
		...(variantSources ? { variantSources } : {}),
		...(variantColors ? { variantColors } : {}),
		...(generation ? { generation } : {}),
		...(brief ? { brief } : {}),
	};
}

export function createProjectFile(project: LogoProject): Blob {
	return new Blob([`${JSON.stringify(project, null, 2)}\n`], { type: 'application/json' });
}

function blobToBase64(blob: Blob): Promise<string> {
	return blob.arrayBuffer().then((buffer) => {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let index = 0; index < bytes.length; index += 0x8000) {
			binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
		}
		return btoa(binary);
	});
}

export async function createProjectFileWithReference(project: LogoProject, reference: ReferenceLayer | null): Promise<Blob> {
	if (!reference) return createProjectFile(project);
	const referenceData = {
		name: reference.name,
		x: reference.x,
		y: reference.y,
		width: reference.width,
		height: reference.height,
		opacity: reference.opacity,
		visible: reference.visible,
		locked: reference.locked,
		type: reference.blob.type,
		data: await blobToBase64(reference.blob),
	};
	return new Blob([`${JSON.stringify({ ...project, reference: referenceData }, null, 2)}\n`], { type: 'application/json' });
}

export function parseProjectFile(contents: string): LogoProject {
	let parsed: unknown;
	try {
		parsed = JSON.parse(contents);
	} catch {
		throw new Error('The selected file is not valid JSON. Choose a Logo Studio .json project file.');
	}
	return validateLogoProject(parsed);
}

function parseEmbeddedReference(value: unknown): ReferenceLayer | null {
	if (!isRecord(value) || value.reference === undefined) return null;
	if (!isRecord(value.reference)) throw new Error('The project file contains an invalid embedded reference image.');
	const reference = value.reference;
	if (typeof reference.name !== 'string'
		|| reference.name.length > 180
		|| typeof reference.type !== 'string'
		|| !['image/webp', 'image/png', 'image/svg+xml'].includes(reference.type)
		|| typeof reference.data !== 'string'
		|| reference.data.length === 0
		|| reference.data.length > Math.ceil(MAX_REFERENCE_BYTES * 4 / 3) + 4
		|| !/^[\da-z+/]+=*$/i.test(reference.data)
		|| ![reference.x, reference.y, reference.width, reference.height, reference.opacity].every(finiteNumber)
		|| (reference.width as number) < 1
		|| (reference.height as number) < 1
		|| (reference.opacity as number) < 0
		|| (reference.opacity as number) > 1
		|| typeof reference.visible !== 'boolean'
		|| typeof reference.locked !== 'boolean') {
		throw new Error('The project file contains an invalid embedded reference image.');
	}
	let binary: string;
	try {
		binary = atob(reference.data);
	} catch {
		throw new Error('The embedded reference image data is not valid base64.');
	}
	if (binary.length > MAX_REFERENCE_BYTES) throw new Error('The embedded reference image is larger than 10 MB.');
	const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
	let blob = new Blob([bytes], { type: reference.type });
	if (reference.type === 'image/svg+xml') {
		const sanitized = sanitizeReferenceSvg(new TextDecoder().decode(bytes));
		blob = new Blob([sanitized], { type: 'image/svg+xml' });
	}
	return {
		blob,
		name: reference.name,
		x: reference.x as number,
		y: reference.y as number,
		width: reference.width as number,
		height: reference.height as number,
		opacity: reference.opacity as number,
		visible: reference.visible,
		locked: reference.locked,
	};
}

export async function readProjectFileWithReference(file: File): Promise<{ project: LogoProject; reference: ReferenceLayer | null }> {
	if (file.size > MAX_FILE_BYTES) throw new Error('Project files must be 16 MB or smaller.');
	const contents = await file.text();
	let parsed: unknown;
	try {
		parsed = JSON.parse(contents);
	} catch {
		throw new Error('The selected file is not valid JSON. Choose a Logo Studio .json project file.');
	}
	return { project: validateLogoProject(parsed), reference: parseEmbeddedReference(parsed) };
}

export async function readProjectFile(file: File): Promise<LogoProject> {
	if (file.size > MAX_FILE_BYTES) throw new Error('Project files must be 16 MB or smaller.');
	return parseProjectFile(await file.text());
}
