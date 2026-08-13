import io
import numpy as np
from PIL import Image

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Preprocesses the raw image bytes for the Oral Cancer AI classification model.
    
    1. Opens the image from bytes
    2. Converts to RGB to ensure 3 color channels
    3. Resizes to 224x224 (expected input size for the Keras model)
    4. Normalizes pixel values to be between 0 and 1
    5. Expands dimensions to match the model's expected batch shape: (1, 224, 224, 3)
    """
    try:
        # Open image and convert to RGB format, then resize to 224x224
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB').resize((224, 224))
        
        # Convert to numpy array, normalize values to [0.0, 1.0], and add batch dimension
        processed_image = np.expand_dims(np.array(image) / 255.0, axis=0)
        
        return processed_image
    except Exception as e:
        raise ValueError(f"Failed to preprocess image: {str(e)}")
