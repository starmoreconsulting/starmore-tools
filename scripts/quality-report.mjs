import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const root = process.cwd();
const server = await createServer({
	configFile: false,
	root,
	appType: 'custom',
	logLevel: 'error',
	server: { middlewareMode: true },
});

function increment(target, source) {
	for (const [key, count] of Object.entries(source)) {
		target[key] = (target[key] ?? 0) + count;
	}
}

function sample(values, count) {
	const shuffled = [...values];
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const swap = Math.floor(Math.random() * (index + 1));
		[shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
	}
	return shuffled.slice(0, count);
}

function formatCounters(counters) {
	const entries = Object.entries(counters).sort(([first], [second]) => first.localeCompare(second));
	return entries.length
		? entries.map(([name, count]) => `| ${name} | ${count} |`).join('\n')
		: '| None | 0 |';
}

try {
	const namesModule = await server.ssrLoadModule('/src/engines/brand-studio/strategy/names.ts');
	const slogansModule = await server.ssrLoadModule('/src/engines/brand-studio/strategy/slogans.ts');
	const nameSets = [
		['swift', 'delivery', 'lagos'],
		['café', 'naïve', 'studio'],
		['東京', 'design', 'future'],
		['small', 'business', 'growth'],
		['green', 'garden', 'home'],
	];
	const nameCounters = {};
	const passingNames = [];
	const nameSummary = [];
	for (const [index, keywords] of nameSets.entries()) {
		const report = namesModule.generateBrandNamesWithStats({
			keywords,
			industry: 'General',
			style: 'Modern',
			length: 'balanced',
			seed: 9100 + index,
			count: 100,
		});
		passingNames.push(...report.names);
		increment(nameCounters, report.filterFailures);
		nameSummary.push(`| ${keywords.join(', ')} | ${report.candidatesChecked} | ${report.names.length} |`);
	}

	const samples = [
		{ businessName: 'Harbor Studio', whatYouDo: 'same-day deliveries', whoYouServe: 'small businesses', benefit: 'save time', tone: 'friendly', seed: 2301 },
		{ businessName: 'Northstar Courier', whatYouDo: 'local grocery deliveries', whoYouServe: 'busy families', benefit: 'get groceries quickly', tone: 'professional', seed: 2302 },
		{ businessName: 'Brightline Design', whatYouDo: 'brand identity services', whoYouServe: 'independent makers', benefit: 'stand out clearly', tone: 'bold', seed: 2303 },
	];
	const sloganCounters = {};
	const passingSlogans = [];
	const sloganSummary = [];
	for (const sampleInput of samples) {
		const report = slogansModule.generateBrandSlogansWithStats({ ...sampleInput, count: 60 });
		passingSlogans.push(...report.slogans);
		increment(sloganCounters, report.filterFailures);
		sloganSummary.push(`| ${sampleInput.whatYouDo}; ${sampleInput.whoYouServe} | ${report.candidatesChecked} | ${report.slogans.length} |`);
	}

	const chosenNames = sample([...new Set(passingNames)], 30);
	const chosenSlogans = sample([...new Set(passingSlogans)], 30);
	const document = `# Brand Studio generator quality report

Generated locally on ${new Date().toISOString()} from the current strategy engine source. Rejection counts may overlap because one candidate can fail multiple filters.

## Brand names

| Keyword set | Candidates checked | Results passing |
|---|---:|---:|
${nameSummary.join('\n')}

### Rejected candidates by filter

| Filter | Failures |
|---|---:|
${formatCounters(nameCounters)}

Passing names collected: **${passingNames.length}**. Unique passing names available: **${new Set(passingNames).size}**.

### Random sample of passing names

${chosenNames.map((name) => `- ${name}`).join('\n') || '- No passing names collected.'}

## Slogans

| Sample description | Candidates checked | Results passing |
|---|---:|---:|
${sloganSummary.join('\n')}

### Rejected candidates by filter

| Filter | Failures |
|---|---:|
${formatCounters(sloganCounters)}

Passing slogans collected: **${passingSlogans.length}**. Unique passing slogans available: **${new Set(passingSlogans).size}**.

### Random sample of passing slogans

${chosenSlogans.map((slogan) => `- ${slogan}`).join('\n') || '- No passing slogans collected.'}
`;
	const outputPath = path.join(root, 'docs', 'quality-report.md');
	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(outputPath, document, 'utf8');
	console.log(`Wrote ${path.relative(root, outputPath)}`);
	console.log(`Names: ${passingNames.length} passing; failures: ${JSON.stringify(nameCounters)}`);
	console.log(`Slogans: ${passingSlogans.length} passing; failures: ${JSON.stringify(sloganCounters)}`);
} finally {
	await server.close();
}
