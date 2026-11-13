export interface LocalDateTime {
	year: number;
	month: number;
	day: number;
	hour: number;
	minute: number;
}

const fallbackZones = [
	'Africa/Cairo', 'Africa/Johannesburg', 'America/Anchorage', 'America/Chicago', 'America/Denver',
	'America/Los_Angeles', 'America/Mexico_City', 'America/New_York', 'America/Phoenix', 'America/Sao_Paulo',
	'America/Toronto', 'America/Vancouver', 'Asia/Bangkok', 'Asia/Dubai', 'Asia/Hong_Kong',
	'Asia/Kolkata', 'Asia/Seoul', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Tokyo',
	'Australia/Adelaide', 'Australia/Brisbane', 'Australia/Melbourne', 'Australia/Perth',
	'Europe/Berlin', 'Europe/London', 'Europe/Paris', 'Pacific/Auckland', 'UTC',
];

export function getTimeZones(): string[] {
	const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
	const zones = intl.supportedValuesOf?.('timeZone');
	return [...new Set([...(zones ?? fallbackZones), 'UTC'])].sort((first, second) => first.localeCompare(second));
}

export function parseLocalDateTime(dateValue: string, timeValue: string): LocalDateTime | null {
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
	const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
	if (!dateMatch || !timeMatch) return null;
	const parts = {
		year: Number(dateMatch[1]),
		month: Number(dateMatch[2]),
		day: Number(dateMatch[3]),
		hour: Number(timeMatch[1]),
		minute: Number(timeMatch[2]),
	};
	if (parts.year < 1 || parts.month < 1 || parts.month > 12 || parts.day < 1 || parts.hour > 23 || parts.minute > 59) return null;
	const date = new Date(0);
	date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
	date.setUTCHours(parts.hour, parts.minute, 0, 0);
	if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() !== parts.month - 1 || date.getUTCDate() !== parts.day) return null;
	return parts;
}

function localPartsAt(timestamp: number, timeZone: string): LocalDateTime | null {
	try {
		const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23',
		});
		const parts = formatter.formatToParts(new Date(timestamp));
		const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
		const result = {
			year: Number(values.year),
			month: Number(values.month),
			day: Number(values.day),
			hour: Number(values.hour),
			minute: Number(values.minute),
		};
		return Object.values(result).every(Number.isFinite) ? result : null;
	} catch {
		return null;
	}
}

function sameLocalTime(first: LocalDateTime, second: LocalDateTime) {
	return first.year === second.year && first.month === second.month && first.day === second.day
		&& first.hour === second.hour && first.minute === second.minute;
}

function offsetAt(timestamp: number, formatter: Intl.DateTimeFormat): number | null {
	try {
		const parts = formatter.formatToParts(new Date(timestamp));
		const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
		const year = Number(values.year);
		const month = Number(values.month);
		const day = Number(values.day);
		const hour = Number(values.hour);
		const minute = Number(values.minute);
		const second = Number(values.second);
		const localDate = new Date(0);
		localDate.setUTCFullYear(year, month - 1, day);
		localDate.setUTCHours(hour, minute, second, 0);
		return localDate.getTime() - Math.floor(timestamp / 1000) * 1000;
	} catch {
		return null;
	}
}

export function localTimeToInstant(local: LocalDateTime, timeZone: string): { timestamp: number; ambiguous: boolean } | null {
	const wallDate = new Date(0);
	wallDate.setUTCFullYear(local.year, local.month - 1, local.day);
	wallDate.setUTCHours(local.hour, local.minute, 0, 0);
	const wallTimestamp = wallDate.getTime();
	if (!Number.isFinite(wallTimestamp)) return null;

	let offsetFormatter: Intl.DateTimeFormat;
	try {
		offsetFormatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		});
	} catch {
		return null;
	}

	const offsets = new Set<number>();
	for (let hours = -36; hours <= 36; hours += 3) {
		const offset = offsetAt(wallTimestamp + hours * 3_600_000, offsetFormatter);
		if (offset !== null) offsets.add(offset);
	}

	const matches = [...offsets]
		.map((offset) => wallTimestamp - offset)
		.filter((timestamp) => {
			const parts = localPartsAt(timestamp, timeZone);
			return parts !== null && sameLocalTime(parts, local);
		})
		.sort((first, second) => first - second);
	if (matches.length === 0) return null;
	return { timestamp: matches[0], ambiguous: matches.length > 1 };
}

export function formatInTimeZone(timestamp: number, timeZone: string): string | null {
	try {
		return new Intl.DateTimeFormat(undefined, {
			timeZone,
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short',
		}).format(new Date(timestamp));
	} catch {
		return null;
	}
}

export function formatUtcOffset(timestamp: number, timeZone: string): string | null {
	try {
		const formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory-nu-latn', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		});
		const offset = offsetAt(timestamp, formatter);
		if (offset === null) return null;
		const minutes = Math.round(offset / 60_000);
		const sign = minutes >= 0 ? '+' : '−';
		const absolute = Math.abs(minutes);
		return `UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(absolute % 60).padStart(2, '0')}`;
	} catch {
		return null;
	}
}
