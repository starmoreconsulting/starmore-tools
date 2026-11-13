import { useState } from 'react';

const READING_WORDS_PER_MINUTE = 225;
const SPEAKING_WORDS_PER_MINUTE = 130;

function formatDuration(words: number, wordsPerMinute: number) {
	if (words === 0) return '0 min';
	const seconds = Math.ceil(words / wordsPerMinute * 60);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	if (minutes === 0) return `${remainingSeconds} sec`;
	return remainingSeconds === 0 ? `${minutes} min` : `${minutes} min ${remainingSeconds} sec`;
}

export default function ReadingTimeCalculator() {
	const [text, setText] = useState('');
	const words = text.trim().match(/\S+/g)?.length ?? 0;

	return (
		<div>
			<label htmlFor="reading-time-text">Your text</label>
			<textarea id="reading-time-text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste or type text here..." />
			<div className="calc-result-grid">
				<div className="calc-result">
					<span className="calc-label">WORDS</span>
					<strong>{words}</strong>
				</div>
				<div className="calc-result featured">
					<span className="calc-label">ESTIMATED READING TIME</span>
					<strong>{formatDuration(words, READING_WORDS_PER_MINUTE)}</strong>
					<small>{READING_WORDS_PER_MINUTE} words per minute</small>
				</div>
				<div className="calc-result">
					<span className="calc-label">ESTIMATED SPEAKING TIME</span>
					<strong>{formatDuration(words, SPEAKING_WORDS_PER_MINUTE)}</strong>
					<small>{SPEAKING_WORDS_PER_MINUTE} words per minute</small>
				</div>
			</div>
			<p className="privacy-note">Estimates use {READING_WORDS_PER_MINUTE} words per minute for reading and {SPEAKING_WORDS_PER_MINUTE} words per minute for speaking. Actual pace varies.</p>
		</div>
	);
}
