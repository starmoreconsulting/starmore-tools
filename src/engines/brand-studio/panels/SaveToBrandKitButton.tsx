import { useEffect, useState } from 'react';
import {
	applyBrandKitUpdates,
	createEmptyBrandKit,
	type BrandKit,
	type BrandKitUpdates,
} from '../../logo-studio/brand/kit';
import { listBrandKits, saveBrandKit } from '../../logo-studio/store/brand-kits';

interface SaveToBrandKitButtonProps {
	updates: BrandKitUpdates;
}

export default function SaveToBrandKitButton({ updates }: SaveToBrandKitButtonProps) {
	const [open, setOpen] = useState(false);
	const [kits, setKits] = useState<BrandKit[]>([]);
	const [selectedId, setSelectedId] = useState('');
	const [newName, setNewName] = useState('');
	const [creating, setCreating] = useState(false);
	const [message, setMessage] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) return;
		void listBrandKits().then((saved) => {
			setKits(saved);
			setSelectedId(saved[0]?.id ?? '');
		}).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not load brand kits.'));
	}, [open]);

	async function save(): Promise<void> {
		setError('');
		setMessage('');
		try {
			const target = creating
				? createEmptyBrandKit(newName.trim() || 'My brand')
				: kits.find((kit) => kit.id === selectedId);
			if (!target) throw new Error('Choose a saved brand kit or create a new one.');
			const updated = applyBrandKitUpdates(target, updates);
			await saveBrandKit(updated);
			setKits((current) => [updated, ...current.filter((kit) => kit.id !== updated.id)]);
			setSelectedId(updated.id);
			setCreating(false);
			setMessage(`Saved to ${updated.name}.`);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Could not save to the brand kit.');
		}
	}

	return (
		<div className="save-to-brand-kit">
			<button type="button" onClick={() => { setOpen((value) => !value); setError(''); }}>
				Save to my brand kit
			</button>
			{open && (
				<div className="save-to-brand-kit-options">
					<label>
						<span>{creating ? 'New kit name' : 'Choose a brand kit'}</span>
						{creating ? (
							<input value={newName} maxLength={120} onChange={(event) => setNewName(event.currentTarget.value)} />
						) : (
							<select value={selectedId} onChange={(event) => setSelectedId(event.currentTarget.value)}>
								{kits.map((kit) => <option key={kit.id} value={kit.id}>{kit.name}</option>)}
							</select>
						)}
					</label>
					<div>
						<button type="button" onClick={() => setCreating((value) => !value)}>
							{creating ? 'Choose existing kit' : 'Create a kit'}
						</button>
						<button type="button" onClick={() => void save()} disabled={!creating && !selectedId}>Save selected information</button>
					</div>
					{error && <p role="alert">{error}</p>}
					{message && <p role="status">{message}</p>}
				</div>
			)}
		</div>
	);
}
