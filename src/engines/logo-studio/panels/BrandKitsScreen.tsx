import { useEffect, useRef, useState } from 'react';
import { createBrandKitFromProject, exportKit, importKit, type BrandKit } from '../brand/kit';
import type { LogoProject } from '../model/types';
import { deleteBrandKit, listBrandKits, saveBrandKit, setActiveBrandKitId } from '../store/brand-kits';
import { downloadBlob } from '../export/raster';

interface Props {
	project: LogoProject;
	activeKitId: string | null;
	onActiveChange: (kit: BrandKit | null) => void;
	onBack: () => void;
}

function safeName(value: string): string {
	return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'brand-kit';
}

export default function BrandKitsScreen({ project, activeKitId, onActiveChange, onBack }: Props) {
	const [kits, setKits] = useState<BrandKit[]>([]);
	const [names, setNames] = useState<Record<string, string>>({});
	const [includeFonts, setIncludeFonts] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const fileRef = useRef<HTMLInputElement>(null);

	const refresh = async () => {
		const saved = await listBrandKits();
		setKits(saved);
		setNames(Object.fromEntries(saved.map((kit) => [kit.id, kit.name])));
	};

	useEffect(() => {
		let active = true;
		void listBrandKits().then((saved) => {
			if (active) {
				setKits(saved);
				setNames(Object.fromEntries(saved.map((kit) => [kit.id, kit.name])));
			}
		}).catch((cause: unknown) => {
			if (active) setError(cause instanceof Error ? cause.message : 'Saved brand kits could not be loaded.');
		});
		return () => { active = false; };
	}, []);

	const create = async () => {
		try {
			const kit = createBrandKitFromProject(project);
			await saveBrandKit(kit);
			await refresh();
			setNotice(`Created “${kit.name}” from the current logo.`);
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand kit could not be created.');
		}
	};

	const activate = async (kit: BrandKit | null) => {
		try {
			await setActiveBrandKitId(kit?.id ?? null);
			onActiveChange(kit);
			setNotice(kit ? `“${kit.name}” colours and fonts are active.` : 'Brand kit colours and fonts are inactive.');
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand kit could not be activated.');
		}
	};

	const rename = async (kit: BrandKit) => {
		const name = names[kit.id] ?? kit.name;
		try {
			await saveBrandKit({ ...kit, name, updatedAt: Date.now() });
			await refresh();
			setNotice('Brand kit renamed.');
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand kit could not be renamed.');
		}
	};

	const remove = async (kit: BrandKit) => {
		if (!window.confirm(`Delete “${kit.name}”? This cannot be undone.`)) return;
		try {
			await deleteBrandKit(kit.id);
			if (activeKitId === kit.id) onActiveChange(null);
			await refresh();
			setNotice('Brand kit deleted.');
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand kit could not be deleted.');
		}
	};

	const exportOne = (kit: BrandKit) => {
		try {
			const result = exportKit(kit, { includeFonts });
			downloadBlob(result.blob, `${safeName(kit.name)}.json`);
			setNotice(result.warnings.join(' '));
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand kit could not be exported.');
		}
	};

	const importOne = async (file: File | undefined) => {
		if (!file) return;
		try {
			const kit = await importKit(file);
			await saveBrandKit(kit);
			await refresh();
			setNotice(`Imported “${kit.name}”.`);
			setError('');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'The brand kit could not be imported.');
		}
	};

	return (
		<div className="logo-brand-kits-overlay">
			<section className="logo-brand-kits-dialog" role="dialog" aria-modal="true" aria-labelledby="logo-brand-kits-title">
				<header className="logo-brand-kits-header">
					<div>
						<p className="eyebrow">LOCAL BRAND ASSETS</p>
						<h2 id="logo-brand-kits-title">Brand kits</h2>
						<p>Brand colours, font families, and an optional logo project stay in this browser unless you export them.</p>
					</div>
					<button type="button" onClick={onBack} aria-label="Close brand kits">×</button>
				</header>
				<div className="logo-brand-kit-actions">
					<button type="button" className="logo-phase-primary" onClick={() => void create()}>Create kit from current logo</button>
					<button type="button" onClick={() => fileRef.current?.click()}>Import brand kit</button>
					<label className="logo-phase-field">
						<span>Include custom fonts in exports</span>
						<input type="checkbox" checked={includeFonts} onChange={(event) => setIncludeFonts(event.target.checked)} />
					</label>
				</div>
				<p className="logo-phase-hint">Custom fonts are excluded by default. Including them redistributes the font files; only share fonts you have the right to redistribute.</p>
				<input ref={fileRef} className="visually-hidden" type="file" accept=".json,application/json" aria-label="Import brand kit JSON" onChange={(event) => {
					void importOne(event.currentTarget.files?.[0]);
					event.currentTarget.value = '';
				}} />
				{error && <p className="logo-phase-error" role="alert">{error}</p>}
				{notice && <p className="logo-phase-hint" role="status">{notice}</p>}
				<div className="logo-brand-kit-list">
					{kits.length === 0 && <p className="logo-phase-hint">No saved brand kits yet.</p>}
					{kits.map((kit) => (
						<article className="logo-brand-kit-card" key={kit.id}>
							<div className="logo-brand-kit-title">
								<input aria-label={`Rename ${kit.name}`} maxLength={120} value={names[kit.id] ?? kit.name} onChange={(event) => setNames((current) => ({ ...current, [kit.id]: event.target.value }))} />
								{activeKitId === kit.id && <strong>Active</strong>}
							</div>
							<div className="logo-brand-kit-swatches" aria-label={`${kit.name} brand colours`}>
								{kit.colors.map((color) => <span key={`${color.name}-${color.hex}`} style={{ backgroundColor: color.hex }} title={`${color.name}: ${color.hex}`} />)}
							</div>
							<p><strong>Fonts:</strong> {kit.fonts.heading} / {kit.fonts.subheading} / {kit.fonts.body}</p>
							<p>{kit.logo ? 'Logo project included' : 'No logo project included'}{kit.customFonts?.length ? ` · ${kit.customFonts.length} custom fonts` : ''}</p>
							<div className="logo-brand-kit-buttons">
								<button type="button" onClick={() => void activate(activeKitId === kit.id ? null : kit)}>{activeKitId === kit.id ? 'Deactivate' : 'Use kit colours and fonts'}</button>
								<button type="button" onClick={() => void rename(kit)}>Save name</button>
								<button type="button" onClick={() => exportOne(kit)}>Export JSON</button>
								<button type="button" onClick={() => void remove(kit)}>Delete</button>
							</div>
						</article>
					))}
				</div>
			</section>
		</div>
	);
}
