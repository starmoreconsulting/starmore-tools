import { useState } from 'react';
import type { BrandKit } from '../../logo-studio/brand/kit';
import { downloadBlob } from '../../logo-studio/export/raster';
import type { LogoProject } from '../../logo-studio/model/types';
import { listLocalProjects } from '../../logo-studio/store/local-projects';
import { exportBrandPack, exportDesignAsset, type DesignExportFormat } from '../export/design-exports';

interface Props {
	project: LogoProject;
	kit: BrandKit | null;
}

function safeName(value: string): string {
	return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 100) || 'brand-design';
}

export default function DesignExportPanel({ project, kit }: Props) {
	const [busy, setBusy] = useState('');
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const social = project.artboard.width > 500;
	const run = async (label: string, operation: () => Promise<void>) => {
		if (busy) return;
		setBusy(label);
		setError('');
		setNotice('');
		try {
			await operation();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : `${label} could not be exported.`);
		} finally {
			setBusy('');
		}
	};
	const exportOne = (format: DesignExportFormat, scale: 1 | 2 = 1) => run(
		`${format}-${scale}`,
		async () => {
			const blob = await exportDesignAsset(project, format, scale);
			const suffix = format === 'pdf' || format === 'svg' ? '' : `-${scale}x`;
			downloadBlob(blob, `${safeName(project.name)}${suffix}.${format}`);
			setNotice(`${format.toUpperCase()} export downloaded.`);
		},
	);
	const exportPack = () => run('brand-pack', async () => {
		if (!kit) throw new Error('Set up and activate a brand kit before creating a Brand pack.');
		const saved = await listLocalProjects();
		const designs = [
			project,
			...saved.map(({ project: savedProject }) => savedProject).filter((savedProject) => (
				savedProject.kind === 'design'
				&& savedProject.brandName === kit.name
				&& savedProject.id !== project.id
			)),
		];
		const blob = await exportBrandPack(kit, designs);
		downloadBlob(blob, `${safeName(kit.name)}-brand-pack.zip`);
		setNotice('Brand pack ZIP downloaded.');
	});

	return (
		<section className="logo-phase-panel brand-design-exports" aria-labelledby="brand-design-exports-title">
			<h2 id="brand-design-exports-title">Export design</h2>
			<div className="brand-design-export-buttons">
				<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('svg')}>SVG</button>
				<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('png', 1)}>PNG 1×</button>
				{social && <>
					<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('png', 2)}>PNG 2×</button>
					<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('jpg', 1)}>JPG 1×</button>
					<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('jpg', 2)}>JPG 2×</button>
					<button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('pdf')}>Screen PDF</button>
				</>}
				{!social && <button type="button" disabled={Boolean(busy)} onClick={() => void exportOne('pdf')}>Print PDF · 3 mm bleed + marks</button>}
				<button type="button" className="logo-phase-primary" disabled={Boolean(busy)} onClick={() => void exportPack()}>
					{busy === 'brand-pack' ? 'Preparing Brand pack…' : 'Download Brand pack ZIP'}
				</button>
			</div>
			{busy && busy !== 'brand-pack' && <p className="logo-phase-hint" role="status">Preparing {busy.replace('-', ' ')}…</p>}
			{error && <p className="logo-phase-error" role="alert">{error}</p>}
			{notice && <p className="logo-phase-hint" role="status">{notice}</p>}
		</section>
	);
}
