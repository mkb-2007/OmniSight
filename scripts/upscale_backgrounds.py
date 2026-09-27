import os
import cv2
import numpy as np

def upscale_image_to_4k(file_path, target_width=3840, is_png=False, quality=94):
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}: Not found")
        return

    print(f"Processing {file_path}...")
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Failed to read {file_path}")
        return

    h, w = img.shape[:2]
    target_height = int(round(h * target_width / w))

    # Keep alpha if present
    has_alpha = len(img.shape) == 3 and img.shape[2] == 4
    if has_alpha:
        bgr = img[:, :, :3]
        alpha = img[:, :, 3]
    else:
        bgr = img
        alpha = None

    # 1. Bilateral filtering for artifact suppression while preserving sharp edges
    denoised = cv2.bilateralFilter(bgr, d=5, sigmaColor=18, sigmaSpace=18)

    # 2. State-of-the-art Lanczos-4 sinc interpolation to 4K
    upscaled = cv2.resize(denoised, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)

    # 3. Unsharp mask for high-frequency micro-contrast
    gaussian = cv2.GaussianBlur(upscaled, (0, 0), sigmaX=1.2)
    sharpened = cv2.addWeighted(upscaled, 1.22, gaussian, -0.22, 0)

    # 4. Detail enhancement
    detail = cv2.detailEnhance(sharpened, sigma_s=10, sigma_r=0.12)
    final_bgr = cv2.addWeighted(sharpened, 0.45, detail, 0.55, 0)

    if has_alpha:
        upscaled_alpha = cv2.resize(alpha, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)
        result = np.dstack([final_bgr, upscaled_alpha])
    else:
        result = final_bgr

    if is_png or file_path.lower().endswith('.png'):
        cv2.imwrite(file_path, result, [cv2.IMWRITE_PNG_COMPRESSION, 4])
    else:
        cv2.imwrite(file_path, result, [cv2.IMWRITE_JPEG_QUALITY, quality, cv2.IMWRITE_JPEG_OPTIMIZE, 1])

    new_size_kb = os.path.getsize(file_path) // 1024
    print(f"  -> Successfully upscaled {os.path.basename(file_path)} to {target_width}x{target_height} ({new_size_kb} KB)")

def main():
    print("==================================================")
    print("UPSCALING ALL WEBSITE BACKGROUND IMAGES TO 4K")
    print("==================================================")

    targets = [
        # Full-Screen Backdrops (Portal Selection, Unified Login)
        ('public/portal-background.jpg', 3840, False, 94),
        ('public/omnisight-bg-2x.png', 3840, True, 94),
        ('public/omnisight-clean-bg.png', 3840, True, 94),
        ('public/portal-scene-bottom.jpg', 3840, False, 92),
        ('public/dev-hero-backdrop.jpg', 3840, False, 92),

        # Fleet Camera & Sensor Feeds (Modal / Road Telemetry Backdrops)
        ('public/bus-19b.jpg', 3840, False, 92),
        ('public/bus-21g.jpg', 3840, False, 92),
        ('public/bus-29c.jpg', 3840, False, 92),
        ('public/bus-47.jpg', 3840, False, 92),
        ('public/bus-5c.jpg', 3840, False, 92),
        ('public/bus-a1.jpg', 3840, False, 92),

        # Hero Bus Visual Backdrop (Landing Page)
        ('public/hero-bus-visual.jpg', 2336, False, 94),
    ]

    for path, target_w, is_png, quality in targets:
        upscale_image_to_4k(path, target_width=target_w, is_png=is_png, quality=quality)

    print("\nAll background images have been upscaled to 4K quality successfully!")

if __name__ == '__main__':
    main()
