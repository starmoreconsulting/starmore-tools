import { useState } from 'react';
import { generateWebsiteStarter } from '../../engines/website-starter';

export default function WebsiteStarterCodeGenerator() {
	const [brand, setBrand] = useState('Starmore');
	const [title, setTitle] = useState('A clearer way to build good work');
	const [description, setDescription] = useState('A simple starter website for your brand.');
	const [primary, setPrimary] = useState('#356b54');
	const [background, setBackground] = useState('#f7f8f4');
	const [message, setMessage] = useState('');
	const result = generateWebsiteStarter({ brand, title, description, primary, background });

	const download = () => {
		const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
		const url = URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download='index.html'; link.click(); URL.revokeObjectURL(url); setMessage('Starter index.html downloaded.');
	};

	return (
		<div>
			<div className="calc-fields"><div className="calc-field"><label htmlFor="starter-brand">Brand name</label><input id="starter-brand" value={brand} onChange={(event)=>setBrand(event.target.value)} onInput={(event)=>setBrand(event.currentTarget.value)} /></div><div className="calc-field"><label htmlFor="starter-title">Hero title</label><input id="starter-title" value={title} onChange={(event)=>setTitle(event.target.value)} onInput={(event)=>setTitle(event.currentTarget.value)} /></div><div className="calc-field"><label htmlFor="starter-description">Description</label><textarea id="starter-description" value={description} onChange={(event)=>setDescription(event.target.value)} onInput={(event)=>setDescription(event.currentTarget.value)} /></div><div className="calc-field"><label htmlFor="starter-primary">Primary colour</label><input id="starter-primary" type="color" value={primary} onChange={(event)=>setPrimary(event.target.value)} onInput={(event)=>setPrimary(event.currentTarget.value)} /></div><div className="calc-field"><label htmlFor="starter-background">Background</label><input id="starter-background" type="color" value={background} onChange={(event)=>setBackground(event.target.value)} onInput={(event)=>setBackground(event.currentTarget.value)} /></div></div>
			<label>Live preview</label><iframe title="Website starter preview" className="signature-preview" srcDoc={result.html} />
			<label htmlFor="starter-html">HTML source</label><textarea id="starter-html" value={result.html} readOnly />
			<div className="tool-actions"><button className="tool-button" type="button" onClick={download}>Download index.html</button></div>
			<p className="tool-message" role="status">{message || 'Generated HTML and CSS run locally and contain no external framework dependencies.'}</p>
		</div>
	);
}
