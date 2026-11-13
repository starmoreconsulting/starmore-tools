import abrilFatface from '@fontsource/abril-fatface/files/abril-fatface-latin-400-normal.woff?url';
import allura from '@fontsource/allura/files/allura-latin-400-normal.woff?url';
import anton from '@fontsource/anton/files/anton-latin-400-normal.woff?url';
import archivoBlack from '@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff?url';
import barlowCondensedBold from '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff?url';
import barlowCondensedRegular from '@fontsource/barlow-condensed/files/barlow-condensed-latin-400-normal.woff?url';
import bebasRegular from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url';
import bodoniModaBold from '@fontsource/bodoni-moda/files/bodoni-moda-latin-700-normal.woff?url';
import bodoniModaRegular from '@fontsource/bodoni-moda/files/bodoni-moda-latin-400-normal.woff?url';
import cormorantBold from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-700-normal.woff?url';
import cormorantRegular from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff?url';
import dancingScriptBold from '@fontsource/dancing-script/files/dancing-script-latin-700-normal.woff?url';
import dancingScriptRegular from '@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff?url';
import dmSansBold from '@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff?url';
import dmSansRegular from '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url';
import dmSerifDisplay from '@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff?url';
import greatVibesRegular from '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff?url';
import libreBaskervilleBold from '@fontsource/libre-baskerville/files/libre-baskerville-latin-700-normal.woff?url';
import libreBaskervilleRegular from '@fontsource/libre-baskerville/files/libre-baskerville-latin-400-normal.woff?url';
import interBold from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import interRegular from '@fontsource/inter/files/inter-latin-400-normal.woff?url';
import loraBold from '@fontsource/lora/files/lora-latin-700-normal.woff?url';
import loraRegular from '@fontsource/lora/files/lora-latin-400-normal.woff?url';
import manropeBold from '@fontsource/manrope/files/manrope-latin-700-normal.woff?url';
import manropeRegular from '@fontsource/manrope/files/manrope-latin-400-normal.woff?url';
import merriweatherBold from '@fontsource/merriweather/files/merriweather-latin-700-normal.woff?url';
import merriweatherRegular from '@fontsource/merriweather/files/merriweather-latin-400-normal.woff?url';
import montserratBold from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff?url';
import montserratRegular from '@fontsource/montserrat/files/montserrat-latin-400-normal.woff?url';
import openSansBold from '@fontsource/open-sans/files/open-sans-latin-700-normal.woff?url';
import openSansRegular from '@fontsource/open-sans/files/open-sans-latin-400-normal.woff?url';
import nunitoBold from '@fontsource/nunito/files/nunito-latin-700-normal.woff?url';
import nunitoRegular from '@fontsource/nunito/files/nunito-latin-400-normal.woff?url';
import oswaldBold from '@fontsource/oswald/files/oswald-latin-700-normal.woff?url';
import oswaldRegular from '@fontsource/oswald/files/oswald-latin-400-normal.woff?url';
import pacificoRegular from '@fontsource/pacifico/files/pacifico-latin-400-normal.woff?url';
import playfairBold from '@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff?url';
import playfairRegular from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff?url';
import quicksandBold from '@fontsource/quicksand/files/quicksand-latin-700-normal.woff?url';
import quicksandRegular from '@fontsource/quicksand/files/quicksand-latin-400-normal.woff?url';
import ralewayBold from '@fontsource/raleway/files/raleway-latin-700-normal.woff?url';
import ralewayRegular from '@fontsource/raleway/files/raleway-latin-400-normal.woff?url';
import righteous from '@fontsource/righteous/files/righteous-latin-400-normal.woff?url';
import robotoCondensedBold from '@fontsource/roboto-condensed/files/roboto-condensed-latin-700-normal.woff?url';
import robotoCondensedRegular from '@fontsource/roboto-condensed/files/roboto-condensed-latin-400-normal.woff?url';
import robotoSlabBold from '@fontsource/roboto-slab/files/roboto-slab-latin-700-normal.woff?url';
import robotoSlabRegular from '@fontsource/roboto-slab/files/roboto-slab-latin-400-normal.woff?url';
import sourceSansBold from '@fontsource/source-sans-3/files/source-sans-3-latin-700-normal.woff?url';
import sourceSansRegular from '@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff?url';
import workSansBold from '@fontsource/work-sans/files/work-sans-latin-700-normal.woff?url';
import { loadStoredCustomFont } from './custom-fonts';
import workSansRegular from '@fontsource/work-sans/files/work-sans-latin-400-normal.woff?url';

export type LogoFontCategory = 'sans' | 'serif' | 'display' | 'script' | 'rounded' | 'condensed';

export interface LogoFontDefinition {
	family: string;
	category: LogoFontCategory;
	regular: string;
	bold: string;
}

export const logoFonts: LogoFontDefinition[] = [
	{ family: 'Inter', category: 'sans', regular: interRegular, bold: interBold },
	{ family: 'Lora', category: 'serif', regular: loraRegular, bold: loraBold },
	{ family: 'Oswald', category: 'condensed', regular: oswaldRegular, bold: oswaldBold },
	{ family: 'Pacifico', category: 'script', regular: pacificoRegular, bold: pacificoRegular },
	{ family: 'Nunito', category: 'rounded', regular: nunitoRegular, bold: nunitoBold },
	{ family: 'Roboto Condensed', category: 'condensed', regular: robotoCondensedRegular, bold: robotoCondensedBold },
	{ family: 'Playfair Display', category: 'serif', regular: playfairRegular, bold: playfairBold },
	{ family: 'Montserrat', category: 'sans', regular: montserratRegular, bold: montserratBold },
	{ family: 'Merriweather', category: 'serif', regular: merriweatherRegular, bold: merriweatherBold },
	{ family: 'Bebas Neue', category: 'display', regular: bebasRegular, bold: bebasRegular },
	{ family: 'Great Vibes', category: 'script', regular: greatVibesRegular, bold: greatVibesRegular },
	{ family: 'Raleway', category: 'sans', regular: ralewayRegular, bold: ralewayBold },
	{ family: 'DM Sans', category: 'sans', regular: dmSansRegular, bold: dmSansBold },
	{ family: 'Open Sans', category: 'sans', regular: openSansRegular, bold: openSansBold },
	{ family: 'Source Sans 3', category: 'sans', regular: sourceSansRegular, bold: sourceSansBold },
	{ family: 'Manrope', category: 'sans', regular: manropeRegular, bold: manropeBold },
	{ family: 'Work Sans', category: 'sans', regular: workSansRegular, bold: workSansBold },
	{ family: 'Libre Baskerville', category: 'serif', regular: libreBaskervilleRegular, bold: libreBaskervilleBold },
	{ family: 'Cormorant Garamond', category: 'serif', regular: cormorantRegular, bold: cormorantBold },
	{ family: 'DM Serif Display', category: 'serif', regular: dmSerifDisplay, bold: dmSerifDisplay },
	{ family: 'Bodoni Moda', category: 'serif', regular: bodoniModaRegular, bold: bodoniModaBold },
	{ family: 'Roboto Slab', category: 'serif', regular: robotoSlabRegular, bold: robotoSlabBold },
	{ family: 'Anton', category: 'display', regular: anton, bold: anton },
	{ family: 'Righteous', category: 'display', regular: righteous, bold: righteous },
	{ family: 'Abril Fatface', category: 'display', regular: abrilFatface, bold: abrilFatface },
	{ family: 'Archivo Black', category: 'display', regular: archivoBlack, bold: archivoBlack },
	{ family: 'Dancing Script', category: 'script', regular: dancingScriptRegular, bold: dancingScriptBold },
	{ family: 'Allura', category: 'script', regular: allura, bold: allura },
	{ family: 'Quicksand', category: 'rounded', regular: quicksandRegular, bold: quicksandBold },
	{ family: 'Barlow Condensed', category: 'condensed', regular: barlowCondensedRegular, bold: barlowCondensedBold },
];

export const LOGO_FONT_FAMILIES = logoFonts.map(({ family }) => family);

export function getLogoFont(family: string): LogoFontDefinition | undefined {
	return logoFonts.find((font) => font.family === family);
}

const browserFontPromises = new Map<string, Promise<void>>();

export function loadBrowserFont(family: string, weight: number): Promise<void> {
	const definition = getLogoFont(family);
	if (!definition) return loadStoredCustomFont(family, weight);

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
