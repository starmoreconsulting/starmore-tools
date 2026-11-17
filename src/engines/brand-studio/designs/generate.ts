import { socialSizePresets } from '../../../data/social-sizes';
import type { BrandColorRole, BrandKit, BrandProfile } from '../../logo-studio/brand/kit';
import { fitTextToBox } from '../../logo-studio/templates/layouts/helpers';
import { createDefaultElement, createDefaultProject, type Element, type ElementRole, type LogoProject } from '../../logo-studio/model/types';
import { createMoodBoardProject } from '../moodboard/project';

export type DesignType =
	| 'moodboard'
	| 'business-card-front'
	| 'business-card-back'
	| 'letterhead'
	| 'envelope'
	| 'instagram-post-square'
	| 'instagram-post-portrait'
	| 'instagram-story'
	| 'facebook-cover'
	| 'youtube-banner'
	| 'linkedin-banner';

export type DesignLayoutId = 'centered' | 'editorial' | 'bold-band' | 'square' | 'wide' | 'a4-landscape';

export interface DesignOptions {
	cardSize?: '85x55mm' | '3.5x2in';
	backgroundColor?: string;
	headingFont?: string;
	bodyFont?: string;
	imageCount?: number;
	keywords?: string;
}

export interface GeneratedDesign {
	project: LogoProject;
	warnings: string[];
}

const LAYOUT_IDS: DesignLayoutId[] = ['centered', 'editorial', 'bold-band'];
const MOOD_BOARD_LAYOUT_IDS: DesignLayoutId[] = ['square', 'wide', 'a4-landscape'];
const WHITE = '#FFFFFF';
const BLACK = '#000000';

function hexRgb(hex: string): [number, number, number] | null {
	if (!/^#[\da-f]{6}$/i.test(hex)) return null;
	return [
		Number.parseInt(hex.slice(1, 3), 16),
		Number.parseInt(hex.slice(3, 5), 16),
		Number.parseInt(hex.slice(5, 7), 16),
	];
}

function linear(value: number): number {
	const normalized = value / 255;
	return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: string): number {
	const rgb = hexRgb(color);
	if (!rgb) return 1;
	const [red, green, blue] = rgb.map(linear);
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first: string, second: string): number {
	const luminances = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
	return (luminances[0] + 0.05) / (luminances[1] + 0.05);
}

export interface ContrastChoice {
	color: string;
	ratio: number;
	warning?: string;
}

export function chooseTextColor(background: string, largeText = false): ContrastChoice {
	const choices = [BLACK, WHITE].map((color) => ({ color, ratio: contrastRatio(color, background) }))
		.sort((a, b) => b.ratio - a.ratio);
	const best = choices[0];
	const threshold = largeText ? 3 : 4.5;
	return {
		...best,
		...(best.ratio < threshold ? { warning: `Text contrast is ${best.ratio.toFixed(2)}:1, below the ${threshold}:1 target.` } : {}),
	};
}

function colorForRole(kit: BrandKit, role: BrandColorRole, fallback: string): string {
	return kit.colors.find((color) => color.role === role)?.hex ?? fallback;
}

export function getDesignDimensions(type: DesignType, options: DesignOptions = {}): { width: number; height: number; unit: 'mm' | 'px' } {
	if (type === 'moodboard') return { width: 1080, height: 1080, unit: 'px' };
	if (type === 'business-card-front' || type === 'business-card-back') {
		return options.cardSize === '3.5x2in' ? { width: 88.9, height: 50.8, unit: 'mm' } : { width: 85, height: 55, unit: 'mm' };
	}
	if (type === 'letterhead') return { width: 210, height: 297, unit: 'mm' };
	if (type === 'envelope') return { width: 220, height: 110, unit: 'mm' };
	const presetIds: Record<Exclude<DesignType, 'moodboard' | 'business-card-front' | 'business-card-back' | 'letterhead' | 'envelope'>, string> = {
		'instagram-post-square': 'instagram-square',
		'instagram-post-portrait': 'instagram-portrait',
		'instagram-story': 'instagram-story',
		'facebook-cover': 'facebook-cover',
		'youtube-banner': 'youtube-banner',
		'linkedin-banner': 'linkedin-banner',
	};
	const preset = socialSizePresets.find((entry) => entry.id === presetIds[type]);
	if (!preset) throw new Error(`Missing social size preset for ${type}.`);
	return { width: preset.width, height: preset.height, unit: 'px' };
}

export function getDesignLayouts(type: DesignType): DesignLayoutId[] {
	return type === 'moodboard' ? [...MOOD_BOARD_LAYOUT_IDS] : [...LAYOUT_IDS];
}

function createText(
	text: string,
	fieldName: string,
	role: Extract<ElementRole, 'name' | 'tagline' | 'contact'>,
	box: { x: number; y: number; width: number; height: number },
	fontFamily: string,
	fill: string,
	size: number,
	align: 'left' | 'center' | 'right',
	warnings: string[],
	minimumFontSize = 6,
): Element | null {
	const clean = text.trim();
	if (!clean) return null;
	const maximumLines = Math.max(1, Math.floor(box.height / (minimumFontSize * 1.25)));
	const fit = fitTextToBox(clean, box, size, 0, { minimumFontSize, maxLines: maximumLines });
	if (fit.overflow) warnings.push(`The “${fieldName}” text may overflow at the minimum font size.`);
	return createDefaultElement('text', {
		...box,
		name: fieldName,
		role,
		fieldName,
		text: fit.text,
		fontFamily,
		fontSize: fit.fontSize,
		fontWeight: role === 'name' ? 700 : 400,
		lineHeight: 1.15,
		align,
		fill,
	});
}

function transformLogo(kit: BrandKit, background: string, box: { x: number; y: number; width: number; height: number }): Element[] {
	const logo = kit.logo;
	if (!logo) return [];
	const variantNames = Object.keys(logo.variants);
	const backgroundLuminance = relativeLuminance(background);
	const preferredNames = backgroundLuminance < 0.35 ? ['white', 'light', 'reverse'] : ['black', 'dark'];
	const variantScore = (name: string): number => {
		const colors: string[] = [];
		const collect = (elements: Element[]) => elements.forEach((element) => {
			if (element.fill && element.fill !== 'none') colors.push(element.fill);
			if (element.stroke && element.stroke !== 'none') colors.push(element.stroke);
			element.gradient?.stops.forEach((stop) => colors.push(stop.color));
			if (element.children) collect(element.children);
		});
		collect(logo.variants[name] ?? []);
		const readableContrast = colors.filter((color) => hexRgb(color))
			.map((color) => contrastRatio(color, background));
		const contrast = readableContrast.length
			? readableContrast.reduce((total, ratio) => total + ratio, 0) / readableContrast.length
			: 0;
		const namePreference = preferredNames.some((part) => name.toLowerCase().includes(part)) ? 10 : 0;
		return contrast + namePreference;
	};
	const sourceVariant = variantNames.sort((first, second) => variantScore(second) - variantScore(first))[0] ?? 'primary';
	const elements = logo.variants[sourceVariant] ?? logo.variants.primary ?? [];
	if (!elements.length) return [];
	const sourceW = logo.artboard.width;
	const sourceH = logo.artboard.height;
	const scale = Math.min(box.width / sourceW, box.height / sourceH);
	const offsetX = box.x + (box.width - sourceW * scale) / 2;
	const offsetY = box.y + (box.height - sourceH * scale) / 2;
	const map = (element: Element): Element => ({
		...structuredClone(element),
		id: globalThis.crypto?.randomUUID?.() ?? `brand-logo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		x: offsetX + element.x * scale,
		y: offsetY + element.y * scale,
		width: element.width * scale,
		height: element.height * scale,
		fontSize: element.fontSize === undefined ? undefined : element.fontSize * scale,
		strokeWidth: element.strokeWidth === undefined ? undefined : element.strokeWidth * scale,
		children: element.children?.map(map),
		locked: true,
	});
	return elements.map(map);
}

function fitMargin(type: DesignType, width: number, height: number): number {
	if (type.startsWith('business-card') || type === 'letterhead' || type === 'envelope') return 3;
	return Math.min(width, height) * 0.2;
}

function contactLines(profile: BrandProfile): string[] {
	return [
		profile.contactName,
		profile.jobTitle,
		profile.phone,
		profile.email,
		profile.website,
		profile.address,
		...Object.entries(profile.socialHandles).filter(([, value]) => value.trim()).map(([network, value]) => `${network}: ${value}`),
	].map((value) => value.trim()).filter(Boolean);
}

export function generateDesign(
	type: DesignType,
	layoutId: string,
	kit: BrandKit,
	profile: BrandProfile = kit.profile ?? {
		businessName: '', tagline: '', contactName: '', jobTitle: '', phone: '', email: '', website: '',
		address: '', socialHandles: { instagram: '', facebook: '', linkedin: '', youtube: '', x: '' },
	},
	options: DesignOptions = {},
): GeneratedDesign {
	if (type === 'moodboard') {
		if (!MOOD_BOARD_LAYOUT_IDS.includes(layoutId as DesignLayoutId)) throw new Error(`Unknown mood board preset: ${layoutId}`);
		return { project: createMoodBoardProject(kit, layoutId, options.imageCount ?? 6, options.keywords ?? ''), warnings: [] };
	}
	if (!LAYOUT_IDS.includes(layoutId as DesignLayoutId)) throw new Error(`Unknown design layout: ${layoutId}`);
	const layout = layoutId as DesignLayoutId;
	const { width, height, unit } = getDesignDimensions(type, options);
	const background = options.backgroundColor ?? colorForRole(kit, layout === 'bold-band' ? 'primary' : 'light', layout === 'bold-band' ? '#203B32' : WHITE);
	const foreground = chooseTextColor(background, true);
	const primary = colorForRole(kit, 'primary', '#203B32');
	const accent = colorForRole(kit, 'accent', '#D7ED79');
	const margin = fitMargin(type, width, height);
	const isSocial = unit === 'px';
	const isBack = type === 'business-card-back';
	const isLetter = type === 'letterhead';
	const isEnvelope = type === 'envelope';
	const isPortrait = height > width * 1.15;
	const warnings: string[] = [];
	if (foreground.warning) warnings.push(foreground.warning);
	if (contrastRatio(primary, WHITE) < 3) {
		warnings.push('The primary brand colour has low contrast on white; generated text uses a contrasting colour for readability.');
	}
	const elements: Element[] = [
		createDefaultElement('shape', {
			name: 'Background', role: 'background', shape: 'rectangle', x: 0, y: 0, width, height,
			fill: background, locked: true,
		}),
	];
	const bandHeight = layout === 'bold-band' ? height * (isPortrait ? 0.25 : 0.34) : 0;
	if (bandHeight) elements.push(createDefaultElement('shape', {
		name: 'Brand colour band', role: 'decor', shape: 'rectangle', x: 0, y: 0, width, height: bandHeight, fill: primary,
	}));
	const contentX = margin;
	const contentWidth = width - margin * 2;
	const center = layout === 'centered';
	const align = center ? 'center' : 'left';
	const topBand = bandHeight > 0;
	const availableTop = topBand ? bandHeight + margin : margin;
	const logoRatio = isSocial ? (isPortrait ? 0.15 : 0.25) : (isLetter ? 0.075 : 0.2);
	const logoBox = {
		x: center ? width * 0.32 : contentX,
		y: availableTop + (center ? height * 0.025 : 0),
		width: center ? width * 0.36 : Math.min(contentWidth * 0.3, height * logoRatio),
		height: Math.min(height * logoRatio, isPortrait ? height * 0.12 : height * 0.22),
	};
	if (!isBack) elements.push(...transformLogo(kit, background, logoBox));

	if (layout === 'editorial') {
		elements.push(createDefaultElement('shape', {
			name: 'Accent rule', role: 'decor', shape: 'rectangle', x: contentX, y: availableTop,
			width: Math.max(1, contentWidth * 0.16), height: Math.max(isSocial ? 4 : 0.8, height * 0.012), fill: accent,
		}));
	}

	const name = profile.businessName.trim() || kit.name.trim();
	const tagline = profile.tagline.trim();
	const nameY = isBack ? height * 0.12 : isLetter ? height * 0.17 : isEnvelope ? height * 0.24 : topBand ? bandHeight + height * 0.04 : logoBox.y + logoBox.height + height * (isSocial ? 0.035 : 0.045);
	const nameBox = {
		x: contentX,
		y: nameY,
		width: contentWidth,
		height: isSocial ? height * 0.12
			: isLetter ? Math.max(height * 0.12, 24)
				: isEnvelope ? Math.max(height * 0.18, 18)
					: Math.max(height * 0.27, 14),
	};
	const printMinimumFontSize = unit === 'mm' ? 1.4 : 6;
	const title = createText(name, 'businessName', 'name', nameBox, options.headingFont ?? kit.fonts.heading, foreground.color, height * (isSocial ? 0.075 : 0.13), align, warnings, printMinimumFontSize);
	if (title) elements.push(title);
	let cursorY = nameBox.y + nameBox.height;
	if (tagline) {
		const taglineBox = { x: contentX, y: cursorY, width: contentWidth, height: Math.max(isSocial ? height * 0.08 : 5, height * 0.075) };
		const taglineElement = createText(tagline, 'tagline', 'tagline', taglineBox, options.bodyFont ?? kit.fonts.body, foreground.color, height * (isSocial ? 0.045 : 0.07), align, warnings, printMinimumFontSize);
		if (taglineElement) {
			elements.push(taglineElement);
			cursorY += taglineBox.height;
		}
	}

	const contacts = contactLines(profile);
	const socialContacts = [
		profile.website,
		...Object.values(profile.socialHandles).filter((value) => value.trim()),
	].filter(Boolean).slice(0, 2);
	if (isBack || isEnvelope || type === 'instagram-story' || type === 'facebook-cover' || type === 'youtube-banner' || type === 'linkedin-banner') {
		const displayedContacts = isSocial ? socialContacts : contacts;
		const contactY = isBack ? cursorY + height * 0.04 : isEnvelope ? height * 0.58 : isSocial
			? height * (tagline ? 0.69 : 0.64)
			: cursorY + height * 0.02;
		const availableContactHeight = isSocial
			? Math.max(height * 0.02, height * 0.79 - contactY)
			: Math.max(2, height - margin - contactY);
		const contactAlign = isBack || center ? 'center' : align;
		const contactText = displayedContacts.join('\n');
		const contactMinimumFontSize = isSocial ? 6 : 1.2;
		const contactSize = Math.max(
			contactMinimumFontSize,
			Math.min(height * (isSocial ? 0.025 : 0.012), availableContactHeight / Math.max(1, contactText.split('\n').length)),
		);
		const item = createText(
			contactText,
			'contact_1',
			'contact',
			{ x: contentX, y: contactY, width: contentWidth, height: availableContactHeight },
			options.bodyFont ?? kit.fonts.body,
			foreground.color,
			contactSize,
			contactAlign,
			warnings,
			contactMinimumFontSize,
		);
		if (item) elements.push(item);
	}

	if (isLetter && contacts.length) {
		const sender = contacts.slice(0, 3).join(' · ');
		const senderElement = createText(sender, 'senderDetails', 'contact', {
			x: contentX, y: height * 0.31, width: contentWidth, height: height * 0.06,
		}, options.bodyFont ?? kit.fonts.body, foreground.color, height * 0.025, 'left', warnings, printMinimumFontSize);
		if (senderElement) elements.push(senderElement);
	}

	if (layout === 'bold-band' && kit.logo && type.startsWith('business-card')) {
		const accentBlock = createDefaultElement('shape', {
			name: 'Lower accent', role: 'decor', shape: 'rectangle', x: 0, y: height * 0.9, width, height: height * 0.1, fill: accent,
		});
		elements.push(accentBlock);
	}
	if (isSocial) {
		const safe = Math.min(width, height) * 0.2;
		for (const element of elements) {
			if (element.role === 'name' || element.role === 'tagline' || element.role === 'contact') {
				if (element.x < safe || element.y < safe || element.x + element.width > width - safe || element.y + element.height > height - safe) {
					warnings.push(`The “${element.fieldName ?? element.name ?? 'text'}” field is outside the central 60% safe area.`);
				}
			}
		}
	}
	const project = createDefaultProject(`${kit.name} ${type.replaceAll('-', ' ')}`);
	project.kind = 'design';
	project.brandName = kit.name;
	project.artboard = { width, height, background };
	project.variants = { primary: elements };
	project.generation = {
		layoutId: `${type}:${layout}`,
		seed: 0,
		paletteName: kit.name,
		fontPair: { name: kit.name, primary: options.headingFont ?? kit.fonts.heading, secondary: options.bodyFont ?? kit.fonts.body },
		icon: '',
		edited: false,
	};
	project.customFonts = kit.logo?.customFonts;
	return { project, warnings: [...new Set(warnings)] };
}
