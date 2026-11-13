import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(scriptDirectory);
const modelDirectory = path.join(projectDirectory, 'models-source');
const mebibyte = 1024 * 1024;
const models = [
	{
		name: 'u2netp.onnx',
		url: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
		minimumBytes: 3.5 * mebibyte,
		maximumBytes: 6 * mebibyte,
	},
	{
		name: 'isnet-general-use-fp16.onnx',
		url: 'https://huggingface.co/onnx-community/ISNet-ONNX/resolve/main/onnx/model_fp16.onnx',
		minimumBytes: 80 * mebibyte,
		maximumBytes: 95 * mebibyte,
	},
];

function isPlausibleSize(bytes, model) {
	return bytes >= model.minimumBytes && bytes <= model.maximumBytes;
}

async function sha256File(filePath) {
	const hash = createHash('sha256');
	for await (const chunk of createReadStream(filePath)) hash.update(chunk);
	return hash.digest('hex');
}

function formatMebibytes(bytes) {
	return `${(bytes / mebibyte).toFixed(2)} MiB`;
}

async function reportModel(model, filePath, size) {
	console.log(`${model.name}: ${formatMebibytes(size)}; SHA-256 ${await sha256File(filePath)}`);
}

async function fetchModel(model) {
	const destination = path.join(modelDirectory, model.name);
	const temporaryFile = `${destination}.download`;

	try {
		const existing = await stat(destination).catch((error) => {
			if (error.code === 'ENOENT') return null;
			throw error;
		});
		if (existing && isPlausibleSize(existing.size, model)) {
			console.log(`${model.name}: already present (${formatMebibytes(existing.size)}); skipping download.`);
			await reportModel(model, destination, existing.size);
			return;
		}
		if (existing) await rm(destination);

		console.log(`Downloading ${model.name} from ${model.url}`);
		const response = await fetch(model.url, { redirect: 'follow' });
		if (!response.ok) {
			throw new Error(`Download failed for ${model.name}: HTTP ${response.status} ${response.statusText}.`);
		}
		if (!response.body) throw new Error(`Download failed for ${model.name}: the response had no file body.`);

		const expectedBytes = Number(response.headers.get('content-length')) || 0;
		const output = createWriteStream(temporaryFile, { flags: 'w' });
		let receivedBytes = 0;
		let lastReportedBytes = 0;
		await pipeline(
			response.body,
			new Transform({
				transform(chunk, _encoding, callback) {
				receivedBytes += chunk.byteLength;
				if (receivedBytes - lastReportedBytes >= 1024 * 1024 || (expectedBytes > 0 && receivedBytes === expectedBytes)) {
					const progress = expectedBytes > 0
						? `${formatMebibytes(receivedBytes)} / ${formatMebibytes(expectedBytes)} (${Math.min(100, receivedBytes / expectedBytes * 100).toFixed(1)}%)`
						: `${formatMebibytes(receivedBytes)} downloaded`;
					console.log(`  ${model.name}: ${progress}`);
					lastReportedBytes = receivedBytes;
				}
					callback(null, chunk);
				},
			}),
			output,
		);

		if (!isPlausibleSize(receivedBytes, model)) {
			await rm(temporaryFile, { force: true });
			throw new Error(
				`${model.name} downloaded with an unexpected size (${formatMebibytes(receivedBytes)}). `
				+ 'Use the manual fallback in models-source/README.md.',
			);
		}

		await rename(temporaryFile, destination);
		await reportModel(model, destination, receivedBytes);
	} catch (error) {
		await rm(temporaryFile, { force: true });
		throw error;
	}
}

async function main() {
	await mkdir(modelDirectory, { recursive: true });
	for (const model of models) await fetchModel(model);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
});
