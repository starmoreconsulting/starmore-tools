# Local model files

Download these model files for local development and testing:

| Exact local filename | Source | Expected size |
|---|---|---:|
| `u2netp.onnx` | rembg release v0.0.0: https://github.com/danielgatis/rembg/releases/tag/v0.0.0 | About 4.6 MB |
| `isnet-general-use-fp32.onnx` | rembg release v0.0.0: https://github.com/danielgatis/rembg/releases/tag/v0.0.0 | About 170 MB |

You can download either file from the page above and save it under this exact name in this folder if the fetch script cannot download it.

These files are for development only and are never committed to git.

## Converting IS-Net to fp16

The development-only conversion script reads `isnet-general-use-fp32.onnx` and writes `isnet-general-use-fp16.onnx`. Create a temporary environment and install its dependencies with:

```powershell
py -3.12 -m venv .venv-models
.\.venv-models\Scripts\python.exe -m pip install --upgrade pip
.\.venv-models\Scripts\python.exe -m pip install onnx onnxconverter-common onnxruntime
npm run models:convert
```

Python 3.12 must be installed. The verified fp32 source SHA-256 is `60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a`. The `.venv-models/` environment, source weights, converted model, and generated model parts are local development artifacts and are not committed.
