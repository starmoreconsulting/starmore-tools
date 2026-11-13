from __future__ import annotations

import time
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
INPUTS = ROOT / "test-images"
OUTPUTS = ROOT / "docs" / "mask-tests"
MODELS = ROOT / "models-source"
TEST_CASES = ("person", "product", "pet")


def load_rgb(path: Path) -> Image.Image:
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def prepare_input(image: Image.Image, model: str, width: int, height: int) -> np.ndarray:
    resized = image.resize((width, height), Image.Resampling.BILINEAR)
    pixels = np.asarray(resized, dtype=np.float32)
    if model == "u2netp":
        pixels /= max(float(pixels.max()), 1.0)
        pixels = (pixels - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array(
            [0.229, 0.224, 0.225], dtype=np.float32
        )
    else:
        pixels = pixels / 255.0 - 0.5
    return np.transpose(pixels, (2, 0, 1))[None, ...].astype(np.float32)


def run_model(
    session: ort.InferenceSession,
    image: Image.Image,
    model: str,
    size: tuple[int, int],
) -> tuple[np.ndarray, float, float, float]:
    width, height = size
    tensor = prepare_input(image, model, width, height)
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    started = time.perf_counter()
    result = session.run([output_name], {input_name: tensor})[0]
    elapsed = time.perf_counter() - started

    raw = np.asarray(result, dtype=np.float32)
    raw_min = float(np.nanmin(raw))
    raw_max = float(np.nanmax(raw))
    matte = np.squeeze(raw)
    if matte.ndim != 2 or not np.isfinite(matte).all():
        raise ValueError(f"{session.get_outputs()[0].name} returned an invalid matte tensor with shape {raw.shape}.")
    minimum = float(matte.min())
    span = float(matte.max()) - minimum
    matte = np.zeros_like(matte) if span <= 1e-12 else (matte - minimum) / span
    return matte, elapsed, raw_min, raw_max


def save_outputs(image: Image.Image, mask: np.ndarray, name: str, model: str) -> Image.Image:
    resized_mask = Image.fromarray(np.uint8(np.clip(mask, 0, 1) * 255)).resize(
        image.size, Image.Resampling.BILINEAR
    )
    OUTPUTS.mkdir(parents=True, exist_ok=True)
    resized_mask.save(OUTPUTS / f"{name}-{model}.png")
    cutout = image.convert("RGBA")
    cutout.putalpha(resized_mask)
    cutout.save(OUTPUTS / f"{name}-{model}-cutout.png")
    return resized_mask


def main() -> None:
    required = [
        INPUTS / f"{name}.jpg"
        for name in TEST_CASES
    ]
    missing = [path.name for path in required if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "Add the required local images to test-images/ before running this test: "
            + ", ".join(missing)
        )

    u2netp_session = ort.InferenceSession(
        str(MODELS / "u2netp.onnx"), providers=["CPUExecutionProvider"]
    )
    isnet_fp32_session = ort.InferenceSession(
        str(MODELS / "isnet-general-use-fp32.onnx"), providers=["CPUExecutionProvider"]
    )
    isnet_fp16_session = ort.InferenceSession(
        str(MODELS / "isnet-general-use-fp16.onnx"), providers=["CPUExecutionProvider"]
    )
    for name in TEST_CASES:
        image = load_rgb(INPUTS / f"{name}.jpg")
        u2netp_mask, u2netp_elapsed, u2netp_min, u2netp_max = run_model(
            u2netp_session, image, "u2netp", (320, 320)
        )
        save_outputs(image, u2netp_mask, name, "u2netp")
        print(
            f"{name} u2netp: {u2netp_elapsed:.3f}s; output tensor min={u2netp_min:.7g}, "
            f"max={u2netp_max:.7g}; saved {name}-u2netp.png and {name}-u2netp-cutout.png"
        )
        fp32_mask, fp32_elapsed, fp32_min, fp32_max = run_model(
            isnet_fp32_session, image, "isnet", (1024, 1024)
        )
        fp16_mask, fp16_elapsed, fp16_min, fp16_max = run_model(
            isnet_fp16_session, image, "isnet", (1024, 1024)
        )
        save_outputs(image, fp16_mask, name, "isnet")
        height = min(fp32_mask.shape[0], fp16_mask.shape[0])
        width = min(fp32_mask.shape[1], fp16_mask.shape[1])
        difference = np.abs(fp32_mask[:height, :width] - fp16_mask[:height, :width])
        side_by_side = Image.new("L", (width * 2, height))
        side_by_side.paste(Image.fromarray(np.uint8(fp32_mask[:height, :width] * 255)), (0, 0))
        side_by_side.paste(Image.fromarray(np.uint8(fp16_mask[:height, :width] * 255)), (width, 0))
        side_by_side.save(OUTPUTS / f"{name}-isnet-fp32-vs-fp16.png")
        print(
            f"{name} IS-Net fp32 comparison: {fp32_elapsed:.3f}s "
            f"(min={fp32_min:.7g}, max={fp32_max:.7g}); fp16: {fp16_elapsed:.3f}s "
            f"(min={fp16_min:.7g}, max={fp16_max:.7g}); "
            f"mean abs mask difference={float(difference.mean()):.7g}, "
            f"max={float(difference.max()):.7g}; saved {name}-isnet-fp32-vs-fp16.png"
        )


if __name__ == "__main__":
    main()
