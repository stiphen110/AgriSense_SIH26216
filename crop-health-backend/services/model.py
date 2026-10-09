import torch
from transformers import (
    ViTConfig,
    ViTForImageClassification,
    ViTImageProcessor
)
from huggingface_hub import hf_hub_download
from PIL import Image


# ============================================================
# MODEL CONFIGURATION
# ============================================================

MODEL_REPO = "moudook/pdd"
MODEL_FILE = "phase1/hf_google_vit_base/model.pt"

BASE_MODEL = "google/vit-base-patch16-224"


# ============================================================
# 38 PLANTVILLAGE CLASSES
# ============================================================

CLASS_NAMES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",

    "Blueberry___healthy",

    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",

    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",

    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",

    "Orange___Haunglongbing_(Citrus_greening)",

    "Peach___Bacterial_spot",
    "Peach___healthy",

    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",

    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",

    "Raspberry___healthy",

    "Soybean___healthy",

    "Squash___Powdery_mildew",

    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",

    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
]


# ============================================================
# SUPPORTED CROPS FOR OUR PROTOTYPE
# ============================================================

SUPPORTED_CROPS = {
    "Apple",
    "Corn",
    "Grape",
    "Potato",
    "Tomato"
}


# ============================================================
# DOWNLOAD TRAINED CHECKPOINT
# ============================================================

print("Getting trained checkpoint...")

model_path = hf_hub_download(
    repo_id=MODEL_REPO,
    filename=MODEL_FILE
)

print("Checkpoint ready.")


# ============================================================
# CREATE MODEL CONFIGURATION
# ============================================================

print("Creating ViT-Base architecture...")

config = ViTConfig.from_pretrained(BASE_MODEL)

config.num_labels = len(CLASS_NAMES)

config.id2label = {
    i: label
    for i, label in enumerate(CLASS_NAMES)
}

config.label2id = {
    label: i
    for i, label in enumerate(CLASS_NAMES)
}


# ============================================================
# CREATE EMPTY MODEL
# ============================================================

model = ViTForImageClassification(config)


# ============================================================
# LOAD CHECKPOINT
# ============================================================

print("Loading trained weights...")

checkpoint = torch.load(
    model_path,
    map_location="cpu"
)

state_dict = checkpoint["model_state_dict"]


# ============================================================
# CONVERT CHECKPOINT KEYS
# ============================================================

clean_state_dict = {}

for key, value in state_dict.items():

    # Remove PyTorch compilation prefix
    if key.startswith("_orig_mod."):
        key = key[len("_orig_mod."):]

    # Convert old Hugging Face ViT names
    # to Transformers 5.x names

    key = key.replace(
        ".encoder.layer.",
        ".layers."
    )

    key = key.replace(
        ".attention.attention.query.",
        ".attention.q_proj."
    )

    key = key.replace(
        ".attention.attention.key.",
        ".attention.k_proj."
    )

    key = key.replace(
        ".attention.attention.value.",
        ".attention.v_proj."
    )

    key = key.replace(
        ".attention.output.dense.",
        ".attention.o_proj."
    )

    key = key.replace(
        ".intermediate.dense.",
        ".mlp.fc1."
    )

    key = key.replace(
        ".output.dense.",
        ".mlp.fc2."
    )

    clean_state_dict[key] = value


# ============================================================
# LOAD TRAINED WEIGHTS
# ============================================================

missing_keys, unexpected_keys = model.load_state_dict(
    clean_state_dict,
    strict=False
)

if missing_keys:
    print("\nWARNING - Missing keys:")
    for key in missing_keys:
        print("  ", key)

if unexpected_keys:
    print("\nWARNING - Unexpected keys:")
    for key in unexpected_keys:
        print("  ", key)

if not missing_keys and not unexpected_keys:
    print("All trained weights loaded successfully!")


# ============================================================
# EVALUATION MODE
# ============================================================

model.eval()


# ============================================================
# IMAGE PROCESSOR
# ============================================================

print("Loading image processor...")

processor = ViTImageProcessor.from_pretrained(
    BASE_MODEL
)

print("Model ready!")


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_disease(image: Image.Image):

    # Make sure image is RGB
    image = image.convert("RGB")

    # Preprocess
    inputs = processor(
        images=image,
        return_tensors="pt"
    )

    # Inference
    with torch.no_grad():

        outputs = model(**inputs)

    # Convert logits to probabilities
    probabilities = torch.nn.functional.softmax(
        outputs.logits,
        dim=-1
    )

    # ========================================================
    # TOP 5 PREDICTIONS
    # ========================================================

    top_probabilities, top_indices = torch.topk(
        probabilities[0],
        k=5
    )

    top_predictions = []

    for probability, index in zip(
        top_probabilities,
        top_indices
    ):

        top_predictions.append({
            "label": CLASS_NAMES[index.item()],
            "confidence": probability.item()
        })

    # ========================================================
    # BEST PREDICTION
    # ========================================================

    predicted_index = top_indices[0].item()

    confidence = top_probabilities[0].item()

    label = CLASS_NAMES[predicted_index]

    return {
        "label": label,
        "confidence": confidence,
        "top_predictions": top_predictions
    }


# ============================================================
# DIRECT TERMINAL TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("==========================================")
    print("MODEL IS READY FOR INFERENCE")
    print("==========================================")

    image_path = input(
        "Enter path to a test image "
        "(or press Enter to exit): "
    ).strip()

    if not image_path:
        print("Exiting...")
        exit()

    try:

        # Handle paths accidentally pasted with quotes
        image_path = image_path.strip('"').strip("'")

        # Open image
        image = Image.open(image_path)

        # Run prediction
        result = predict_disease(image)

        print()
        print("==========================================")
        print("PREDICTION")
        print("==========================================")

        print(
            "Disease class:",
            result["label"]
        )

        print(
            "Confidence:",
            f"{result['confidence'] * 100:.2f}%"
        )

        print()
        print("TOP 5 PREDICTIONS")
        print("------------------------------------------")

        for i, prediction in enumerate(
            result["top_predictions"],
            start=1
        ):

            print(
                f"{i}. "
                f"{prediction['label']} "
                f" → "
                f"{prediction['confidence'] * 100:.2f}%"
            )

        print("==========================================")

    except Exception as e:

        print()
        print("Error while processing image:")
        print(e)