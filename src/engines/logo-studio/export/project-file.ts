import type { Element, ElementType, LogoProject } from '../model/types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_ELEMENTS = 5000;
const MAX_GROUP_DEPTH = 30;
const elementTypes = new Set<ElementType>(['text', 'shape', 'icon', 'image', 'group']);

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
	const name = optionalString(value, 'name', 200);
	if (name !== undefined) element.name = name;
	if (element.width < 0 || element.height < 0 || element.opacity < 0 || element.opacity > 1) {
		throw new Error('An element has dimensions or opacity outside the supported range.');
	}

	for (const key of ['fill', 'stroke', 'text', 'fontFamily', 'shape', 'iconName', 'src'] as const) {
		const result = optionalString(value, key);
		if (result !== undefined) element[key] = result;
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

	return {
		version: 1,
		id: requiredString(value, 'id', 160),
		name: requiredString(value, 'name'),
		updatedAt: finiteNumber(value.updatedAt) ? value.updatedAt : Date.now(),
		artboard: { width, height, background },
		variants,
	};
}

export function createProjectFile(project: LogoProject): Blob {
	return new Blob([`${JSON.stringify(project, null, 2)}\n`], { type: 'application/json' });
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

export async function readProjectFile(file: File): Promise<LogoProject> {
	if (file.size > MAX_FILE_BYTES) throw new Error('Project files must be 10 MB or smaller.');
	return parseProjectFile(await file.text());
}
