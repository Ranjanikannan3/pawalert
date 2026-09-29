# 🐾 PawAlert AI — Image Classification Dataset

This directory stores training and validation images for the **MobileNetV2 Animal Classifier** (`ai-service`).

## Directory Hierarchy:
```text
dataset/
├── dog/       # Street dog & puppy images
├── cat/       # Feral cat & kitten images
└── cattle/    # Cow, bull, and calf images
```

## Recommended Open Datasets for Production Training:
1. **Oxford-IIIT Pet Dataset:** 7,349 images of 37 cat and dog breeds with ground truth labels.
2. **Stanford Dogs Dataset:** 20,580 images across 120 breeds.
3. **Kaggle Cattle Breeds Dataset:** Images of Indian and global cattle breeds in outdoor/road environments.
4. **Roboflow Universe (Stray Animals):** Real road backgrounds with varying lighting conditions.

## Quick Setup:
Download starter samples:
```bash
python download_samples.py
```

Run Transfer Learning:
```bash
cd ..
python training/train.py --epochs 20 --batch_size 32
```
