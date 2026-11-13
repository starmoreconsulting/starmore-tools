from __future__ import annotations

import hashlib
from pathlib import Path

import onnx
from onnxconverter_common import float16


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "models-source" / "isnet-general-use-fp32.onnx"
DESTINATION = ROOT / "models-source" / "isnet-general-use-fp16.onnx"
TEMPORARY = DESTINATION.with_suffix(".onnx.tmp")


def main() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"Missing approved source model: {SOURCE}")

    model = onnx.load(str(SOURCE), load_external_data=True)
    if not model.graph.output:
        raise ValueError("The IS-Net model has no output tensors.")

    while len(model.graph.output) > 1:
        model.graph.output.pop()

    converted = float16.convert_float_to_float16(model, keep_io_types=True)
    onnx.checker.check_model(converted, full_check=True)
    onnx.save(converted, str(TEMPORARY), save_as_external_data=False)
    TEMPORARY.replace(DESTINATION)

    digest = hashlib.sha256()
    with DESTINATION.open("rb") as model_file:
        for chunk in iter(lambda: model_file.read(1024 * 1024), b""):
            digest.update(chunk)
    print(f"Created {DESTINATION.name}: {DESTINATION.stat().st_size} bytes")
    print(f"SHA-256: {digest.hexdigest()}")
    print(f"Input: {converted.graph.input[0].name}; output: {converted.graph.output[0].name}")


if __name__ == "__main__":
    main()
