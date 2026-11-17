import type { BrandKit } from '../../logo-studio/brand/kit';
import { createDefaultElement, createDefaultProject, type Element, type LogoProject } from '../../logo-studio/model/types';
import { getMoodBoardCells, getMoodBoardPreset, MOOD_BOARD_PRESETS } from './layouts';

function color(kit: BrandKit, role: string, fallback: string): string {
	return kit.colors.find((entry) => entry.role === role)?.hex ?? fallback;
}

function text(textValue: string, name: string, x: number, y: number, width: number, height: number, size: number, fill: string, fontFamily = kitFontFallback): Element {
	return createDefaultElement('text', {
		name,
		fieldName: name,
		text: textValue,
		x,
		y,
		width,
		height,
		fontFamily,
		fontSize: size,
		fontWeight: name === 'moodboard-title' ? 700 : 500,
		align: 'left',
		fill,
	});
}

const kitFontFallback = 'Inter';

function scaledLogoElements(kit: BrandKit, width: number, height: number): Element[] {
	const source = kit.logo?.variants.primary;
	if (!source?.length) {
		return [text(kit.profile?.businessName || kit.name, 'moodboard-logo', width * 0.76, height * 0.025, width * 0.2, height * 0.06, height * 0.04, color(kit, 'primary', '#203b32'))];
	}
	const minX = Math.min(...source.map((element) => element.x));
	const minY = Math.min(...source.map((element) => element.y));
	const maxX = Math.max(...source.map((element) => element.x + element.width));
	const maxY = Math.max(...source.map((element) => element.y + element.height));
	const scale = Math.min(width * 0.18 / Math.max(1, maxX - minX), height * 0.07 / Math.max(1, maxY - minY));
	return source.map((element) => ({
		...element,
		id: `moodboard-logo-${element.id}`,
		x: width * 0.78 + (element.x - minX) * scale,
		y: height * 0.02 + (element.y - minY) * scale,
		width: element.width * scale,
		height: element.height * scale,
		...(element.fontSize ? { fontSize: element.fontSize * scale } : {}),
		...(element.strokeWidth ? { strokeWidth: element.strokeWidth * scale } : {}),
	}));
}

export function createMoodBoardProject(kit: BrandKit, presetInput: string, imageCount = 6, keywords = ''): LogoProject {
	const preset = getMoodBoardPreset(presetInput);
	const { width, height, background } = MOOD_BOARD_PRESETS[preset];
	const project = createDefaultProject(`${kit.name} Mood Board`);
	const primary = color(kit, 'primary', '#203b32');
	const secondary = color(kit, 'secondary', '#d7ed79');
	const accent = color(kit, 'accent', '#e7aa81');
	const light = color(kit, 'light', '#ffffff');
	const dark = color(kit, 'dark', '#203b32');
	const elements: Element[] = [
		...getMoodBoardCells(imageCount).flatMap((cell, index) => {
			const x = Math.round(cell.x * width);
			const y = Math.round((0.12 + cell.y * 0.78) * height);
			const cellWidth = Math.round(cell.width * width);
			const cellHeight = Math.round(cell.height * height * 0.78);
			return [
				createDefaultElement('shape', {
					id: `moodboard-slot-bg-${index + 1}`,
					name: `Image slot ${index + 1} background`,
					fieldName: 'moodboardSlotBackground',
					x, y, width: cellWidth, height: cellHeight,
					fill: index % 2 ? light : '#f1f0eb',
					stroke: secondary,
					strokeWidth: Math.max(1, width * 0.001),
				}),
				createDefaultElement('image', {
					id: `moodboard-slot-${index + 1}`,
					name: `Image slot ${index + 1}`,
					fieldName: 'moodboardImage',
					x, y, width: cellWidth, height: cellHeight,
					fit: 'cover',
				}),
				text(`IMAGE ${index + 1}`, `moodboard-slot-label-${index + 1}`, x + cellWidth * 0.05, y + cellHeight * 0.45, cellWidth * 0.9, cellHeight * 0.1, Math.max(12, height * 0.014), '#777777'),
			];
		}),
		text(kit.profile?.businessName || kit.name, 'moodboard-title', width * 0.04, height * 0.025, width * 0.68, height * 0.07, height * 0.045, primary, kit.fonts.heading),
		text(kit.profile?.tagline || 'Brand direction and visual references', 'moodboard-tagline', width * 0.04, height * 0.075, width * 0.65, height * 0.035, height * 0.022, dark),
		...scaledLogoElements(kit, width, height),
		createDefaultElement('shape', {
			id: 'moodboard-swatch-primary', name: 'Primary swatch', fieldName: 'moodboardSwatch',
			x: width * 0.04, y: height * 0.91, width: width * 0.1, height: height * 0.035, fill: primary,
		}),
		createDefaultElement('shape', {
			id: 'moodboard-swatch-secondary', name: 'Secondary swatch', fieldName: 'moodboardSwatch',
			x: width * 0.15, y: height * 0.91, width: width * 0.1, height: height * 0.035, fill: secondary,
		}),
		createDefaultElement('shape', {
			id: 'moodboard-swatch-accent', name: 'Accent swatch', fieldName: 'moodboardSwatch',
			x: width * 0.26, y: height * 0.91, width: width * 0.1, height: height * 0.035, fill: accent,
		}),
		createDefaultElement('shape', {
			id: 'moodboard-swatch-light', name: 'Light swatch', fieldName: 'moodboardSwatch',
			x: width * 0.37, y: height * 0.91, width: width * 0.1, height: height * 0.035, fill: light,
			stroke: '#cccccc', strokeWidth: Math.max(1, width * 0.0005),
		}),
		createDefaultElement('shape', {
			id: 'moodboard-swatch-dark', name: 'Dark swatch', fieldName: 'moodboardSwatch',
			x: width * 0.48, y: height * 0.91, width: width * 0.1, height: height * 0.035, fill: dark,
		}),
		text('COLOUR PALETTE', 'moodboard-palette-label', width * 0.04, height * 0.95, width * 0.55, height * 0.025, height * 0.014, dark),
		text((keywords.split(',').map((word) => word.trim()).filter(Boolean).slice(0, 8).join('  ·  ') || kit.strategy?.personality.slice(0, 4).join('  ·  ') || 'Visual direction').slice(0, 160), 'moodboard-keywords', width * 0.62, height * 0.88, width * 0.34, height * 0.07, height * 0.018, dark),
		text('Aa  Typography sample', 'moodboard-font-sample', width * 0.62, height * 0.95, width * 0.34, height * 0.035, height * 0.018, primary, kit.fonts.heading),
	];
	project.kind = 'design';
	project.name = `${kit.name} Mood Board`;
	project.brandName = kit.name;
	project.artboard = { width, height, background };
	project.variants = { primary: elements };
	project.generation = {
		layoutId: `moodboard:${preset}`,
		seed: Date.now(),
		paletteName: kit.name,
		fontPair: { name: kit.fonts?.heading ?? 'Inter', primary: kit.fonts?.heading ?? 'Inter', secondary: kit.fonts?.body ?? 'Inter' },
		icon: '',
	};
	return project;
}
