from services.pest_model import (
    get_pest_model,
    predict_pests
)

from PIL import Image


# Load model
model = get_pest_model()

# Provide image path
image_path = r"C:\Users\Admin\Downloads\aphids.webp"

# Load image
image = Image.open(image_path)

# Run detection
result = predict_pests(
    image=image,
    model=model
)

# Display results
print("\n===== PEST DETECTION RESULTS =====")
print(result)