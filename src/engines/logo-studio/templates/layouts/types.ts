import type { Element, LogoBrief } from '../../model/types';
import type { LogoPalette } from '../../library/palettes';

export interface FontPair {
	name: string;
	primary: string;
	secondary: string;
}

export interface LayoutInput {
	brief: LogoBrief;
	palette: LogoPalette;
	fontPair: FontPair;
	icon: string;
}

export interface LogoLayout {
	id: string;
	name: string;
	arrangements: LogoBrief['arrangement'][];
	build: (input: LayoutInput) => Element[];
}
