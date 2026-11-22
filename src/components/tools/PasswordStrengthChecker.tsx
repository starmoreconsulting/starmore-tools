import { useState } from 'react';
import { assessPasswordStrength } from '../../engines/password-strength';

export default function PasswordStrengthChecker() {
	const [password, setPassword] = useState('');
	const [visible, setVisible] = useState(false);
	const assessment = assessPasswordStrength(password);

	return (
		<div>
			<div className="calc-field">
				<label htmlFor="password-strength-input">Password to check</label>
				<input
					id="password-strength-input"
					type={visible ? 'text' : 'password'}
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					autoComplete="off"
					autoCapitalize="none"
					spellCheck={false}
					aria-describedby="password-strength-privacy"
					placeholder="Enter a password"
				/>
			</div>
			<div className="tool-actions">
				<button
					className="tool-button secondary"
					type="button"
					onClick={() => setVisible(!visible)}
					aria-label={visible ? 'Hide password' : 'Show password'}
					aria-pressed={visible}
				>
					{visible ? 'Hide password' : 'Show password'}
				</button>
			</div>

			<section className="calc-result-grid" aria-live="polite" aria-label="Password strength assessment">
				<div className="calc-result featured">
					<span className="calc-label">ESTIMATED STRENGTH</span>
					<strong>{assessment.label}</strong>
					<progress
						max={5}
						value={assessment.score}
						aria-label={`Strength score: ${assessment.score} out of 5`}
					/>
				</div>
				<div className="calc-result">
					<span className="calc-label">LENGTH</span>
					<strong>{assessment.length} characters</strong>
				</div>
			</section>

			<ul className="tool-feedback-list" aria-label="Suggestions">
				{assessment.feedback.map((item) => <li key={item}>{item}</li>)}
			</ul>
			<p className="tool-message" id="password-strength-privacy">
				This is a local heuristic, not a breach check or a guarantee of security. Your password is not uploaded or saved.
			</p>
		</div>
	);
}
