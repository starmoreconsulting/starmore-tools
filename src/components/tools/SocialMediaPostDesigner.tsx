import { useEffect, useRef, useState } from 'react';
import { socialSizePresets } from '../../data/social-sizes';
import {
	createSocialMediaPostSvg,
	drawSocialMediaPost,
	type SocialMediaPostOptions,
	type SocialPostLayout,
} from '../../engines/social-media-post';

const initialPreset = socialSizePresets[0];

function clampDimension(value: string): number {
	const dimension = Number(value);
	return Number.isFinite(dimension) ? Math.min(4096, Math.max(1, Math.round(dimension))) : 1;
}

export default function SocialMediaPostDesigner() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [presetId, setPresetId] = useState(initialPreset.id);
	const [width, setWidth] = useState(initialPreset.width);
	const [height, setHeight] = useState(initialPreset.height);
	const [title, setTitle] = useState('Make your next idea stand out');
	const [body, setBody] = useState('A little clarity can make a big difference. Share what matters with a post that feels like you.');
	const [footer, setFooter] = useState('@yourbrand');
	const [backgroundColor, setBackgroundColor] = useState('#f5f0e8');
	const [accentColor, setAccentColor] = useState('#b95236');
	const [textColor, setTextColor] = useState('#20211f');
	const [layout, setLayout] = useState<SocialPostLayout>('centered');
	const [fontSize, setFontSize] = useState(88);
	const [message, setMessage] = useState('Edit the copy and styling, then export a PNG or SVG. Everything stays on your device.');
	const isCustom = presetId === 'custom';

	const options: SocialMediaPostOptions = {
		width, height, title, body, footer, backgroundColor, accentColor, textColor, layout, fontSize,
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		const context = canvas?.getContext('2d');
		if (!canvas || !context) {
			setMessage('Your browser could not prepare the post preview.');
			return;
		}
		try {
			drawSocialMediaPost(context, options);
		} catch {
			setMessage('Your browser could not prepare the post preview.');
		}
	}, [width, height, title, body, footer, backgroundColor, accentColor, textColor, layout, fontSize]);

	const choosePreset = (id: string) => {
		setPresetId(id);
		const preset = socialSizePresets.find((item) => item.id === id);
		if (preset) {
			setWidth(preset.width);
			setHeight(preset.height);
		}
	};

	const saveBlob = (blob: Blob, filename: string) => {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	const exportPng = () => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		canvas.toBlob((blob) => {
			if (!blob) {
				setMessage('PNG export was not available in this browser. Try the SVG export instead.');
				return;
			}
			saveBlob(blob, `social-post-${width}x${height}.png`);
			setMessage(`PNG downloaded at ${width.toLocaleString()} × ${height.toLocaleString()} px.`);
		}, 'image/png');
	};

	const exportSvg = () => {
		const svg = createSocialMediaPostSvg(options);
		saveBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `social-post-${width}x${height}.svg`);
		setMessage(`SVG downloaded at ${width.toLocaleString()} × ${height.toLocaleString()} px.`);
	};

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="social-post-size">Starting size</label>
					<select id="social-post-size" value={presetId} onChange={(event) => choosePreset(event.target.value)}>
						{socialSizePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.platform} — {preset.name} ({preset.width} × {preset.height})</option>)}
						<option value="custom">Custom dimensions</option>
					</select>
				</div>
				<div className="calc-field">
					<label htmlFor="social-post-layout">Layout</label>
					<select id="social-post-layout" value={layout} onChange={(event) => setLayout(event.target.value as SocialPostLayout)}>
						<option value="centered">Centered</option><option value="editorial">Editorial</option><option value="bold-band">Bold colour band</option>
					</select>
				</div>
				{isCustom && <>
					<div className="calc-field"><label htmlFor="social-post-width">Width (px)</label><input id="social-post-width" type="number" min="1" max="4096" value={width} onChange={(event) => setWidth(clampDimension(event.target.value))} /></div>
					<div className="calc-field"><label htmlFor="social-post-height">Height (px)</label><input id="social-post-height" type="number" min="1" max="4096" value={height} onChange={(event) => setHeight(clampDimension(event.target.value))} /></div>
				</>}
				<div className="calc-field"><label htmlFor="social-post-background">Background colour</label><input id="social-post-background" type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} /></div>
				<div className="calc-field"><label htmlFor="social-post-accent">Accent colour</label><input id="social-post-accent" type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} /></div>
				<div className="calc-field"><label htmlFor="social-post-text-colour">Text colour</label><input id="social-post-text-colour" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} /></div>
			</div>
			<div className="calc-fields" style={{ marginTop: 14 }}>
				<div className="calc-field"><label htmlFor="social-post-title">Headline</label><textarea id="social-post-title" rows={3} maxLength={240} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
				<div className="calc-field"><label htmlFor="social-post-body">Supporting text</label><textarea id="social-post-body" rows={4} maxLength={480} value={body} onChange={(event) => setBody(event.target.value)} /></div>
				<div className="calc-field"><label htmlFor="social-post-footer">Footer / handle</label><input id="social-post-footer" maxLength={100} value={footer} onChange={(event) => setFooter(event.target.value)} /></div>
			</div>
			<div className="tool-control" style={{ marginTop: 14 }}>
				<label htmlFor="social-post-font-size">Headline size: {fontSize} px</label>
				<input id="social-post-font-size" type="range" min="32" max="140" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
			</div>
			<p className="inline-note">Canvas: {width.toLocaleString()} × {height.toLocaleString()} px. Text may be shortened to fit the design.</p>
			<div className="tool-preview" style={{ display: 'block', textAlign: 'center', overflow: 'hidden' }}>
				<canvas ref={canvasRef} role="img" aria-label={`Social media post preview, ${width} by ${height} pixels`} style={{ display: 'block', width: `min(100%, ${Math.round(420 * width / height)}px)`, height: 'auto', margin: '0 auto' }}>
					Preview of your social media post. Use the export buttons to save the image.
				</canvas>
			</div>
			<div className="tool-actions">
				<button className="tool-button" type="button" onClick={exportPng}>Download PNG</button>
				<button className="tool-button secondary" type="button" onClick={exportSvg}>Download SVG</button>
			</div>
			<p className="tool-message" role="status">{message}</p>
			<p className="privacy-note">This tool creates a text-and-shape graphic locally; it does not upload content or add photos. Check text contrast and platform safe areas before publishing.</p>
		</div>
	);
}
