import { useState } from 'react';
import { fitVideoDimensions, VIDEO_ASPECT_RATIOS, type VideoAspectRatio } from '../../engines/social-content';

export default function VideoAspectRatioConverter() {
	const [width, setWidth] = useState('1920');
	const [height, setHeight] = useState('1080');
	const [ratio, setRatio] = useState<VideoAspectRatio>('9:16');
	let errorMessage = '';
	let result: ReturnType<typeof fitVideoDimensions> | null = null;
	try {
		result = fitVideoDimensions(Number(width), Number(height), ratio);
	} catch (error) {
		errorMessage = error instanceof Error ? error.message : 'Enter valid dimensions.';
	}

	return (
		<section aria-label="Video aspect ratio converter">
			<p>Enter the maximum width and height available. The tool fits the selected aspect ratio inside those bounds without cropping, rounding down to whole pixels.</p>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="aspect-width">Maximum width (px)</label>
					<input id="aspect-width" type="number" min="1" step="1" value={width} onChange={(event) => setWidth(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="aspect-height">Maximum height (px)</label>
					<input id="aspect-height" type="number" min="1" step="1" value={height} onChange={(event) => setHeight(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="aspect-ratio">Target aspect ratio</label>
					<select id="aspect-ratio" value={ratio} onChange={(event) => setRatio(event.target.value as VideoAspectRatio)}>
						{Object.keys(VIDEO_ASPECT_RATIOS).map((value) => <option key={value} value={value}>{value}</option>)}
					</select>
				</div>
			</div>
			<div className="percentage-result" aria-live="polite">
				<span className="percentage-result-label">FITTED DIMENSIONS</span>
				<strong>{result ? `${result.width} × ${result.height} px` : '—'}</strong>
				{result && <span>Ratio {ratio}; fits within {width} × {height} px with no crop.</span>}
				{errorMessage && <span className="percentage-error">{errorMessage}</span>}
			</div>
			<p className="tool-message">This calculates canvas dimensions only; it does not resize or encode a video file.</p>
		</section>
	);
}
