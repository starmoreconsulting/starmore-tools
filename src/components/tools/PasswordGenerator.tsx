import { useState } from 'react';

const characterGroups = {
	uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	lowercase: 'abcdefghijklmnopqrstuvwxyz',
	numbers: '0123456789',
	symbols: '!@#$%^&*()-_=+[]{};:,.<>/?',
};

type CharacterGroup = keyof typeof characterGroups;

function randomIndex(max: number): number {
	const cryptoApi = globalThis.crypto;
	if (!cryptoApi?.getRandomValues) throw new Error('Secure randomness is not available in this browser.');

	const range = 0x1_0000_0000;
	const limit = range - (range % max);
	const value = new Uint32Array(1);
	do {
		cryptoApi.getRandomValues(value);
	} while (value[0] >= limit);
	return value[0] % max;
}

function createPassword(length: number, groups: CharacterGroup[]): string {
	if (groups.length === 0) throw new Error('Choose at least one character type.');
	const alphabet = groups.map((group) => characterGroups[group]).join('');
	const characters = groups.map((group) => {
		const charactersInGroup = characterGroups[group];
		return charactersInGroup[randomIndex(charactersInGroup.length)];
	});

	while (characters.length < length) characters.push(alphabet[randomIndex(alphabet.length)]);
	for (let index = characters.length - 1; index > 0; index -= 1) {
		const swapIndex = randomIndex(index + 1);
		[characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
	}
	return characters.join('');
}

export default function PasswordGenerator() {
	const [length, setLength] = useState(20);
	const [enabled, setEnabled] = useState<Record<CharacterGroup, boolean>>({
		uppercase: true,
		lowercase: true,
		numbers: true,
		symbols: true,
	});
	const [password, setPassword] = useState('');
	const [message, setMessage] = useState('Choose options and generate a password.');

	const selectedGroups = (Object.keys(enabled) as CharacterGroup[]).filter((group) => enabled[group]);

	const generate = () => {
		try {
			setPassword(createPassword(length, selectedGroups));
			setMessage('Generated securely in your browser with the Web Crypto API.');
		} catch (error) {
			setPassword('');
			setMessage(error instanceof Error ? error.message : 'Could not generate a secure password.');
		}
	};

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(password);
			setMessage('Password copied to clipboard.');
		} catch {
			setMessage('Clipboard access is unavailable. Select and copy the password instead.');
		}
	};

	return (
		<div>
			<div className="tool-control">
				<label htmlFor="password-length">Length: {length} characters</label>
				<input id="password-length" type="range" min="8" max="128" value={length} onChange={(event) => setLength(Number(event.target.value))} />
			</div>
			<fieldset className="duplicate-options">
				<legend>Include characters</legend>
				{(Object.keys(characterGroups) as CharacterGroup[]).map((group) => (
					<label className="tool-choice" key={group}>
						<input type="checkbox" checked={enabled[group]} onChange={(event) => setEnabled({ ...enabled, [group]: event.target.checked })} />
						<span>{group[0].toUpperCase() + group.slice(1)}</span>
					</label>
				))}
			</fieldset>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={generate} disabled={selectedGroups.length === 0}>Generate password</button>
				<button className="tool-button secondary" type="button" onClick={copy} disabled={!password}>Copy password</button>
			</div>
			<div className="calc-field" style={{ marginTop: 17 }}>
				<label htmlFor="generated-password">Generated password</label>
				<textarea id="generated-password" className="password-output" value={password} readOnly placeholder="Your password will appear here" />
			</div>
			<p className={`tool-message${selectedGroups.length === 0 ? ' error' : ''}`} role="status">
				{selectedGroups.length === 0 ? 'Choose at least one character type.' : message}
			</p>
		</div>
	);
}
