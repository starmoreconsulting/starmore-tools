import { useState, type CSSProperties } from 'react';

export default function PresentationTemplateDesigner() {
	const [brand, setBrand] = useState('Starmore');
	const [title, setTitle] = useState('Presentation title');
	const [subtitle, setSubtitle] = useState('A short presentation subtitle');
	const [colour, setColour] = useState('#356b54');
	const [message, setMessage] = useState('');

	const download = () => {
		const safe = /^#[0-9a-f]{6}$/i.test(colour) ? colour : '#356b54';
		const html = `<!doctype html><html><head><style>@page{size:16in 9in;margin:0}body{margin:0;font-family:Arial,sans-serif}.slide{width:16in;height:9in;box-sizing:border-box;padding:1.2in;background:linear-gradient(135deg,#fff 55%,${safe} 55%);display:flex;flex-direction:column;justify-content:center}.brand{color:${safe};font-weight:700}.title{max-width:9in;font-size:56px;margin:.25in 0}.subtitle{font-size:24px;color:#687269}</style></head><body><section class="slide"><div class="brand">${brand.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div><h1 class="title">${title.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</h1><p class="subtitle">${subtitle.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</p></section></body></html>`;
		const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
		const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href=url; link.download='presentation-template.html'; link.click(); URL.revokeObjectURL(url); setMessage('Presentation template HTML downloaded.');
	};

	return (
		<div>
			<div className="calc-fields"><div className="calc-field"><label htmlFor="presentation-brand">Brand name</label><input id="presentation-brand" value={brand} onChange={(event) => setBrand(event.target.value)} onInput={(event) => setBrand(event.currentTarget.value)} /></div><div className="calc-field"><label htmlFor="presentation-title">Title</label><input id="presentation-title" value={title} onChange={(event) => setTitle(event.target.value)} onInput={(event) => setTitle(event.currentTarget.value)} /></div><div className="calc-field"><label htmlFor="presentation-subtitle">Subtitle</label><input id="presentation-subtitle" value={subtitle} onChange={(event) => setSubtitle(event.target.value)} onInput={(event) => setSubtitle(event.currentTarget.value)} /></div><div className="calc-field"><label htmlFor="presentation-colour">Accent colour</label><input id="presentation-colour" type="color" value={colour} onChange={(event) => setColour(event.target.value)} onInput={(event) => setColour(event.currentTarget.value)} /></div></div>
			<div className="presentation-preview" style={{ '--presentation-accent': colour } as CSSProperties}><span className="presentation-brand">{brand}</span><h2>{title}</h2><p>{subtitle}</p></div>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={() => window.print()}>Print / Save PDF</button><button className="tool-button secondary" type="button" onClick={download}>Download HTML</button></div>
			<p className="tool-message" role="status">{message || 'This creates a branded 16:9 presentation cover template.'}</p>
		</div>
	);
}
