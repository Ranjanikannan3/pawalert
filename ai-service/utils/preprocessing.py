from io import BytesIO
from PIL import Image
import numpy as np

IMG_SIZE = (224, 224)

def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    """Load and convert image bytes to RGB PIL Image."""
    image = Image.open(BytesIO(image_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")
    return image

def preprocess_image_for_model(image: Image.Image) -> np.ndarray:
    """Resize, normalize, and expand dimensions for model tensor."""
    resized = image.resize(IMG_SIZE)
    img_array = np.array(resized, dtype=np.float32) / 255.0
    # Normalize with standard ImageNet mean and std
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img_array = (img_array - mean) / std
    return np.expand_dims(img_array, axis=0)
