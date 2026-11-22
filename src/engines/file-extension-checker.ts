export type ExtensionRisk = 'standard' | 'caution' | 'high';

export interface ExtensionInfo {
	category: string;
	description: string;
	risk: ExtensionRisk;
}

export interface FileExtensionAssessment {
	fileName: string;
	baseName: string;
	extension: string;
	info: ExtensionInfo | null;
	isHiddenFile: boolean;
	hasTrailingDot: boolean;
	suspiciousDoubleExtension: boolean;
	warnings: string[];
}

const extensionInfo: Record<string, ExtensionInfo> = {
	pdf: { category: 'Document', description: 'Portable Document Format', risk: 'standard' },
	doc: { category: 'Document', description: 'Microsoft Word document (legacy)', risk: 'standard' },
	docx: { category: 'Document', description: 'Microsoft Word document', risk: 'standard' },
	rtf: { category: 'Document', description: 'Rich Text Format document', risk: 'standard' },
	txt: { category: 'Text', description: 'Plain text file', risk: 'standard' },
	csv: { category: 'Data', description: 'Comma-separated values', risk: 'standard' },
	xls: { category: 'Spreadsheet', description: 'Microsoft Excel workbook (legacy)', risk: 'standard' },
	xlsx: { category: 'Spreadsheet', description: 'Microsoft Excel workbook', risk: 'standard' },
	ppt: { category: 'Presentation', description: 'Microsoft PowerPoint presentation (legacy)', risk: 'standard' },
	pptx: { category: 'Presentation', description: 'Microsoft PowerPoint presentation', risk: 'standard' },
	odt: { category: 'Document', description: 'OpenDocument text document', risk: 'standard' },
	ods: { category: 'Spreadsheet', description: 'OpenDocument spreadsheet', risk: 'standard' },
	odp: { category: 'Presentation', description: 'OpenDocument presentation', risk: 'standard' },
	jpg: { category: 'Image', description: 'JPEG image', risk: 'standard' },
	jpeg: { category: 'Image', description: 'JPEG image', risk: 'standard' },
	png: { category: 'Image', description: 'PNG image', risk: 'standard' },
	gif: { category: 'Image', description: 'GIF image', risk: 'standard' },
	webp: { category: 'Image', description: 'WebP image', risk: 'standard' },
	svg: { category: 'Image', description: 'Scalable Vector Graphics image; may contain active content', risk: 'caution' },
	heic: { category: 'Image', description: 'High Efficiency Image Container', risk: 'standard' },
	mp3: { category: 'Audio', description: 'MP3 audio', risk: 'standard' },
	wav: { category: 'Audio', description: 'WAVE audio', risk: 'standard' },
	m4a: { category: 'Audio', description: 'MPEG-4 audio', risk: 'standard' },
	ogg: { category: 'Audio', description: 'Ogg audio', risk: 'standard' },
	mp4: { category: 'Video', description: 'MPEG-4 video', risk: 'standard' },
	mov: { category: 'Video', description: 'QuickTime video', risk: 'standard' },
	avi: { category: 'Video', description: 'AVI video', risk: 'standard' },
	mkv: { category: 'Video', description: 'Matroska video', risk: 'standard' },
	zip: { category: 'Archive', description: 'ZIP archive', risk: 'standard' },
	'7z': { category: 'Archive', description: '7-Zip archive', risk: 'standard' },
	rar: { category: 'Archive', description: 'RAR archive', risk: 'standard' },
	tar: { category: 'Archive', description: 'Tape archive', risk: 'standard' },
	gz: { category: 'Archive', description: 'Gzip-compressed file', risk: 'standard' },
	json: { category: 'Data', description: 'JavaScript Object Notation data', risk: 'standard' },
	xml: { category: 'Data', description: 'Extensible Markup Language data', risk: 'standard' },
	yaml: { category: 'Data', description: 'YAML data', risk: 'standard' },
	yml: { category: 'Data', description: 'YAML data', risk: 'standard' },
	html: { category: 'Web', description: 'HTML webpage; may contain active content', risk: 'caution' },
	htm: { category: 'Web', description: 'HTML webpage; may contain active content', risk: 'caution' },
	css: { category: 'Code', description: 'Cascading Style Sheets', risk: 'standard' },
	js: { category: 'Code', description: 'JavaScript source; may run as active code', risk: 'caution' },
	ts: { category: 'Code', description: 'TypeScript source code', risk: 'standard' },
	py: { category: 'Code', description: 'Python source; may run as active code', risk: 'caution' },
	java: { category: 'Code', description: 'Java source code', risk: 'standard' },
	c: { category: 'Code', description: 'C source code', risk: 'standard' },
	cpp: { category: 'Code', description: 'C++ source code', risk: 'standard' },
	rs: { category: 'Code', description: 'Rust source code', risk: 'standard' },
	sh: { category: 'Script', description: 'Shell script; may run as active code', risk: 'caution' },
	ps1: { category: 'Script', description: 'PowerShell script; may run as active code', risk: 'caution' },
	bat: { category: 'Script', description: 'Windows batch script; may run as active code', risk: 'caution' },
	cmd: { category: 'Script', description: 'Windows command script; may run as active code', risk: 'caution' },
	vbs: { category: 'Script', description: 'VBScript; may run as active code', risk: 'caution' },
	exe: { category: 'Executable', description: 'Windows executable program', risk: 'high' },
	msi: { category: 'Installer', description: 'Windows installer package', risk: 'high' },
	dll: { category: 'System file', description: 'Windows dynamic-link library', risk: 'high' },
	com: { category: 'Executable', description: 'DOS/Windows executable program', risk: 'high' },
	scr: { category: 'Executable', description: 'Windows screen saver executable', risk: 'high' },
	jar: { category: 'Executable', description: 'Java archive that may contain runnable code', risk: 'high' },
	app: { category: 'Application', description: 'macOS application bundle or package', risk: 'high' },
	dmg: { category: 'Disk image', description: 'macOS disk image that may contain applications', risk: 'caution' },
	apk: { category: 'Application', description: 'Android application package', risk: 'high' },
	iso: { category: 'Disk image', description: 'Optical disc image that may contain executable files', risk: 'caution' },
};

const compoundExtensions = ['tar.gz', 'tar.bz2', 'tar.xz'] as const;
const highRiskExtensions = new Set(['exe', 'msi', 'dll', 'com', 'scr', 'jar', 'app', 'apk']);
const disguiseExtensions = new Set([
	'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf',
	'jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'mp4', 'zip',
]);

export function assessFileExtension(input: string): FileExtensionAssessment {
	const fileName = input.trim();
	const baseName = fileName.split(/[\\/]/).pop() ?? '';
	const lowerName = baseName.toLowerCase();
	const isHiddenFile = lowerName.startsWith('.') && !lowerName.slice(1).includes('.');
	const hasTrailingDot = lowerName.endsWith('.') && lowerName.length > 1;
	const compoundExtension = compoundExtensions.find((extension) => lowerName.endsWith(`.${extension}`));
	const extension = isHiddenFile || !lowerName.includes('.')
		? ''
		: compoundExtension ?? lowerName.split('.').pop() ?? '';
	const info = compoundExtension
		? { category: 'Archive', description: 'Compressed tar archive', risk: 'standard' as const }
		: extensionInfo[extension] ?? null;
	const parts = lowerName.split('.');
	const finalExtension = parts.length > 1 ? parts.at(-1) ?? '' : '';
	const previousExtension = parts.length > 2 ? parts.at(-2) ?? '' : '';
	const suspiciousDoubleExtension = Boolean(
		highRiskExtensions.has(finalExtension) && disguiseExtensions.has(previousExtension),
	);

	const warnings: string[] = [];
	if (!fileName) warnings.push('Enter a filename to check its extension.');
	else if (!extension && isHiddenFile) warnings.push('This looks like a hidden dotfile; it has no file extension.');
	else if (!extension) warnings.push('No file extension was found.');
	if (hasTrailingDot) warnings.push('The filename ends with a dot, so the extension may be missing.');
	if (suspiciousDoubleExtension) {
		warnings.push(`This filename has two extensions. The final “.${finalExtension}” extension controls how many systems treat the file.`);
	}
	if (info?.risk === 'high' && !suspiciousDoubleExtension) {
		warnings.push('This extension is associated with executable or installable content. Only open files from sources you trust.');
	} else if (info?.risk === 'caution' && !suspiciousDoubleExtension) {
		warnings.push('Files of this type may contain active content. Open only when you trust the source.');
	}
	if (extension && !info) warnings.push('This extension is not in the built-in reference list; that does not necessarily mean the file is unsafe.');

	return {
		fileName,
		baseName,
		extension: extension ? `.${extension}` : '',
		info,
		isHiddenFile,
		hasTrailingDot,
		suspiciousDoubleExtension,
		warnings,
	};
}
