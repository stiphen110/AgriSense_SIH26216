from pathlib import Path
from typing import Any

from huggingface_hub import hf_hub_download
from ultralytics import YOLO


# -----------------------------------
# Configuration
# -----------------------------------

MODEL_REPO = "underdogquality/yolo11s-pest-detection"
MODEL_FILENAME = "best.pt"

CONFIDENCE_THRESHOLD = 0.25


# -----------------------------------
# Download Model
# -----------------------------------

def download_model() -> str:
    """
    Download pretrained YOLO pest model
    from Hugging Face.
    """

    model_path = hf_hub_download(
        repo_id=MODEL_REPO,
        filename=MODEL_FILENAME
    )

    return model_path


# -----------------------------------
# Load Model
# -----------------------------------

def load_pest_model() -> YOLO:
    """
    Load pretrained YOLO pest detection model.
    """

    model_path = download_model()

    model = YOLO(model_path)

    return model


# -----------------------------------
# Pest Prediction
# -----------------------------------

def predict_pests(
    image: Any,
    model: YOLO
) -> dict:

    """
    Detect pests in an image.

    Returns:
        Pest labels
        Confidence scores
        Bounding boxes
        Pest count
    """

    results = model.predict(
        source=image,
        conf=CONFIDENCE_THRESHOLD,
        verbose=False
    )

    detections = []

    for result in results:

        if result.boxes is None:
            continue

        boxes = result.boxes

        for i in range(len(boxes)):

            class_id = int(boxes.cls[i].item())
            confidence = float(boxes.conf[i].item())

            bbox = boxes.xyxy[i].tolist()

            label = result.names[class_id]

            detections.append({

                "label": label,

                "confidence": round(
                    confidence, 4
                ),

                "bbox": [
                    round(float(x), 2)
                    for x in bbox
                ]

            })

    pest_count = len(detections)

    return {

        "model_type": "object_detection",

        "model_id": MODEL_REPO,

        "detections": detections,

        "pest_count": pest_count,

        "count_available": True

    }


# -----------------------------------
# Initialize Model
# -----------------------------------

pest_model = None


def get_pest_model() -> YOLO:

    global pest_model

    if pest_model is None:

        pest_model = load_pest_model()

    return pest_model