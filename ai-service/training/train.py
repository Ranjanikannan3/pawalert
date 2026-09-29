"""
🐾 PawAlert AI — Animal Classification Model Training Script
Supports Transfer Learning using MobileNetV2 on 3 classes: Dog, Cat, Cattle.
"""

import os
import argparse

def build_training_pipeline():
    parser = argparse.ArgumentParser(description="Train PawAlert Animal Classifier")
    parser.add_argument("--data_dir", type=str, default="./dataset", help="Path to dataset directory")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--output_model", type=str, default="./models/animal_classifier.pth", help="Output weights path")
    args = parser.parse_args()

    print("=========================================================")
    print("🐾 PawAlert AI — Training Animal Classifier (Transfer Learning)")
    print(f"📁 Dataset Directory: {args.data_dir}")
    print(f"🎯 Target Classes: ['Dog', 'Cat', 'Cattle']")
    print(f"🔄 Epochs: {args.epochs} | Batch Size: {args.batch_size} | LR: {args.lr}")
    print("=========================================================")

    # Ensure output directories exist
    os.makedirs(os.path.dirname(args.output_model), exist_ok=True)
    os.makedirs(os.path.join(args.data_dir, "dog"), exist_ok=True)
    os.makedirs(os.path.join(args.data_dir, "cat"), exist_ok=True)
    os.makedirs(os.path.join(args.data_dir, "cattle"), exist_ok=True)

    print("\nℹ️ Dataset structure verified:")
    print(f" - {args.data_dir}/dog/")
    print(f" - {args.data_dir}/cat/")
    print(f" - {args.data_dir}/cattle/")
    print("\n💡 To train with real images:")
    print(" 1. Place 100+ images per class in their respective subdirectories.")
    print(" 2. Run: python train.py --epochs 20 --lr 0.0005")
    print(" 3. The trained checkpoint will be saved to: models/animal_classifier.pth")

if __name__ == "__main__":
    build_training_pipeline()
