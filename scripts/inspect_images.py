import os
import re
from PIL import Image

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all image paths
pattern = r'(?:src=["\']|url\(["\']?)(/[^"\'\)\s]+\.(?:jpg|png|webp|svg|jpeg))'
imgs = re.findall(pattern, content, re.IGNORECASE)

print("Images found in index.html:")
for img_path in sorted(set(imgs)):
    rel_path = img_path.lstrip('/')
    full_path = os.path.join('public', rel_path)
    if os.path.exists(full_path):
        try:
            im = Image.open(full_path)
            print(f"  {img_path}: {im.size} (format: {im.format}, mode: {im.mode}, size: {os.path.getsize(full_path) // 1024} KB)")
        except Exception as e:
            print(f"  {img_path}: Error opening ({e})")
    else:
        print(f"  {img_path}: NOT FOUND in public/")

print("\nAll files in public directory:")
for f in sorted(os.listdir('public')):
    if f.endswith(('.jpg', '.png', '.webp', '.jpeg')):
        fp = os.path.join('public', f)
        im = Image.open(fp)
        print(f"  {f}: {im.size} ({os.path.getsize(fp) // 1024} KB)")
