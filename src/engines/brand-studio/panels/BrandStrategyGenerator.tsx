import { useMemo, useState } from 'react';
import SaveToBrandKitButton from './SaveToBrandKitButton';
import { generateMissionVision } from '../strategy/mission-vision';
import { generatePositioning } from '../strategy/positioning';
import { buildPersonality, personalityScales } from '../strategy/personality';

export type BrandStrategyKind = 'mission-vision' | 'positioning' | 'personality';

interface Props {
	kind: BrandStrategyKind;
}

export default function BrandStrategyGenerator({ kind }: Props) {
	const [who, setWho] = useState('');
	const [what, setWhat] = useState('');
	const [how, setHow] = useState('');
	const [why, setWhy] = useState('');
	const [target, setTarget] = useState('');
	const [brand, setBrand] = useState('');
	const [category, setCategory] = useState('');
	const [benefit, setBenefit] = useState('');
	const [reason, setReason] = useState('');
	const [traits, setTraits] = useState<string[]>([]);

	const missionVision = useMemo(() => generateMissionVision({ who, what, how, why }), [who, what, how, why]);
	const positioning = useMemo(() => generatePositioning({ target, brand, category, benefit, reason }), [target, brand, category, benefit, reason]);
	const personality = useMemo(() => buildPersonality(traits), [traits]);

	function toggleTrait(trait: string) {
		setTraits((current) => current.includes(trait)
			? current.filter((entry) => entry !== trait)
			: current.length < 5 ? [...current, trait] : current);
	}

	const textField = (label: string, value: string, update: (value: string) => void) => (
		<label key={label}>{label}<input maxLength={300} value={value} onChange={(event) => update(event.currentTarget.value)} /></label>
	);

	return (
		<section className="brand-tool-panel">
			{kind === 'mission-vision' && <>
				<div className="brand-tool-fields">
					{textField('Who do you serve?', who, setWho)}
					{textField('What do you do?', what, setWhat)}
					{textField('How do you do it?', how, setHow)}
					{textField('Why does it matter?', why, setWhy)}
				</div>
				<div className="brand-strategy-columns">
					{(['mission', 'vision'] as const).map((field) => (
						<section key={field} className="brand-strategy-result">
							<h2>{field === 'mission' ? 'Mission' : 'Vision'}</h2>
							{Object.entries(missionVision[field]).map(([variant, value]) => (
								<article key={variant}>
									<h3>{variant}</h3>
									<p>{value}</p>
									<SaveToBrandKitButton updates={field === 'mission'
										? { strategy: { mission: value } }
										: { strategy: { vision: value } }} />
								</article>
							))}
						</section>
					))}
				</div>
			</>}
			{kind === 'positioning' && <>
				<div className="brand-tool-fields">
					{textField('Who is it for?', target, setTarget)}
					{textField('Brand name', brand, setBrand)}
					{textField('Category', category, setCategory)}
					{textField('Customer benefit', benefit, setBenefit)}
					{textField('Why believe it?', reason, setReason)}
				</div>
				<div className="brand-name-results">
					{positioning.options.map((option) => (
						<article key={option.label} className="brand-name-result">
							<div><h2>{option.label}</h2><p>{option.statement}</p></div>
							<SaveToBrandKitButton updates={{ strategy: { positioning: option.statement } }} />
						</article>
					))}
				</div>
				<aside className="brand-tool-notice">
					<h2>How to read the main structure</h2>
					<ul>{positioning.explanations.map(({ part, meaning }) => <li key={part}><strong>{part}</strong> — {meaning}</li>)}</ul>
				</aside>
			</>}
			{kind === 'personality' && <>
				<p className="brand-tool-notice">Choose up to five traits, usually one from each opposing scale. Your selections create practical voice and visual starting points.</p>
				<div className="brand-personality-scales">
					{personalityScales.map(({ ends, axis }) => (
						<fieldset key={axis}>
							<legend>{ends[0]} ↔ {ends[1]}</legend>
							{ends.map((trait) => (
								<label key={trait}>
									<input type="checkbox" checked={traits.includes(trait)} disabled={traits.length >= 5 && !traits.includes(trait)} onChange={() => toggleTrait(trait)} />
									{trait}
								</label>
							))}
						</fieldset>
					))}
				</div>
				<section className="brand-strategy-result">
					<h2>Tone of voice</h2>
					<ul>{personality.notes.map((note) => <li key={note}>{note}</li>)}</ul>
					<div className="brand-strategy-columns">
						<div><h3>Do</h3><ul>{personality.doList.map((item) => <li key={item}>{item}</li>)}</ul></div>
						<div><h3>Don't</h3><ul>{personality.dontList.map((item) => <li key={item}>{item}</li>)}</ul></div>
					</div>
					<p><strong>Suggested logo styles:</strong> {personality.styles.join(', ') || 'Choose a trait to see suggestions.'}</p>
					<p><strong>Palette starting points:</strong> {personality.palettes.join(', ') || 'Choose a trait to see suggestions.'}</p>
					<p><strong>Font categories:</strong> {personality.fontCategories.join(', ') || 'Choose a trait to see suggestions.'}</p>
					<SaveToBrandKitButton updates={{
						strategy: { personality: personality.traits, tone: personality.notes },
					}} />
				</section>
			</>}
		</section>
	);
}
