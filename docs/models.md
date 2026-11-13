# Background-removal model provenance

The model weights and ONNX files are served from this site only. Source ONNX files and converted models are local development inputs in `models-source/`; generated public parts are produced by `npm run models:prepare`.

| Model | Source URL | License and provenance | Size | SHA-256 |
|---|---|---|---:|---|
| U²-Netp weights | https://github.com/xuebinqin/U-2-Net | Apache-2.0; ONNX export distributed by rembg under MIT | 4,574,861 bytes (4.36 MiB) | `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8` |
| U²-Netp ONNX export | https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx | MIT; weights originate from U²-Net under Apache-2.0 | 4,574,861 bytes (4.36 MiB) | `309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8` |
| IS-Net weights | https://github.com/xuebinqin/DIS | Apache-2.0, per the DIS provenance supplied for this project | Included in the rembg ONNX export | See the verified ONNX hashes below |
| IS-Net original fp32 ONNX | https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx | MIT export by rembg; IS-Net weights by DIS under Apache-2.0 | 178,648,008 bytes (170.37 MiB) | `60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a` |
| IS-Net locally converted fp16 ONNX | Same approved rembg fp32 source above | Apache-2.0 weights / MIT rembg export; converted locally by Starmore Tools | 90,661,254 bytes (86.46 MiB) | `1e00f2f0b23dea1b687ff90652263144fdb98af942aaa0cae8630c49159b18f0` |

The fp16 file was converted from the hash-verified fp32 ONNX model with `onnxconverter-common`, retaining float32 input/output types and removing auxiliary outputs after the first matte output. The ONNX checker passed. The first output is selected at runtime for both models.

## Input preprocessing

- **U²-Netp:** RGB; resized to 320 × 320; divided by the per-image maximum (normally 255); channel-wise normalized with means `[0.485, 0.456, 0.406]` and standard deviations `[0.229, 0.224, 0.225]`. Confirmed in rembg v0.0.0 `src/rembg/u2net/detect.py` and `src/rembg/u2net/data_loader.py` (`ToTensorLab(flag=0)`).
- **IS-Net:** RGB; resized to 1024 × 1024; normalized as `x / 255 - 0.5`; the output matte is min-max normalized per image.

The generated manifests in `public/models/{u2netp,isnet}/manifest.json` record the per-part sizes and SHA-256 values used by the browser loader. Model and ONNX Runtime notices are in `public/licenses/`.

## Local mask validation

Add `person.jpg`, `product.jpg`, and `pet.jpg` to `test-images/`, then run:

```powershell
npm run models:test
```

The script saves masks, transparent cutouts, and side-by-side IS-Net fp32/fp16 masks under `docs/mask-tests/`, and reports inference time, raw tensor min/max, and mean/max absolute fp32-vs-fp16 mask difference.

- The local mask script can be run with development fixtures, but synthetic fixtures do not establish segmentation quality for real hair, fur, products, or portraits. Use approved real photos for quality review.
- TODO: confirm the final production hosting URL after deployment.

## Browser WASM smoke test

The browser worker loaded both self-hosted models and completed inference on a user-selected 1024 × 1280 image using the WASM execution provider. U²-Netp took 1.61 s; IS-Net fp16 took 11.95 s. IS-Net's 1024 × 1024 model input contains about 10 times as many pixels as U²-Netp's 320 × 320 input, so the measured runtime was not unexpectedly slow for the larger model. The uploaded image was processed in the browser and was not retained.
