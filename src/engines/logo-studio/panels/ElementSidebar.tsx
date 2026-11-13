import { useState } from 'react';
import { createDefaultElement, type Element } from '../model/types';

const shapes = ['rectangle', 'circle', 'triangle', 'star', 'line'] as const;

interface Props {
	onAdd: (element: Element) => void;
}

export default function ElementSidebar({ onAdd }: Props) {
	const [shape, setShape] = useState<(typeof shapes)[number]>('rectangle');

	const addText = () => onAdd(createDefaultElement('text', {
		x: 90,
		y: 268,
		width: 420,
		height: 64,
	}));

	const addShape = () => onAdd(createDefaultElement('shape', {
		shape,
		x: 240,
		y: 240,
		width: shape === 'line' ? 140 : 120,
		height: shape === 'line' ? 0 : 120,
		fill: shape === 'line' ? 'none' : '#d7ed79',
		stroke: '#203b32',
		strokeWidth: 2,
	}));

	return (
		<aside className="logo-phase-panel logo-element-sidebar" aria-label="Add elements">
			<h2>Elements</h2>
			<button className="logo-phase-primary" type="button" onClick={addText}>Add text</button>
			<label className="logo-phase-field">
				<span>Shape</span>
				<select value={shape} onChange={(event) => {
					const nextShape = shapes.find((item) => item === event.target.value);
					if (nextShape) setShape(nextShape);
				}}>
					{shapes.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
				</select>
			</label>
			<button type="button" onClick={addShape}>Add shape</button>
			<p className="logo-phase-hint">Drag elements on the artboard to position them.</p>
		</aside>
	);
}
