import { copyFile, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = path.join(root, 'node_modules', 'onnxruntime-web', 'dist');
const outputDirectory = path.join(root, 'public', 'ort');
const maximumBytes = 25 * 1024 * 1024;
const requiredFiles = [
	'ort.wasm.min.mjs',
	'ort-wasm-simd-threaded.mjs',
	'ort-wasm-simd-threaded.wasm',
];
const copied = [];

await rm(outputDirectory, { recursive: true, force: true });
for (const filename of requiredFiles) {
	const sourcePath = path.join(sourceDirectory, filename);
	const destinationPath = path.join(outputDirectory, filename);
	const size = (await stat(sourcePath)).size;
	if (size >= maximumBytes) {
		throw new Error(`ONNX Runtime asset ${filename} is ${size} bytes; each self-hosted file must be under 25 MiB.`);
	}
	await mkdir(outputDirectory, { recursive: true });
	await copyFile(sourcePath, destinationPath);
	copied.push({ path: filename, size });
}

for (const asset of copied) {
	console.log(`${asset.path}: ${asset.size} bytes`);
}
