import { useEffect, useState } from 'react';
import { createTextDownload } from '../../engines/notepad';

const STORAGE_KEY = 'starmore-notepad-v1';

export default function Notepad() {
	const [title, setTitle] = useState('');
	const [text, setText] = useState('');
	const [message, setMessage] = useState('');

	useEffect(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as { title?: string; text?: string };
			setTitle(saved.title || '');
			setText(saved.text || '');
		} catch {
			setMessage('Could not restore the previous local note.');
		}
	}, []);

	useEffect(() => {
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, text })); }
		catch { setMessage('Could not autosave in this browser. Download a copy before closing.'); }
	}, [title, text]);

	const downloadText = () => {
		const download = createTextDownload(text, title);
		const url = URL.createObjectURL(download.blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = download.filename;
		link.click();
		URL.revokeObjectURL(url);
		setMessage(`Downloaded ${download.filename}.`);
	};

	return (
		<div>
			<div className="calc-field"><label htmlFor="notepad-title">Document title</label><input id="notepad-title" type="text" value={title} onInput={(event) => { setTitle(event.currentTarget.value); setMessage(''); }} placeholder="Untitled note" /></div>
						<div className="calc-field"><label htmlFor="notepad-text">Your note</label><textarea id="notepad-text" value={text} onInput={(event) => { setText(event.currentTarget.value); setMessage(''); }} placeholder="Start typing..." /></div>
			<div className="stats-row" aria-live="polite"><span><strong>{Array.from(text).length}</strong> characters</span><span><strong>{text.trim() ? text.trim().split(/\s+/).length : 0}</strong> words</span></div>
			<div className="tool-actions"><button className="tool-button" type="button" onClick={downloadText}>Download .txt</button><button className="tool-button secondary" type="button" onClick={() => { setTitle(''); setText(''); setMessage('New local note ready.'); }}>New note</button></div>
			<p className="tool-message" role="status">{message || 'Autosaved in this browser; text stays on your device until you download or share it.'}</p>
		</div>
	);
}
