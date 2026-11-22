import { useState } from 'react';
import { generateUuids, isValidUuid, type UuidVersion } from '../../engines/uuid';

export default function UuidGenerator() {
	const [version, setVersion] = useState<UuidVersion>('v4');
	const [quantity, setQuantity] = useState(1);
	const [uppercase, setUppercase] = useState(false);
	const [braces, setBraces] = useState(false);
	const [uuids, setUuids] = useState('');
	const [validation, setValidation] = useState('');
	const [message, setMessage] = useState('Choose a UUID version and quantity.');
	const [isError, setIsError] = useState(false);

	const generate = () => {
		try {
			const generated = generateUuids(quantity, version, { uppercase, braces });
			setUuids(generated.join('\n'));
			setValidation('');
			setMessage(`Generated ${quantity} UUID${quantity === 1 ? '' : 's'} locally.`);
			setIsError(false);
		} catch (error) {
			setUuids('');
			setValidation('');
			setMessage(error instanceof Error ? error.message : 'Could not generate UUIDs.');
			setIsError(true);
		}
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(uuids);
			setMessage('UUIDs copied to clipboard.');
			setIsError(false);
		} catch {
			setMessage('Could not access the clipboard. Select and copy the UUIDs instead.');
			setIsError(true);
		}
	};

	const clear = () => {
		setUuids('');
		setValidation('');
		setMessage('Choose a UUID version and quantity.');
		setIsError(false);
	};

	return (
		<div>
			<div className="json-columns">
				<div className="calc-field">
					<label htmlFor="uuid-version">UUID version</label>
					<select id="uuid-version" value={version} onChange={(event) => setVersion(event.target.value as UuidVersion)}>
						<option value="v4">Version 4 — random</option>
						<option value="v1">Version 1 — time-based</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="uuid-quantity">Quantity (1–100)</label>
					<input id="uuid-quantity" type="number" min="1" max="100" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
				</div>
			</div>
			<fieldset className="duplicate-options">
				<legend>Formatting</legend>
				<label className="tool-choice">
					<input type="checkbox" checked={uppercase} onChange={(event) => setUppercase(event.target.checked)} />
					<span>Uppercase</span>
				</label>
				<label className="tool-choice">
					<input type="checkbox" checked={braces} onChange={(event) => setBraces(event.target.checked)} />
					<span>Add braces</span>
				</label>
			</fieldset>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={generate}>Generate UUID{quantity === 1 ? '' : 's'}</button>
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!uuids}>Copy</button>
				<button className="tool-button secondary" type="button" onClick={clear} disabled={!uuids && !validation}>Clear</button>
			</div>
			<div className="calc-field" style={{ marginTop: 16 }}>
				<label htmlFor="generated-uuids">Generated UUIDs</label>
				<textarea id="generated-uuids" value={uuids} readOnly spellCheck={false} placeholder="Generated UUIDs will appear here" />
			</div>
			<div className="calc-field">
				<label htmlFor="uuid-validation">Optional UUID check</label>
				<input
					id="uuid-validation"
					type="text"
					value={validation}
					placeholder="Paste a UUID to validate"
					onChange={(event) => setValidation(event.target.value)}
				/>
				{validation.trim() && (
					<p className="tool-message" role="status">{isValidUuid(validation) ? 'Valid UUID format.' : 'Invalid UUID format.'}</p>
				)}
			</div>
			<p className={`tool-message${isError ? ' error' : ''}`} role="status">{message}</p>
			<p className="html-formatter-note">UUID v4 values use cryptographically secure browser randomness. UUID v1 values combine a timestamp, clock sequence, and random node. Values are generated locally and are not uploaded.</p>
		</div>
	);
}
