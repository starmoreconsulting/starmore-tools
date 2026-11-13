import { createHash } from 'node:crypto';
import { mkdir, open, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = path.join(root, 'models-source');
const outputDirectory = path.join(root, 'public', 'models');
const mebibyte = 1024 * 1024;
const partSize = 20 * mebibyte;
const maximumOutputBytes = 24 * mebibyte;

const models = [
	{
		name: 'u2netp',
		filename: 'u2netp.onnx',
		sourceUrl: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
		license: 'Apache-2.0 weights (U²-Net); MIT ONNX export (rembg)',
		provenance: [
			'Weights by xuebinqin/U-2-Net under Apache-2.0.',
			'ONNX export distributed by rembg release v0.0.0 under MIT.',
		],
		expectedSha256: '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8',
		inputSize: { width: 320, height: 320 },
		preprocessing: {
			color: 'RGB',
			resize: '320 x 320',
			scale: 'divide by the per-image maximum (normally 255)',
			normalize: {
				mean: [0.485, 0.456, 0.406],
				std: [0.229, 0.224, 0.225],
				formula: '(channel - mean) / std',
			},
			source: 'rembg v0.0.0 src/rembg/u2net/detect.py preprocess() and src/rembg/u2net/data_loader.py ToTensorLab(flag=0)',
		},
		outputNormalization: 'Per-image min-max normalization',
	},
	{
		name: 'isnet',
		filename: 'isnet-general-use-fp16.onnx',
		sourceUrl: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx',
		license: 'Apache-2.0 weights (DIS); MIT ONNX export (rembg)',
		provenance: [
			'Weights by xuebinqin/DIS under Apache-2.0.',
			'The fp32 ONNX export is distributed by rembg under MIT.',
			'fp16 model converted locally from the approved rembg fp32 export; auxiliary outputs removed.',
		],
		expectedSha256: '1e00f2f0b23dea1b687ff90652263144fdb98af942aaa0cae8630c49159b18f0',
		sourceModel: {
			filename: 'isnet-general-use-fp32.onnx',
			bytes: 178648008,
			sha256: '60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a',
		},
		inputSize: { width: 1024, height: 1024 },
		preprocessing: {
			color: 'RGB',
			resize: '1024 x 1024',
			scale: 'x / 255 - 0.5',
			source: 'Starmore Tools model configuration supplied for this IS-Net export',
		},
		outputNormalization: 'Per-image min-max normalization',
	},
];

function sha256(buffer) {
	return createHash('sha256').update(buffer).digest('hex');
}

async function prepareModel(model) {
	const sourcePath = path.join(sourceDirectory, model.filename);
	const sourceStat = await stat(sourcePath).catch((error) => {
		if (error.code === 'ENOENT') {
			throw new Error(`Missing ${sourcePath}. Fetch or convert the approved local model before preparing assets.`);
		}
		throw error;
	});
	if (model.sourceModel) {
		const provenancePath = path.join(sourceDirectory, model.sourceModel.filename);
		const provenanceStat = await stat(provenancePath).catch((error) => {
			if (error.code === 'ENOENT') {
				throw new Error(`Missing verified source model ${provenancePath}.`);
			}
			throw error;
		});
		const provenanceHash = createHash('sha256');
		const provenanceFile = await open(provenancePath, 'r');
		try {
			const buffer = Buffer.allocUnsafe(1024 * 1024);
			let position = 0;
			while (position < provenanceStat.size) {
				const { bytesRead } = await provenanceFile.read(buffer, 0, buffer.length, position);
				if (bytesRead === 0) break;
				provenanceHash.update(buffer.subarray(0, bytesRead));
				position += bytesRead;
			}
		} finally {
			await provenanceFile.close();
		}
		if (
			provenanceStat.size !== model.sourceModel.bytes
			|| provenanceHash.digest('hex') !== model.sourceModel.sha256
		) {
			throw new Error(`The approved fp32 source ${model.sourceModel.filename} failed its recorded size or SHA-256 check.`);
		}
	}

	const modelOutputDirectory = path.join(outputDirectory, model.name);
	await rm(modelOutputDirectory, { recursive: true, force: true });
	await mkdir(modelOutputDirectory, { recursive: true });

	const parts = [];
	const source = await open(sourcePath, 'r');
	try {
		for (let offset = 0, index = 0; offset < sourceStat.size; index += 1) {
			const bytesToRead = Math.min(partSize, sourceStat.size - offset);
			const buffer = Buffer.allocUnsafe(bytesToRead);
			const { bytesRead } = await source.read(buffer, 0, bytesToRead, offset);
			if (bytesRead !== bytesToRead) throw new Error(`Could not read all bytes from ${model.filename}.`);

			const partName = sourceStat.size <= partSize
				? model.filename
				: `part-${String(index).padStart(3, '0')}.bin`;
			const partPath = path.join(modelOutputDirectory, partName);
			await writeFile(partPath, buffer);
			if (bytesRead >= maximumOutputBytes) {
				throw new Error(`${partPath} is at least 24 MiB; model output parts must be smaller.`);
			}
			parts.push({ file: partName, bytes: bytesRead, sha256: sha256(buffer) });
			offset += bytesRead;
		}
	} finally {
		await source.close();
	}

	const fullHash = createHash('sha256');
	const modelFile = await open(sourcePath, 'r');
	try {
		const buffer = Buffer.allocUnsafe(1024 * 1024);
		let position = 0;
		while (position < sourceStat.size) {
			const { bytesRead } = await modelFile.read(buffer, 0, buffer.length, position);
			if (bytesRead === 0) break;
			fullHash.update(buffer.subarray(0, bytesRead));
			position += bytesRead;
		}
	} finally {
		await modelFile.close();
	}

	const modelHash = fullHash.digest('hex');
	if (model.expectedSha256 && modelHash !== model.expectedSha256) {
		throw new Error(`${model.filename} failed its recorded SHA-256 check.`);
	}
	const manifest = {
		name: model.name,
		filename: model.filename,
		license: model.license,
		provenance: model.provenance,
		sourceUrl: model.sourceUrl,
		totalBytes: sourceStat.size,
		sha256: modelHash,
		...(model.sourceModel ? {
			sourceBytes: model.sourceModel.bytes,
			sourceSha256: model.sourceModel.sha256,
		} : {}),
		inputSize: model.inputSize,
		preprocessing: model.preprocessing,
		outputNormalization: model.outputNormalization,
		parts,
	};
	await writeFile(
		path.join(modelOutputDirectory, 'manifest.json'),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);

	console.log(`${model.name}: ${sourceStat.size} bytes; SHA-256 ${manifest.sha256}`);
	for (const part of parts) {
		console.log(`  ${part.file}: ${part.bytes} bytes; SHA-256 ${part.sha256}`);
	}
}

await mkdir(outputDirectory, { recursive: true });
for (const model of models) await prepareModel(model);
