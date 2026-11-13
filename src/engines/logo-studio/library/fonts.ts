import bebasRegular from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url';
import greatVibesRegular from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url';
import interBold from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import loraBold from '@fontsource/lora/files/lora-latin-700-normal.woff?url';
import loraRegular from '@fontsource/lora/files/lora-latin-400-normal.woff?url';
import merriweatherBold from '@fontsource/merriweather/files/merriweather-latin-700-normal.woff?url';
import merriweatherRegular from '@fontsource/merriweather/files/merriweather-latin-400-normal.woff?url';
import montserratBold from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff?url';
import montserratRegular from '@fontsource/montserrat/files/montserrat-latin-400-normal.woff?url';
import nunitoBold from '@fontsource/nunito/files/nunito-latin-700-normal.woff?url';
import nunitoRegular from '@fontsource/nunito/files/nunito-latin-400-normal.woff?url';
import oswaldBold from '@fontsource/oswald/files/oswald-latin-700-normal.woff?url';
import oswaldRegular from '@fontsource/oswald/files/oswald-latin-400-normal.woff?url';
import pacificoRegular from '@fontsource/pacifico/files/pacifico-latin-400-normal.woff?url';
import playfairBold from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff?url';
import playfairRegular from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff?url';
import ralewayBold from '@fontsource/raleway/files/raleway-latin-700-normal.woff?url';
import ralewayRegular from '@fontsource/raleway/files/raleway-latin-400-normal.woff?url';
import robotoCondensedBold from '@fontsource/roboto-condensed/files/roboto-condensed-latin-700-normal.woff?url';
import robotoCondensedRegular from '@fontsource/roboto-condensed/files/roboto-condensed-latin-400-normal.woff?url';

export interface LogoFontDefinition {
	family: string;
	style: string;
	regular: string;
	bold: string;
}

export const logoFonts: LogoFontDefinition[] = [
	{ family: 'Inter', style: 'Clean sans', regular: interRegular, bold: interBold },
	{ family: 'Lora', style: 'Serif', regular: loraRegular, bold: loraBold },
	{ family: 'Oswald', style: 'Condensed', regular: oswaldRegular, bold: oswaldBold },
	{ family: 'Pacifico', style: 'Script', regular: pacificoRegular, bold: pacificoRegular },
	{ family: 'Nunito', style: 'Rounded', regular: nunitoRegular, bold: nunitoBold },
	{ family: 'Roboto Condensed', style: 'Condensed sans', regular: robotoCondensedRegular, bold: robotoCondensedBold },
	{ family: 'Playfair Display', style: 'Display serif', regular: playfairRegular, bold: playfairBold },
	{ family: 'Montserrat', style: 'Geometric sans', regular: montserratRegular, bold: montserratBold },
	{ family: 'Merriweather', style: 'Serif', regular: merriweatherRegular, bold: merriweatherBold },
	{ family: 'Bebas Neue', style: 'Bold display', regular: bebasRegular, bold: bebasRegular },
	{ family: 'Great Vibes', style: 'Script', regular: greatVibesRegular, bold: greatVibesRegular },
	{ family: 'Raleway', style: 'Clean sans', regular: ralewayRegular, bold: ralewayBold },
];

export const LOGO_FONT_FAMILIES = logoFonts.map(({ family }) => family);

export function getLogoFont(family: string): LogoFontDefinition | undefined {
	return logoFonts.find((font) => font.family === family);
}

const browserFontPromises = new Map<string, Promise<void>>();

export function loadBrowserFont(family: string, weight: number): Promise<void> {
	const definition = getLogoFont(family);
	if (!definition) return Promise.reject(new Error(`The font “${family}” is not in the local font library.`));

	const actualWeight = weight >= 600 ? 700 : 400;
	const key = `${family}:${actualWeight}`;
	const existing = browserFontPromises.get(key);
	if (existing) return existing;

	const src = actualWeight === 700 ? definition.bold : definition.regular;
	const loading = (async () => {
		const face = new FontFace(family, `url("${src}")`, { weight: String(actualWeight) });
		await face.load();
		document.fonts.add(face);
	})();
	browserFontPromises.set(key, loading);
	loading.catch(() => browserFontPromises.delete(key));
	return loading;
}
