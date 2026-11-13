export interface LogoPalette {
	name: string;
	colors: [string, string, string, string];
}

export const logoPalettes: LogoPalette[] = [
	{ name: 'Black and white', colors: ['#111111', '#ffffff', '#737373', '#d9d9d9'] },
	{ name: 'Blue and silver', colors: ['#183b65', '#477ca8', '#b8c5d1', '#f4f6f7'] },
	{ name: 'Gold and black', colors: ['#c7a04b', '#e7cd8b', '#1d1b18', '#ffffff'] },
	{ name: 'Green and white', colors: ['#203b32', '#668b68', '#c8d9ad', '#ffffff'] },
	{ name: 'Navy and gold', colors: ['#15243a', '#263f61', '#caa65a', '#f4ebd4'] },
	{ name: 'Red and black', colors: ['#9e302e', '#d56a55', '#1e1e1e', '#f4efeb'] },
	{ name: 'Earth tones', colors: ['#765438', '#aa8c68', '#c8b99a', '#e7e0d1'] },
	{ name: 'Pastels', colors: ['#e9a9b5', '#f2d7a8', '#a8c9bd', '#b6b5d8'] },
];
