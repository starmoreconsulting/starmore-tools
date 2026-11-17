export function createSeededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
	const result = [...items];
	const random = createSeededRandom(seed);
	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(random() * (index + 1));
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}
	return result;
}

export function nextSeed(seed: number): number {
	return (seed + 0x9e3779b9) >>> 0;
}
