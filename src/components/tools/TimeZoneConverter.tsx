import { useEffect, useMemo, useState } from 'react';
import { formatInTimeZone, formatUtcOffset, getTimeZones, localTimeToInstant, parseLocalDateTime } from '../../engines/time-zone';

const timeZones = getTimeZones();
const defaultDestinations = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];

function getDefaultSource() {
	try {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		return timeZones.includes(zone) ? zone : 'UTC';
	} catch {
		return 'UTC';
	}
}

function matchingZones(query: string, selected: string[] = []) {
	const search = query.trim().toLowerCase();
	if (!search) return [];
	return timeZones.filter((zone) => !selected.includes(zone) && zone.toLowerCase().includes(search)).slice(0, 12);
}

export default function TimeZoneConverter() {
	const [date, setDate] = useState('');
	const [time, setTime] = useState('');
	const [sourceZone, setSourceZone] = useState('UTC');
	const [sourceSearch, setSourceSearch] = useState('');
	const [destinationSearch, setDestinationSearch] = useState('');
	const [destinations, setDestinations] = useState(defaultDestinations);

	useEffect(() => {
		setSourceZone(getDefaultSource());
	}, []);

	const local = parseLocalDateTime(date, time);
	const conversion = useMemo(
		() => local && sourceZone ? localTimeToInstant(local, sourceZone) : null,
		[date, time, sourceZone],
	);
	const results = useMemo(() => conversion
		? destinations.map((zone) => ({
			zone,
			localTime: formatInTimeZone(conversion.timestamp, zone),
			offset: formatUtcOffset(conversion.timestamp, zone),
		}))
		: [], [conversion?.timestamp, destinations]);

	const sourceMatches = matchingZones(sourceSearch);
	const destinationMatches = matchingZones(destinationSearch, destinations);
	const ready = date.trim() !== '' && time.trim() !== '' && local !== null;

	return (
		<div>
			<div className="calc-fields">
				<div className="calc-field">
					<label htmlFor="timezone-date">Date</label>
					<input id="timezone-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
				</div>
				<div className="calc-field">
					<label htmlFor="timezone-time">Time</label>
					<input id="timezone-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
				</div>
			</div>
			<div className="timezone-control">
				<label htmlFor="timezone-source-search">Source time zone</label>
				<p className="inline-note">Current: <strong>{sourceZone}</strong></p>
				<input id="timezone-source-search" type="search" value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Search zones, e.g. London or New_York" autoComplete="off" />
				{sourceMatches.length > 0 && (
					<ul className="timezone-results" aria-label="Matching source time zones">
						{sourceMatches.map((zone) => (
							<li key={zone}>
								<button type="button" className="timezone-zone-button" onClick={() => { setSourceZone(zone); setSourceSearch(''); }}>{zone}</button>
							</li>
						))}
					</ul>
				)}
			</div>
			<div className="timezone-control">
				<label htmlFor="timezone-destination-search">Add destination time zones</label>
				<input id="timezone-destination-search" type="search" value={destinationSearch} onChange={(event) => setDestinationSearch(event.target.value)} placeholder="Search zones, e.g. Tokyo or Europe" autoComplete="off" />
				{destinationMatches.length > 0 && (
					<ul className="timezone-results" aria-label="Matching destination time zones">
						{destinationMatches.map((zone) => (
							<li key={zone}>
								<button type="button" className="timezone-zone-button" onClick={() => {
									setDestinations([...destinations, zone]);
									setDestinationSearch('');
								}}>+ {zone}</button>
							</li>
						))}
					</ul>
				)}
			</div>
			<div className="timezone-selected" aria-label="Selected destination time zones">
				{destinations.map((zone) => (
					<span className="timezone-chip" key={zone}>
						{zone}
						<button type="button" aria-label={`Remove ${zone}`} onClick={() => setDestinations(destinations.filter((item) => item !== zone))}>×</button>
					</span>
				))}
			</div>
			<div className="timezone-output" aria-live="polite">
				{results.map((result) => (
					<div className="timezone-output-card" key={result.zone}>
						<div>
							<strong>{result.zone}</strong>
							<span>{result.offset ?? 'UTC offset unavailable'}</span>
						</div>
						<p>{result.localTime ?? 'Could not format this time zone.'}</p>
					</div>
				))}
			</div>
			<p className={`tool-message${ready && !conversion ? ' error' : ''}`} role="status">
				{date.trim() === '' || time.trim() === '' ? 'Choose a local date and time to see conversions.'
					: !local ? 'Enter a valid calendar date and time.'
						: !conversion ? 'That local time does not exist in the selected zone because of a daylight saving clock change.'
							: conversion.ambiguous ? 'This local time occurs twice because of a clock change; the earlier occurrence is used.'
								: 'Time-zone rules, including daylight saving, are applied by the browser’s Intl API.'}
			</p>
			<p className="inline-note">Time-zone conversion runs locally in your browser. The searchable list uses IANA time-zone names.</p>
		</div>
	);
}
