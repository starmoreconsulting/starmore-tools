import { socialSizesLastChecked, socialSizePresets, socialSizeSourceNote, socialSizeSources } from '../../data/social-sizes';

const sourceById = new Map(socialSizeSources.map((source) => [source.id, source]));

export default function SocialMediaImageSizeGuide() {
	const platforms = [...new Set(socialSizePresets.map((preset) => preset.platform))];

	return (
		<div>
			<p className="inline-note">Current-known social image canvas presets · Dimensions in pixels · Data last checked: {socialSizesLastChecked}</p>
			<p className="privacy-note">{socialSizeSourceNote}</p>
			{platforms.map((platform) => {
				const presets = socialSizePresets.filter((preset) => preset.platform === platform);
				const source = sourceById.get(presets[0]?.sourceId ?? '');
				return (
					<section key={platform} aria-labelledby={`social-size-${platform.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} style={{ marginTop: 22 }}>
						<h3 id={`social-size-${platform.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{platform}</h3>
						<div style={{ overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 430 }}>
								<thead><tr>
									<th scope="col" style={{ textAlign: 'left', padding: '9px 10px' }}>Placement</th>
									<th scope="col" style={{ textAlign: 'left', padding: '9px 10px' }}>Canvas size</th>
									<th scope="col" style={{ textAlign: 'left', padding: '9px 10px' }}>Shape</th>
								</tr></thead>
								<tbody>
									{presets.map((preset) => (
										<tr key={preset.id}>
											<th scope="row" style={{ textAlign: 'left', padding: '9px 10px' }}>{preset.name}</th>
											<td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>{preset.width.toLocaleString()} × {preset.height.toLocaleString()} px</td>
											<td style={{ padding: '9px 10px' }}>{preset.width === preset.height ? 'Square' : preset.width > preset.height ? 'Landscape' : 'Portrait'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{source && <p className="inline-note" style={{ marginTop: 6 }}>
							Source to verify current placement guidance: <a href={source.url} rel="noreferrer">{source.label}</a>. The link points to the platform help center, not a guarantee that every listed recommendation appears there verbatim.
						</p>}
					</section>
				);
			})}
			<p className="privacy-note" style={{ marginTop: 22 }}>These sizes are starting canvases, not image-processing presets or platform guarantees. Posts may be cropped or displayed differently across feeds, devices, and account types. Use the platform’s current help guidance and keep important content away from edges.</p>
		</div>
	);
}
