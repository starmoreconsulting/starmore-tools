import { useEffect, useMemo, useState } from 'react';
import { exportProjectToSvg } from '../export/svg';
import { collectFields, fillFields } from '../model/fields';
import type { LogoProject } from '../model/types';
import { sanitizeReferenceSvg } from '../store/references';

interface Props {
	project: LogoProject;
	activeVariant: string;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default function FieldsPanel({ project, activeVariant }: Props) {
	const fields = useMemo(() => collectFields(project), [project]);
	const [values, setValues] = useState<Record<string, string | number>>({});
	const [preview, setPreview] = useState('');
	const [error, setError] = useState('');
	const filled = useMemo(() => fillFields(project, values), [project, values]);

	useEffect(() => {
		let active = true;
		const previewProject: LogoProject = {
			...filled.project,
			variants: { [activeVariant]: filled.project.variants[activeVariant] ?? [] },
		};
		void exportProjectToSvg(previewProject, { outlineText: false }).then(({ svg }) => {
			if (active) {
				setPreview(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
				setError('');
			}
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'The field preview could not be rendered.');
		});
		return () => { active = false; };
	}, [activeVariant, filled.project]);

	const updateImage = async (name: string, file: File | undefined) => {
		if (!file) return;
		if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
			setError('Choose a PNG, JPG, WebP, or SVG image for this field.');
			return;
		}
		if (file.size > MAX_IMAGE_BYTES) {
			setError('Field preview images must be 10 MB or smaller.');
			return;
		}
		if (file.type === 'image/svg+xml') {
			try {
				const svg = sanitizeReferenceSvg(await file.text());
				setValues((previous) => ({ ...previous, [name]: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` }));
				setError('');
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : 'The selected SVG could not be sanitized.');
			}
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === 'string') {
				setValues((previous) => ({ ...previous, [name]: result }));
				setError('');
			} else setError('The selected image could not be read.');
		};
		reader.onerror = () => setError('The selected image could not be read.');
		reader.readAsDataURL(file);
	};

	return (
		<section className="logo-library-section logo-fields-panel" aria-label="Template fields">
			<p className="logo-phase-hint">Try replacing named text and image fields. This preview fills a copy; your project is unchanged.</p>
			<button type="button" onClick={() => { setValues({}); setError(''); }}>Reset</button>
			{fields.length === 0 ? <p className="logo-phase-hint">Add a Field name to a text or image element to make it replaceable.</p> : (
				<div className="logo-fields-list">
					{fields.map((field) => (
						<label className="logo-phase-field" key={field.name}>
							<span>{field.name} <small>({field.type}; {field.variants.join(', ')})</small></span>
							{field.type === 'text' ? (
								<input
									value={String(values[field.name] ?? field.value)}
									onChange={(event) => setValues((previous) => ({ ...previous, [field.name]: event.target.value }))}
								/>
							) : (
								<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => {
									void updateImage(field.name, event.currentTarget.files?.[0]);
									event.currentTarget.value = '';
								}} />
							)}
						</label>
					))}
				</div>
			)}
			{filled.warnings.map((warning) => <p className="logo-phase-error" role="status" key={warning}>{warning}</p>)}
			{error && <p className="logo-phase-error" role="alert">{error}</p>}
			{preview && <img className="logo-fields-preview" src={preview} alt="Live preview with the test field values" />}
		</section>
	);
}
