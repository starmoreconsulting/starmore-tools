import type { BrandKit } from '../brand/kit';

interface Props {
	colors: BrandKit['colors'];
	onChoose: (hex: string) => void;
}

export default function BrandColorSwatches({ colors, onChoose }: Props) {
	if (!colors.length) return null;
	return (
		<div className="logo-brand-color-row" aria-label="Brand colours">
			<strong>Brand colours</strong>
			<div>
				{colors.map((color) => (
					<button
						key={`${color.name}-${color.hex}`}
						type="button"
						className="logo-swatch"
						style={{ backgroundColor: color.hex }}
						title={`${color.name}: ${color.hex}`}
						aria-label={`Use brand colour ${color.name} ${color.hex}`}
						onClick={() => onChoose(color.hex)}
					/>
				))}
			</div>
		</div>
	);
}
