import { STANDARD_VARIANTS, variantLabel } from '../variants/automatic';
import type { BrandKit } from '../brand/kit';
import BrandColorSwatches from './BrandColorSwatches';

interface Props {
	names: string[];
	active: string;
	outdated: boolean;
	requiresManualArrangement: boolean;
	monochromeColor: string;
	onSelect: (name: string) => void;
	onCreateFromPrimary: () => void;
	onDuplicate: () => void;
	onReset: () => void;
	onRebuild: () => void;
	onMonochromeChange: (color: string) => void;
	onCompare: () => void;
	brandColors?: BrandKit['colors'];
}

export default function VariantBar({
	names,
	active,
	outdated,
	requiresManualArrangement,
	monochromeColor,
	onSelect,
	onCreateFromPrimary,
	onDuplicate,
	onReset,
	onRebuild,
	onMonochromeChange,
	onCompare,
	brandColors = [],
}: Props) {
	const tabs = [...STANDARD_VARIANTS, ...names.filter((name) => !(STANDARD_VARIANTS as readonly string[]).includes(name))];
	return (
		<section className="logo-variant-bar" aria-label="Logo variants">
			<div className="logo-variant-tabs" role="tablist" aria-label="Design variants">
				{tabs.map((name) => (
					<button key={name} type="button" role="tab" aria-selected={active === name} onClick={() => onSelect(name)}>
						{variantLabel(name)}
					</button>
				))}
			</div>
			<div className="logo-variant-actions">
				{active !== 'primary' && outdated && (
					<p className="logo-variant-notice" role="status">
						Primary changed since this was made. <button type="button" onClick={onRebuild}>Rebuild</button>
					</p>
				)}
				{active !== 'primary' && requiresManualArrangement && (
					<p className="logo-variant-notice" role="status">Hand-built logo: arrange this version by hand.</p>
				)}
				{active === 'monochrome' && (
					<>
						<BrandColorSwatches colors={brandColors} onChoose={onMonochromeChange} />
						<label className="logo-variant-color"><span>Monochrome colour</span><input aria-label="Monochrome colour" type="color" value={monochromeColor} onChange={(event) => onMonochromeChange(event.target.value)} /></label>
					</>
				)}
				<button type="button" onClick={onCreateFromPrimary} disabled={active === 'primary'}>Create from primary</button>
				<button type="button" onClick={onDuplicate}>Duplicate current variant</button>
				<button type="button" onClick={onReset} disabled={active === 'primary'}>Reset this variant</button>
				<button type="button" onClick={onCompare}>Compare variants</button>
			</div>
		</section>
	);
}
