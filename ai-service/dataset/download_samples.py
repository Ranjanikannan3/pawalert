"""
🐾 PawAlert AI — Animal Image Dataset Downloader & Setup Utility
Initializes training directories and downloads sample benchmark images for MobileNetV2.
"""

import os
import urllib.request
import argparse

# Open-license sample image URLs (Unsplash / Wikimedia Commons open animal assets)
SAMPLE_DATASET_URLS = {
    "dog": [
        ("dog_sample_1.jpg", "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&q=80"),
        ("dog_sample_2.jpg", "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&q=80"),
        ("dog_sample_3.jpg", "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80"),
    ],
    "cat": [
        ("cat_sample_1.jpg", "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&q=80"),
        ("cat_sample_2.jpg", "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&q=80"),
        ("cat_sample_3.jpg", "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&q=80"),
    ],
    "cattle": [
        ("cattle_sample_1.jpg", "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&q=80"),
        ("cattle_sample_2.jpg", "https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=600&q=80"),
        ("cattle_sample_3.jpg", "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=600&q=80"),
    ]
}

def setup_dataset_directories(base_dir="./dataset"):
    print("=========================================================")
    print("🐾 PawAlert AI — Setting up Animal Image Dataset")
    print(f"📁 Target Directory: {os.path.abspath(base_dir)}")
    print("=========================================================")

    for category in ["dog", "cat", "cattle"]:
        category_dir = os.path.join(base_dir, category)
        os.makedirs(category_dir, exist_ok=True)
        print(f"📁 Directory ready: {category_dir}")

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

    print("\n⬇️ Fetching starter samples for pipeline verification...")
    for category, items in SAMPLE_DATASET_URLS.items():
        cat_dir = os.path.join(base_dir, category)
        for filename, url in items:
            dest_path = os.path.join(cat_dir, filename)
            if not os.path.exists(dest_path):
                try:
                    req = urllib.request.Request(url, headers=headers)
                    with urllib.request.urlopen(req, timeout=10) as resp, open(dest_path, 'wb') as out_f:
                        out_f.write(resp.read())
                    print(f"  [OK] Saved {category}/{filename}")
                except Exception as err:
                    print(f"  [SKIP] Could not download {filename} ({err}).")
            else:
                print(f"  [EXISTS] {category}/{filename}")

    print("\n🎉 Dataset structure ready!")
    print(f"💡 You can now add more images to {base_dir}/<dog|cat|cattle>/")
    print("💡 To train the model, run: python training/train.py --epochs 15")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download sample dataset for PawAlert")
    parser.add_argument("--dir", type=str, default="./dataset", help="Target dataset directory")
    args = parser.parse_args()
    setup_dataset_directories(args.dir)
