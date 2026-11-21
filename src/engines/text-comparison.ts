export type DiffKind = 'same' | 'added' | 'removed';
export interface DiffLine { kind: DiffKind; left: string | null; right: string | null; }

export function compareTextLines(leftText: string, rightText: string): { diff: DiffLine[]; added: number; removed: number; unchanged: number } {
	const left = leftText.length === 0 ? [] : leftText.split(/\r\n|[\n\r\u2028\u2029]/);
	const right = rightText.length === 0 ? [] : rightText.split(/\r\n|[\n\r\u2028\u2029]/);
	const rows = left.length + 1;
	const cols = right.length + 1;
	const table = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

	for (let leftIndex = 1; leftIndex < rows; leftIndex += 1) {
		for (let rightIndex = 1; rightIndex < cols; rightIndex += 1) {
			table[leftIndex][rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
				? table[leftIndex - 1][rightIndex - 1] + 1
				: Math.max(table[leftIndex - 1][rightIndex], table[leftIndex][rightIndex - 1]);
		}
	}

	const reverse: DiffLine[] = [];
	let leftIndex = left.length;
	let rightIndex = right.length;
	while (leftIndex > 0 || rightIndex > 0) {
		if (leftIndex > 0 && rightIndex > 0 && left[leftIndex - 1] === right[rightIndex - 1]) {
			reverse.push({ kind: 'same', left: left[leftIndex - 1], right: right[rightIndex - 1] });
			leftIndex -= 1;
			rightIndex -= 1;
		} else if (rightIndex > 0 && (leftIndex === 0 || table[leftIndex][rightIndex - 1] >= table[leftIndex - 1][rightIndex])) {
			reverse.push({ kind: 'added', left: null, right: right[rightIndex - 1] });
			rightIndex -= 1;
		} else if (leftIndex > 0) {
			reverse.push({ kind: 'removed', left: left[leftIndex - 1], right: null });
			leftIndex -= 1;
		}
	}

	const diff = reverse.reverse();
	return {
		diff,
		added: diff.filter((line) => line.kind === 'added').length,
		removed: diff.filter((line) => line.kind === 'removed').length,
		unchanged: diff.filter((line) => line.kind === 'same').length,
	};
}
