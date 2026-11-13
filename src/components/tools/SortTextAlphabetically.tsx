import { useState } from 'react';

type Direction = 'ascending' | 'descending';

function sortLines(text: string, direction: Direction, ignoreCase: boolean, numeric: boolean, removeBlankLines: boolean) {
	if (text.length === 0) return '';
	const lines = text.split(/\r\n|[\n\r\u2028\u2029]/);
	const sortable = removeBlankLines ? lines.filter((line) => line.trim() !== '') : lines;
	const collator = new Intl.Collator(undefined, {
		sensitivity: ignoreCase ? 'base' : 'variant',
		numeric,
	});
	sortable.sort((first, second) => {
		const result = collator.compare(first, second);
		return direction === 'ascending' ? result : -result;
	});
	return sortable.join('\n');
}

export default function SortTextAlphabetically() {
	const [text, setText] = useState('');
	const [direction, setDirection] = useState<Direction>('ascending');
	const [ignoreCase, setIgnoreCase] = useState(true);
	const [numeric, setNumeric] = useState(false);
	const [removeBlankLines, setRemoveBlankLines] = useState(false);
	const sorted = sortLines(text, direction, ignoreCase, numeric, removeBlankLines);

	return (
		<div>
			<div className="duplicate-columns">
				<div>
					<label htmlFor="sort-text-input">Text to sort</label>
					<textarea id="sort-text-input" value={text} onChange={(event) => setText(event.target.value)} placeholder="Enter one item per line..." />
				</div>
				<div>
					<label htmlFor="sort-text-output">Sorted result</label>
					<textarea id="sort-text-output" value={sorted} readOnly placeholder="Sorted lines will appear here..." />
				</div>
			</div>
			<div className="calc-fields" style={{ marginTop: 15 }}>
				<div className="calc-field">
					<label htmlFor="sort-direction">Sort order</label>
					<select id="sort-direction" value={direction} onChange={(event) => setDirection(event.target.value as Direction)}>
						<option value="ascending">A–Z</option>
						<option value="descending">Z–A</option>
					</select>
				</div>
			</div>
			<fieldset className="duplicate-options">
				<legend>Options</legend>
				<label className="duplicate-option">
					<input type="checkbox" checked={ignoreCase} onChange={(event) => setIgnoreCase(event.target.checked)} />
					<span>Ignore case</span>
				</label>
				<label className="duplicate-option">
					<input type="checkbox" checked={numeric} onChange={(event) => setNumeric(event.target.checked)} />
					<span>Numeric sort</span>
				</label>
				<label className="duplicate-option">
					<input type="checkbox" checked={removeBlankLines} onChange={(event) => setRemoveBlankLines(event.target.checked)} />
					<span>Remove blank lines</span>
				</label>
			</fieldset>
			<p className="tool-message" role="status">Lines are sorted locally in your browser.</p>
		</div>
	);
}
