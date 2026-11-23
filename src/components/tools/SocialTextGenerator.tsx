import { useState } from 'react';
import { generateSocialText, type SocialTextInput } from '../../engines/social-content';
import type { SocialTextConfig } from './socialContentConfigs';

export default function SocialTextGenerator({ config }: { config: SocialTextConfig }) {
	const [fields, setFields] = useState<SocialTextInput>({});
	const [outputs, setOutputs] = useState<string[]>([]);
	const [message, setMessage] = useState('Runs locally in your browser. Generated text is an editable starting point, not a performance guarantee.');
	const missingRequired = config.fields.some((field) => field.required && !fields[field.id]?.trim());

	const generate = () => {
		if (missingRequired) {
			setMessage('Fill in the required field to generate draft options.');
			return;
		}
		setOutputs(generateSocialText(config.tool, fields));
		setMessage('Three draft options generated locally. Edit them to match your voice and verify all details.');
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(outputs.join('\n\n---\n\n'));
			setMessage('Draft options copied to the clipboard. They remain editable.');
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the draft text instead.');
		}
	};

	return (
		<section aria-label={config.title}>
			<p>{config.intro}</p>
			<div className="calc-fields">
				{config.fields.map((field) => (
					<div className="calc-field" key={field.id}>
						<label htmlFor={`${config.tool}-${field.id}`}>{field.label}{field.required ? ' *' : ''}</label>
						<input
							id={`${config.tool}-${field.id}`}
							required={field.required}
							value={fields[field.id] ?? ''}
							placeholder={field.placeholder}
							onChange={(event) => setFields((current) => ({ ...current, [field.id]: event.target.value }))}
						/>
					</div>
				))}
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={generate}>Generate options</button>
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!outputs.length}>Copy options</button>
			</div>
			{outputs.map((output, index) => (
				<label className="calc-field" key={index}>
					<span>Option {index + 1} — edit as needed</span>
					<textarea rows={output.split('\n').length > 5 ? 10 : 4} value={output} onChange={(event) => setOutputs((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
				</label>
			))}
			<p className="tool-message" role="status">{message}</p>
		</section>
	);
}
