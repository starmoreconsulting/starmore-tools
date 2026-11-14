import { useEffect, useMemo, useState } from 'react';
import type { BrandKit, BrandProfile } from '../../logo-studio/brand/kit';
import type { LogoProject } from '../../logo-studio/model/types';
import { exportProjectToSvg } from '../../logo-studio/export/svg';
import { resizeDesign, type DesignResizeMode, type DesignResizeTarget } from '../designs/resize';
import { type DesignType } from '../designs/generate';

interface Props {
	project: LogoProject;
	kit: BrandKit | null;
	profile: BrandProfile;
	onApply: (project: LogoProject, note?: string) => void;
	onClose: () => void;
}

const TYPES: Array<[DesignType, string]> = [
	['business-card-front', 'Business card'],
	['business-card-back', 'Business card back'],
	['letterhead', 'Letterhead'],
	['envelope', 'Envelope'],
	['instagram-post-square', 'Instagram post (square)'],
	['instagram-post-portrait', 'Instagram post (4:5)'],
	['instagram-story', 'Instagram story'],
	['facebook-cover', 'Facebook cover'],
	['youtube-banner', 'YouTube banner'],
	['linkedin-banner', 'LinkedIn banner'],
];

export default function DesignResizeDialog({ project, kit, profile, onApply, onClose }: Props) {
	const [type, setType] = useState<DesignType>('instagram-story');
	const [cardSize, setCardSize] = useState<'85x55mm' | '3.5x2in'>('85x55mm');
	const [mode, setMode] = useState<DesignResizeMode>('regenerate');
	const [previewUrl, setPreviewUrl] = useState('');
	const [error, setError] = useState('');
	const target: DesignResizeTarget = type.startsWith('business-card') ? { type, cardSize } : type;
	const result = useMemo(() => {
		try {
			return resizeDesign(project, target, mode, { kit: kit ?? undefined, profile });
		} catch (cause) {
			return { error: cause instanceof Error ? cause.message : 'The design could not be resized.' };
		}
	}, [project, target.type, target.cardSize, mode, kit, profile]);

	useEffect(() => {
		let active = true;
		if ('error' in result) {
			setError(result.error);
			setPreviewUrl('');
			return () => { active = false; };
		}
		setError('');
		void exportProjectToSvg(result.project, { outlineText: false }).then(({ svg }) => {
			if (active) setPreviewUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'The resize preview could not be rendered.');
		});
		return () => { active = false; };
	}, [result]);

	return (
		<div className="logo-brand-kits-overlay">
			<section className="logo-brand-setup-dialog brand-resize-dialog" role="dialog" aria-modal="true" aria-labelledby="brand-resize-title">
				<header className="logo-brand-kits-header">
					<div>
						<p className="eyebrow">PREVIEW BEFORE APPLYING</p>
						<h2 id="brand-resize-title">Resize design</h2>
						<p>Choose how this design should adapt to its new format.</p>
					</div>
					<button type="button" onClick={onClose} aria-label="Close resize preview">×</button>
				</header>
				<div className="brand-resize-controls">
					<label className="logo-phase-field">
						<span>Target format</span>
						<select value={type} onChange={(event) => setType(event.target.value as DesignType)}>
							{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
						</select>
					</label>
					{type.startsWith('business-card') && <label className="logo-phase-field">
						<span>Card size</span>
						<select value={cardSize} onChange={(event) => setCardSize(event.target.value as typeof cardSize)}>
							<option value="85x55mm">85 × 55 mm</option>
							<option value="3.5x2in">3.5 × 2 in</option>
						</select>
					</label>}
					<label className="logo-phase-field">
						<span>Resize mode</span>
						<select value={mode} onChange={(event) => setMode(event.target.value as DesignResizeMode)}>
							<option value="regenerate">Regenerate</option>
							<option value="scale">Scale</option>
							<option value="keep">Keep positions</option>
						</select>
					</label>
				</div>
				{'error' in result ? <p className="logo-phase-error" role="alert">{error}</p> : (
					<div className="brand-resize-preview">
						<div className="brand-resize-preview-frame">
							{previewUrl ? <img src={previewUrl} alt="Resized design preview" /> : <p role="status">Preparing preview…</p>}
						</div>
						<p>{result.project.artboard.width} × {result.project.artboard.height} {result.project.artboard.width > 500 ? 'px' : 'mm'} · {result.mode}</p>
						{result.note && <p className="logo-phase-hint">{result.note}</p>}
						{result.warnings.map((warning) => <p className="logo-phase-error" key={warning}>{warning}</p>)}
					</div>
				)}
				<div className="logo-brand-setup-footer">
					<button type="button" onClick={onClose}>Cancel</button>
					<button type="button" className="logo-phase-primary" disabled={'error' in result || !previewUrl} onClick={() => {
						if (!('error' in result)) onApply(result.project, result.note);
					}}>Apply resize</button>
				</div>
			</section>
		</div>
	);
}
