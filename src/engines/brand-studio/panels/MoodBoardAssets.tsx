import { useRef, useState } from 'react';
import type { Element, LogoProject } from '../../logo-studio/model/types';
import { removeMoodBoardImages, saveMoodBoardImage } from '../../logo-studio/store/moodboard-images';
import { prepareMoodBoardImage } from '../moodboard/images';

interface Props {
	project: LogoProject;
	onUpdate: (id: string, patch: Partial<Element>) => void;
}

export default function MoodBoardAssets({ project, onUpdate }: Props) {
	const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
	const [error, setError] = useState('');
	const [busyId, setBusyId] = useState('');
	const slots = project.variants.primary.filter((element) => element.fieldName === 'moodboardImage');
	if (project.kind !== 'design' || !project.generation?.layoutId.startsWith('moodboard:')) return null;

	const upload = async (slot: Element, file: File | undefined) => {
		if (!file) return;
		setError('');
		setBusyId(slot.id);
		try {
			const prepared = await prepareMoodBoardImage(file);
			const image = { elementId: slot.id, name: file.name.slice(0, 120), ...prepared };
			await saveMoodBoardImage(project.id, image);
			onUpdate(slot.id, { src: prepared.dataUrl, name: image.name, fit: 'cover' });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The image could not be added to this mood board.');
		} finally {
			setBusyId('');
		}
	};

	const remove = async (slot: Element) => {
		setError('');
		try {
			await removeMoodBoardImages(project.id, [slot.id]);
			onUpdate(slot.id, { src: undefined, name: `Image slot ${slots.indexOf(slot) + 1}` });
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The image could not be removed from local storage.');
		}
	};

	return (
		<section className="logo-phase-panel brand-moodboard-assets" aria-labelledby="moodboard-assets-title">
			<h2 id="moodboard-assets-title">Mood board images</h2>
			<p>Use only images you have the right to use. PNG, JPG, or WebP; up to 10 MB each. Images are resized in your browser and stay on this device.</p>
			<div className="brand-moodboard-slot-list">
				{slots.map((slot, index) => (
					<div className="brand-moodboard-slot" key={slot.id}>
						<span>{slot.name ?? `Image slot ${index + 1}`}{slot.src ? ' · added' : ' · empty'}</span>
						<input
							ref={(node) => { inputRefs.current[slot.id] = node; }}
							type="file"
							accept="image/png,image/jpeg,image/webp"
							className="visually-hidden"
							aria-label={`Choose image for slot ${index + 1}`}
							onChange={(event) => {
								void upload(slot, event.currentTarget.files?.[0]);
								event.currentTarget.value = '';
							}}
						/>
						<button type="button" disabled={Boolean(busyId)} onClick={() => inputRefs.current[slot.id]?.click()}>
							{busyId === slot.id ? 'Preparing…' : slot.src ? 'Replace' : 'Choose image'}
						</button>
						{slot.src && <button type="button" disabled={Boolean(busyId)} onClick={() => void remove(slot)}>Remove</button>}
					</div>
				))}
			</div>
			{error && <p className="logo-phase-error" role="alert">{error}</p>}
		</section>
	);
}
