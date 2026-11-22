import { PDFArray, PDFDict, PDFDocument, PDFHexString, PDFName, PDFRawStream, PDFRef, PDFString } from 'pdf-lib';

const PADDING = new Uint8Array([
	0x28, 0xBF, 0x4E, 0x5E, 0x4E, 0x75, 0x8A, 0x41,
	0x64, 0x00, 0x4E, 0x56, 0xFF, 0xFA, 0x01, 0x08,
	0x2E, 0x2E, 0x00, 0xB6, 0xD0, 0x68, 0x3E, 0x80,
	0x2F, 0x0C, 0xA9, 0xFE, 0x64, 0x53, 0x69, 0x7A,
]);

function equal(a: Uint8Array, b: Uint8Array) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
function numberValue(value: unknown, fallback = 0) { if (!value) return fallback; const candidate = value as { asNumber?: () => number }; return typeof candidate.asNumber === 'function' ? candidate.asNumber() : Number(String(value)); }
function extractBytes(value: unknown): Uint8Array | null {
	if (value instanceof PDFHexString) return value.asBytes();
	if (value instanceof PDFString) return value.asBytes();
	if (!value) return null;
	const text = String(value);
	if (text.startsWith('<') && text.endsWith('>')) {
		const hex = text.slice(1, -1).replace(/\s/g, '');
		const bytes = new Uint8Array(hex.length / 2); for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16); return bytes;
	}
	return null;
}

export async function detectPdfEncryption(pdfBytes: Uint8Array) {
	const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
	const trailer = pdfDoc.context.trailerInfo;
	const encryptRef = trailer.Encrypt;
	if (!encryptRef) return { encrypted: false as const };
	const encryptDict = encryptRef instanceof PDFRef ? pdfDoc.context.lookup(encryptRef) : encryptRef;
	if (!(encryptDict instanceof PDFDict)) throw new Error('Could not read the PDF encryption dictionary.');
	const version = numberValue(encryptDict.get(PDFName.of('V')));
	const revision = numberValue(encryptDict.get(PDFName.of('R')));
	if (version === 5 && revision === 6) {
		return { encrypted: true as const, supported: true as const, aes128: false as const, algorithm: 'AES-256', version, revision };
	}
	if (version <= 3 && revision >= 2 && revision <= 4) {
		return { encrypted: true as const, supported: true as const, aes128: false as const, algorithm: 'RC4', version, revision };
	}
	if (version === 4 && revision === 4) {
		const cryptFilters = encryptDict.lookup(PDFName.of('CF'), PDFDict);
		const streamFilter = encryptDict.lookup(PDFName.of('StmF'), PDFName);
		const stringFilter = encryptDict.lookup(PDFName.of('StrF'), PDFName);
		const streamCryptFilter = streamFilter && cryptFilters?.lookup(streamFilter, PDFDict);
		const stringCryptFilter = stringFilter && cryptFilters?.lookup(stringFilter, PDFDict);
		const streamMethod = streamCryptFilter?.lookup(PDFName.of('CFM'), PDFName)?.toString();
		const stringMethod = stringCryptFilter?.lookup(PDFName.of('CFM'), PDFName)?.toString();
		if (streamMethod !== '/AESV2' || stringMethod !== '/AESV2') {
			return { encrypted: true as const, supported: false as const, aes128: false as const, algorithm: `V=${version}, R=${revision}`, version, revision };
		}
		const length = numberValue(encryptDict.get(PDFName.of('Length')), 128);
		return { encrypted: true as const, supported: true as const, aes128: true as const, algorithm: 'AES-128', version, revision, keyLength: length };
	}
	return { encrypted: true as const, supported: false as const, aes128: false as const, algorithm: `V=${version}, R=${revision}`, version, revision };
}

async function md5AndRc4() {
	const module = await import('@pdfsmaller/pdf-decrypt');
	return { md5: module.md5 as (data: Uint8Array) => Uint8Array, RC4: module.RC4 as new (key: Uint8Array) => { process(data: Uint8Array): Uint8Array } };
}

async function aes128CbcDecrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array) {
	const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-CBC' }, false, ['decrypt']);
	const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, data);
	return new Uint8Array(decrypted);
}

export async function decryptPdfAes128(pdfBytes: Uint8Array, password: string) {
	const { md5, RC4 } = await md5AndRc4();
	const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
	const context = pdfDoc.context;
	const encryptRef = context.trailerInfo.Encrypt;
	if (!encryptRef) throw new Error('This PDF is not encrypted.');
	const encryptDict = encryptRef instanceof PDFRef ? context.lookup(encryptRef) : encryptRef;
	if (!(encryptDict instanceof PDFDict)) throw new Error('Could not read the PDF encryption dictionary.');

	const version = numberValue(encryptDict.get(PDFName.of('V')));
	const revision = numberValue(encryptDict.get(PDFName.of('R')));
	if (version !== 4 || revision !== 4) throw new Error('This is not a supported AES-128 (V=4, R=4) PDF.');
	const cryptFilters = encryptDict.lookup(PDFName.of('CF'), PDFDict);
	const streamFilter = encryptDict.lookup(PDFName.of('StmF'), PDFName);
	const stringFilter = encryptDict.lookup(PDFName.of('StrF'), PDFName);
	const streamMethod = streamFilter && cryptFilters?.lookup(streamFilter, PDFDict)?.lookup(PDFName.of('CFM'), PDFName)?.toString();
	const stringMethod = stringFilter && cryptFilters?.lookup(stringFilter, PDFDict)?.lookup(PDFName.of('CFM'), PDFName)?.toString();
	if (streamMethod !== '/AESV2' || stringMethod !== '/AESV2') {
		throw new Error('This PDF uses unsupported V=4, R=4 crypt filters. Only AESV2 for both strings and streams is supported.');
	}

	const keyLength = numberValue(encryptDict.get(PDFName.of('Length')), 128) / 8;
	const permissions = numberValue(encryptDict.get(PDFName.of('P')));
	const ownerKey = extractBytes(encryptDict.get(PDFName.of('O')));
	const userKey = extractBytes(encryptDict.get(PDFName.of('U')));
	if (!ownerKey || !userKey) throw new Error('Could not read PDF password values.');

	let fileId = new Uint8Array(0);
	const idArray = context.trailerInfo.ID;
	if (idArray instanceof PDFArray) fileId = extractBytes(idArray.lookup(0)) || new Uint8Array(0);

	const encryptMetadataValue = encryptDict.get(PDFName.of('EncryptMetadata'));
	const encryptMetadata = encryptMetadataValue ? String(encryptMetadataValue) !== 'false' : true;
	const padPassword = (input: string) => {
		const bytes = new TextEncoder().encode(input);
		const padded = new Uint8Array(32); padded.set(bytes.length >= 32 ? bytes.slice(0, 32) : bytes);
		if (bytes.length < 32) padded.set(PADDING.slice(0, 32 - bytes.length), bytes.length);
		return padded;
	};
	const computeFileKey = (passwordBytes: Uint8Array) => {
		const input = new Uint8Array(passwordBytes.length + ownerKey.length + 4 + fileId.length + (encryptMetadata ? 0 : 4));
		let offset = 0;
		input.set(passwordBytes, offset); offset += passwordBytes.length;
		input.set(ownerKey, offset); offset += ownerKey.length;
		input[offset++] = permissions & 0xff; input[offset++] = (permissions >> 8) & 0xff; input[offset++] = (permissions >> 16) & 0xff; input[offset++] = (permissions >> 24) & 0xff;
		input.set(fileId, offset); offset += fileId.length;
		if (!encryptMetadata) { input[offset++] = 0xff; input[offset++] = 0xff; input[offset++] = 0xff; input[offset++] = 0xff; }
		let hash = md5(input); for (let i = 0; i < 50; i++) hash = md5(hash.slice(0, keyLength));
		return hash.slice(0, keyLength);
	};
	const validateUser = (recoveredUserPassword: Uint8Array) => {
		const key = computeFileKey(recoveredUserPassword);
		const hashInput = new Uint8Array(PADDING.length + fileId.length); hashInput.set(PADDING); hashInput.set(fileId, PADDING.length);
		let result = new RC4(key).process(md5(hashInput));
		for (let i = 1; i <= 19; i++) { const iterKey = new Uint8Array(key.length); for (let j = 0; j < key.length; j++) iterKey[j] = key[j] ^ i; result = new RC4(iterKey).process(result); }
		return equal(result.slice(0, 16), userKey.slice(0, 16)) ? key : null;
	};

	let fileKey = validateUser(padPassword(password));
	if (!fileKey) {
		let ownerHash = md5(padPassword(password));
		for (let i = 0; i < 50; i++) ownerHash = md5(ownerHash);
		const ownerKey16 = ownerHash.slice(0, keyLength);
		let recovered = new Uint8Array(ownerKey);
		for (let i = 19; i >= 0; i--) { const iterKey = new Uint8Array(ownerKey16.length); for (let j = 0; j < ownerKey16.length; j++) iterKey[j] = ownerKey16[j] ^ i; recovered = new RC4(iterKey).process(recovered); }
		fileKey = validateUser(recovered);
	}
	if (!fileKey) throw new Error('Incorrect password');

	const decryptObjectKey = (objectNumber: number, generationNumber: number) => {
		const input = new Uint8Array(fileKey!.length + 5); input.set(fileKey!);
		input[fileKey!.length] = objectNumber & 0xff; input[fileKey!.length + 1] = (objectNumber >> 8) & 0xff; input[fileKey!.length + 2] = (objectNumber >> 16) & 0xff;
		input[fileKey!.length + 3] = generationNumber & 0xff; input[fileKey!.length + 4] = (generationNumber >> 8) & 0xff;
		const keyInput = new Uint8Array(input.length + 4);
		keyInput.set(input.subarray(0, fileKey!.length + 5));
		keyInput.set([0x73, 0x41, 0x6c, 0x54], fileKey!.length + 5);
		return md5(keyInput).slice(0, Math.min(fileKey!.length + 9, 16));
	};
	const decryptBlob = async (data: Uint8Array, objectNumber: number, generationNumber: number) => {
		if (data.length < 32 || data.length % 16 !== 0) return data;
		const iv = data.slice(0, 16); const ciphertext = data.slice(16);
		if (ciphertext.length === 0 || ciphertext.length % 16 !== 0) return data;
		return aes128CbcDecrypt(ciphertext, decryptObjectKey(objectNumber, generationNumber), iv);
	};
	const decryptStrings = async (obj: unknown, objectNumber: number, generationNumber: number): Promise<void> => {
		if (obj instanceof PDFString) { obj.value = Array.from(await decryptBlob(obj.asBytes(), objectNumber, generationNumber)).map((byte) => String.fromCharCode(byte)).join(''); }
		else if (obj instanceof PDFHexString) { const bytes = await decryptBlob(obj.asBytes(), objectNumber, generationNumber); obj.value = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase(); }
		else if (obj instanceof PDFDict) { for (const [key, value] of obj.entries()) { const keyName = key.asString(); if (keyName !== '/Length' && keyName !== '/Filter' && keyName !== '/DecodeParms') await decryptStrings(value, objectNumber, generationNumber); } }
		else if (obj instanceof PDFArray) { for (const element of obj.asArray()) await decryptStrings(element, objectNumber, generationNumber); }
	};

	for (const [ref, obj] of context.enumerateIndirectObjects()) {
		if (encryptRef instanceof PDFRef && ref.objectNumber === encryptRef.objectNumber) continue;
		const objectNumber = ref.objectNumber; const generationNumber = ref.generationNumber || 0;
		if (obj instanceof PDFDict && !(obj instanceof PDFRawStream) && obj.get(PDFName.of('Type'))?.toString() === '/Sig') continue;
		if (obj instanceof PDFRawStream) {
			const type = obj.dict.get(PDFName.of('Type'))?.toString();
			if (type === '/XRef' || type === '/Sig' || (type === '/Metadata' && !encryptMetadata)) continue;
			obj.contents = await decryptBlob(obj.contents, objectNumber, generationNumber);
			await decryptStrings(obj.dict, objectNumber, generationNumber);
		}
		else await decryptStrings(obj, objectNumber, generationNumber);
	}
	delete context.trailerInfo.Encrypt;
	return pdfDoc.save({ useObjectStreams: false });
}
