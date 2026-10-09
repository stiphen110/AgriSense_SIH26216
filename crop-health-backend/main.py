from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from io import BytesIO

from services.model import predict_disease
from services.pest_model import get_pest_model, predict_pests
from services.risk import calculate_risk
from services.advisory import get_advisory
from services.pest_advisory import get_pest_advisory
from services.supabase import supabase
from services.farmer_support import get_schemes, get_eligible_schemes, get_regulations, get_farmer_support, DISCLAIMER
from dotenv import load_dotenv

load_dotenv()

from services.Bhashini import translate_text, translate_and_speak, text_to_speech

# Weather + NASA POWER integration
from datetime import date, timedelta
from typing import Optional
from fastapi import Query

from services.weather import (
    WeatherService,
    WeatherUpdateResponse,
    FungalRiskAssessment,
    calculate_weather_risk,
)


# ============================================================
# SAFE PEST DETECTION
# ============================================================

def safe_pest_detection(image):
    """
    Run YOLO pest detection independently.

    If pest detection fails, the existing disease prediction,
    risk calculation, advisory, and database flow can continue.
    """

    try:
        model = get_pest_model()

        result = predict_pests(
            image=image,
            model=model
        )

        result["status"] = "success"
        return result

    except Exception as e:
        return {
            "model_type": "object_detection",
            "model_id": "underdogquality/yolo11s-pest-detection",
            "detections": [],
            "pest_count": None,
            "count_available": False,
            "status": "unavailable",
            "error": str(e)
        }


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Crop Health Intelligence API",
    description="Backend for crop disease detection and farm health monitoring",
    version="1.0.0"
)

# ============================================================
# CORS
# ============================================================
# Allows the Vite/Figma frontend running on port 8443
# to communicate with this FastAPI backend on port 8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8443",
        "http://127.0.0.1:8443",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Crop Health API is running!",
        "status": "success"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# ============================================================
# DISEASE PREDICTION
# ============================================================

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    pest_file: UploadFile | None = File(None)
):

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Please upload a valid image file."
        )

    try:

        image_bytes = await file.read()

        image = Image.open(
            BytesIO(image_bytes)
        ).convert("RGB")

        result = predict_disease(image)

        # Run pest detection only on a separately uploaded pest image.
        # The disease image is never reused for pest detection.
        if pest_file is not None:
            if not pest_file.content_type or not pest_file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail="Please upload a valid pest image file."
                )

            pest_image_bytes = await pest_file.read()
            pest_image = Image.open(
                BytesIO(pest_image_bytes)
            ).convert("RGB")
            pest_detection = safe_pest_detection(pest_image)
        else:
            pest_detection = {
                "model_type": "object_detection",
                "model_id": "underdogquality/yolo11s-pest-detection",
                "detections": [],
                "pest_count": None,
                "count_available": False,
                "status": "not_provided",
                "message": "No separate pest image was uploaded."
            }

        raw_label = result["label"]

        confidence = result["confidence"]

        top_predictions = result["top_predictions"]

        # ----------------------------------------------------
        # Split model label
        #
        # Example:
        # Tomato___Bacterial_spot
        # ----------------------------------------------------

        if "___" in raw_label:

            crop, disease = raw_label.split(
                "___",
                1
            )

        else:

            crop = "Unknown"
            disease = raw_label

        disease_display = disease.replace("_", " ")
        crop_display = crop.replace("_", " ")

        # ----------------------------------------------------
        # Confidence status
        # ----------------------------------------------------

        if confidence >= 0.70:
            confidence_status = "High confidence"

        elif confidence >= 0.40:
            confidence_status = "Moderate confidence"

        else:
            confidence_status = "Low confidence"

        return {

            "filename": file.filename,

            "crop": crop_display,

            "disease": disease_display,

            "disease_class": raw_label,

            "confidence": round(
                confidence,
                4
            ),

            "confidence_percent": round(
                confidence * 100,
                2
            ),

            "confidence_status": confidence_status,

            "message": (
                f"Possible {disease_display} detected."
            ),

            "top_predictions": [
                {
                    "class": prediction["label"],
                    "confidence": round(
                        prediction["confidence"],
                        4
                    ),
                    "confidence_percent": round(
                        prediction["confidence"] * 100,
                        2
                    )
                }

                for prediction in top_predictions
            ],

            # Added field; all existing response fields are preserved.
            "pest_detection": pest_detection
        }

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=f"Could not process image: {str(e)}"
        )


# ============================================================
# RISK REQUEST
# ============================================================

class RiskRequest(BaseModel):

    crop: str
    disease: str
    temperature: float
    humidity: float
    rainfall: float
    pest_count: int


# ============================================================
# RISK CALCULATION
# ============================================================

@app.post("/risk")
def risk(request: RiskRequest):

    result = calculate_risk(
        temperature=request.temperature,
        humidity=request.humidity,
        rainfall=request.rainfall,
        pest_count=request.pest_count
    )

    return {
        "crop": request.crop,
        "disease": request.disease,
        **result
    }


# ============================================================
# ADVISORY
# ============================================================

@app.get("/advisory/{disease}")
def advisory(disease: str):

    return get_advisory(disease)


# ============================================================
# PEST ADVISORY
# ============================================================

@app.get("/pest-advisory")
def pest_advisory(crop: str, pest: str):
    """Return a crop-specific pest advisory for a detected model label."""
    return get_pest_advisory(crop=crop, pest=pest)


# ============================================================
# COMPLETE CROP HEALTH ANALYSIS
# ============================================================

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    pest_file: UploadFile | None = File(None),
    farmer_id: str = Form(None),
    field_id: str = Form(None),
    selected_crop: str = Form(None),
    scan_mode: str = Form("disease"),
    temperature: float = Form(28),
    humidity: float = Form(84),
    rainfall: float = Form(12),
    pest_count: int = Form(18),
    latitude: float = Form(None),
    longitude: float = Form(None),
):
    """Run disease, pest, or combined analysis and save one linked crop_scans row."""

    scan_mode = (scan_mode or "disease").strip().lower()
    if scan_mode not in {"disease", "pest", "both"}:
        raise HTTPException(status_code=400, detail="scan_mode must be disease, pest, or both.")

    def empty_pest_result(message="No separate pest image was uploaded."):
        return {
            "model_type": "object_detection",
            "model_id": "underdogquality/yolo11s-pest-detection",
            "detections": [],
            "pest_count": 0,
            "count_available": False,
            "status": "not_provided",
            "message": message,
        }

    def pest_summary(pest_result):
        detections = pest_result.get("detections") or []
        labels = []
        max_confidence = 0.0
        for item in detections:
            if not isinstance(item, dict):
                continue
            label = item.get("label") or item.get("name") or item.get("class_name")
            if label and label not in labels:
                labels.append(str(label))
            try:
                max_confidence = max(max_confidence, float(item.get("confidence", 0)))
            except (TypeError, ValueError):
                pass
        count = pest_result.get("pest_count")
        try:
            count = int(count) if count is not None else len(detections)
        except (TypeError, ValueError):
            count = len(detections)
        return labels, count, max_confidence

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload a valid image file.")

    try:
        # Disease analysis is performed only for disease and both modes.
        prediction = None
        raw_label = "Pest scan"
        confidence = 0.0
        top_predictions = []
        crop_display = selected_crop or "Unknown"
        disease_display = "Pest scan"

        if scan_mode in {"disease", "both"}:
            image_bytes = await file.read()
            image = Image.open(BytesIO(image_bytes)).convert("RGB")
            prediction = predict_disease(image)
            raw_label = prediction["label"]
            confidence = float(prediction["confidence"])
            top_predictions = prediction.get("top_predictions", [])

            if "___" in raw_label:
                crop, disease = raw_label.split("___", 1)
            else:
                crop, disease = "Unknown", raw_label

            crop_display = crop.replace("_", " ")
            disease_display = disease.replace("_", " ")

            if selected_crop and selected_crop.strip().lower() != crop_display.strip().lower():
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Selected crop is '{selected_crop}', but the model detected "
                        f"'{crop_display}'. Please upload an image of the selected crop."
                    ),
                )

        # Pest mode uses the uploaded file as the pest image.
        # Both mode uses the separate pest_file only.
        pest_detection = empty_pest_result()
        if scan_mode == "pest":
            pest_image_bytes = await file.read()
            pest_image = Image.open(BytesIO(pest_image_bytes)).convert("RGB")
            pest_detection = safe_pest_detection(pest_image)
        elif scan_mode == "both" and pest_file is not None:
            if not pest_file.content_type or not pest_file.content_type.startswith("image/"):
                raise HTTPException(status_code=400, detail="Please upload a valid pest image file.")
            pest_image_bytes = await pest_file.read()
            pest_image = Image.open(BytesIO(pest_image_bytes)).convert("RGB")
            pest_detection = safe_pest_detection(pest_image)

        pest_labels, detected_count, pest_confidence = pest_summary(pest_detection)
        pest_label = ", ".join(pest_labels) if pest_labels else "Pest not identified"

        # Pest advisory is generated from the selected crop and actual YOLO label.
        pest_advisory = {}
        if scan_mode in {"pest", "both"} and pest_labels and selected_crop:
            pest_advisory = get_pest_advisory(
                crop=selected_crop.strip(),
                pest=pest_labels[0],
            ) or {}

        disease_advisory = {}
        if scan_mode in {"disease", "both"} and prediction is not None:
            disease_advisory = get_advisory(raw_label) or {}

        if scan_mode == "pest":
            advisory_result = pest_advisory or {
                "title": "Pest Detection Advisory",
                "summary": "Pest detection completed. Awaiting expert validation.",
                "pest": pest_label,
            }
            saved_crop = selected_crop or crop_display
            saved_disease = f"Pest: {pest_label}"
            saved_class = f"Pest___{pest_label}"
            saved_confidence = pest_confidence
            saved_filename = file.filename
        elif scan_mode == "both":
            advisory_result = {
                "title": "Combined Crop Health Advisory",
                "summary": "Disease and pest findings are provided for Extension Officer validation.",
                "disease_advisory": disease_advisory,
                "pest_advisory": pest_advisory,
                "pest": pest_label if pest_labels else None,
            }
            saved_crop = selected_crop or crop_display
            saved_disease = disease_display
            saved_class = raw_label
            saved_confidence = confidence
            saved_filename = file.filename
        else:
            advisory_result = disease_advisory
            saved_crop = crop_display
            saved_disease = disease_display
            saved_class = raw_label
            saved_confidence = confidence
            saved_filename = file.filename

        confidence_status = (
            "High confidence" if saved_confidence >= 0.70
            else "Moderate confidence" if saved_confidence >= 0.40
            else "Low confidence"
        )

        weather_source = "fallback"
        weather_error = None
        try:
            if field_id and (latitude is None or longitude is None):
                field_response = (
                    supabase.table("fields")
                    .select("latitude,longitude")
                    .eq("id", field_id).limit(1).execute()
                )
                if field_response.data:
                    latitude = field_response.data[0].get("latitude")
                    longitude = field_response.data[0].get("longitude")

            if farmer_id and (latitude is None or longitude is None):
                profile_response = (
                    supabase.table("profiles")
                    .select("latitude,longitude")
                    .eq("id", farmer_id).limit(1).execute()
                )
                if profile_response.data:
                    latitude = profile_response.data[0].get("latitude")
                    longitude = profile_response.data[0].get("longitude")

            if latitude is not None and longitude is not None:
                weather = await WeatherService.fetch_open_meteo_hourly(
                    float(latitude), float(longitude), forecast_days=1
                )
                records = [
                    r for r in weather.hourly_records
                    if r.temperature_2m is not None and r.relative_humidity_2m is not None
                ][:24]
                if records:
                    temperature = round(sum(r.temperature_2m for r in records) / len(records), 2)
                    humidity = round(sum(r.relative_humidity_2m for r in records) / len(records), 2)
                    rainfall = round(sum(r.precipitation or 0 for r in records), 2)
                    weather_source = "Open-Meteo live forecast"
        except Exception as exc:
            weather_error = str(exc)

        risk_result = calculate_risk(
            temperature=temperature,
            humidity=humidity,
            rainfall=rainfall,
            pest_count=detected_count if scan_mode in {"pest", "both"} else pest_count,
        )

        scan_data = {
            "crop": saved_crop,
            "disease": saved_disease,
            "disease_class": saved_class,
            "confidence": round(saved_confidence * 100, 2),
            "risk": risk_result.get("risk"),
            "risk_score": risk_result.get("score"),
            "temperature": temperature,
            "humidity": humidity,
            "rainfall": rainfall,
            "pest_count": detected_count if scan_mode in {"pest", "both"} else pest_count,
            "image_filename": saved_filename,
            "advisory_title": advisory_result.get("title", "Crop Health Advisory"),
            "advisory_summary": advisory_result.get("summary", ""),
            "advisory": advisory_result,
        }
        if farmer_id:
            scan_data["farmer_id"] = farmer_id
        if field_id:
            scan_data["field_id"] = field_id

        scan_response = supabase.table("crop_scans").insert(scan_data).execute()
        if not scan_response.data:
            raise Exception("Supabase did not return the created scan.")
        scan_id = scan_response.data[0]["id"]

        return {
            "status": "success",
            "scan_id": scan_id,
            "scan_mode": scan_mode,
            "image": {"filename": saved_filename},
            "prediction": {
                "crop": saved_crop,
                "disease": saved_disease,
                "disease_class": saved_class,
                "confidence": round(saved_confidence, 4),
                "confidence_percent": round(saved_confidence * 100, 2),
                "confidence_status": confidence_status,
                "top_predictions": [
                    {
                        "class": item["label"],
                        "confidence": round(item["confidence"], 4),
                        "confidence_percent": round(item["confidence"] * 100, 2),
                    }
                    for item in top_predictions
                ],
            },
            "environment": {
                "temperature": temperature,
                "humidity": humidity,
                "rainfall": rainfall,
                "pest_count": pest_count,
                "detected_pest_count": detected_count,
                "weather_source": weather_source,
                "latitude": latitude,
                "longitude": longitude,
            },
            "risk": risk_result,
            "pest_detection": pest_detection,
            "pest_advisory": pest_advisory,
            "advisory": advisory_result,
            "weather": {
                "source": weather_source,
                "latitude": latitude,
                "longitude": longitude,
                "error": weather_error,
            },
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not analyze image: {exc}")



# ============================================================
# WEATHER + NASA POWER
# ============================================================

@app.get(
    "/api/v1/weather/forecast/hourly",
    response_model=WeatherUpdateResponse,
    summary="Get upcoming hourly weather forecast"
)
async def get_hourly_forecast(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    days: int = Query(
        2,
        ge=1,
        le=7,
        description="Number of forecast days"
    ),
):
    """
    Get current and upcoming hourly weather from Open-Meteo.
    Used for real-time agricultural weather and disease-risk assessment.
    """
    return await WeatherService.fetch_open_meteo_hourly(
        latitude,
        longitude,
        forecast_days=days,
    )


@app.get(
    "/api/v1/weather/satellite/hourly",
    response_model=WeatherUpdateResponse,
    summary="Get historical hourly NASA POWER data"
)
async def get_satellite_hourly(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    start_date: Optional[date] = Query(
        None,
        description="Start date; defaults to two days ago"
    ),
    end_date: Optional[date] = Query(
        None,
        description="End date; defaults to two days ago"
    ),
):
    """
    Get recent historical agro-climatic data from NASA POWER.

    NASA POWER has a processing lag, so it is used here for historical/
    corroborative data rather than as the live weather source.
    """

    if end_date is None:
        end_date = date.today() - timedelta(days=2)

    if start_date is None:
        start_date = end_date - timedelta(days=1)

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="start_date cannot be later than end_date.",
        )

    return await WeatherService.fetch_nasa_power_hourly(
        latitude,
        longitude,
        start_date,
        end_date,
    )


@app.get(
    "/api/v1/weather/risk-assessment",
    response_model=FungalRiskAssessment,
    summary="Assess weather-based fungal disease risk"
)
async def assess_weather_risk(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
):
    """
    Evaluate upcoming 24-hour fungal disease risk using
    Open-Meteo temperature and humidity conditions.
    """
    return await calculate_weather_risk(
        latitude,
        longitude,
    )


# ============================================================
# FARMER SUPPORT: GOVERNMENT SCHEMES & REGULATIONS
# ============================================================

@app.get("/schemes")
async def schemes_all(state: Optional[str] = Query(None)):
    try:
        return {"schemes": get_schemes(state), "disclaimer": DISCLAIMER}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load schemes: {str(e)}")


@app.get("/schemes/state/{state}")
async def schemes_by_state(state: str):
    try:
        rows = get_schemes(state)
        return {"state": state, "schemes": rows, "disclaimer": DISCLAIMER}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load state schemes: {str(e)}")


@app.get("/schemes/eligible/{farmer_id}")
async def eligible_schemes(farmer_id: str, state: Optional[str] = Query(None)):
    resolved_state = state

    if not resolved_state:
        try:
            profile = (
                supabase.table("profiles")
                .select("state")
                .eq("id", farmer_id)
                .limit(1)
                .execute()
                .data
            )
            if profile and profile[0].get("state"):
                resolved_state = profile[0]["state"]
        except Exception:
            resolved_state = None

    if not resolved_state:
        return {
            "farmer_id": farmer_id,
            "schemes": [],
            "note": "Farmer state is required for state-specific scheme filtering.",
            "disclaimer": DISCLAIMER
        }

    return {
        "farmer_id": farmer_id,
        "state": resolved_state,
        "schemes": get_eligible_schemes(resolved_state),
        "disclaimer": DISCLAIMER
    }


@app.get("/regulations")
async def regulations(state: Optional[str] = Query(None)):
    try:
        return {"regulations": get_regulations(state), "disclaimer": DISCLAIMER}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load farmer regulations: {str(e)}")


@app.get("/farmer-support/{farmer_id}")
async def farmer_support(farmer_id: str, state: Optional[str] = Query(None)):
    resolved_state = state

    if not resolved_state:
        try:
            profile = (
                supabase.table("profiles")
                .select("state")
                .eq("id", farmer_id)
                .limit(1)
                .execute()
                .data
            )
            if profile and profile[0].get("state"):
                resolved_state = profile[0]["state"]
        except Exception:
            resolved_state = None

    result = get_farmer_support(resolved_state)
    result["farmer_id"] = farmer_id
    result["state"] = resolved_state

    if not resolved_state:
        result["note"] = "Farmer state is required for state-specific scheme filtering."

    return result

@app.post("/bhashini/translate")
async def bhashini_translate(
    text: str = Form(...),
    source_language: str = Form("en"),
    target_language: str = Form("gu"),
):
    """Translate text using Bhashini."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        translated_text = translate_text(
            text=text,
            source_language=source_language,
            target_language=target_language,
        )

        return {
            "status": "success",
            "source_language": source_language,
            "target_language": target_language,
            "original_text": text,
            "translated_text": translated_text,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Bhashini translation failed: {str(e)}",
        )

# ============================================================
# BHASHINI SPEECH
# ============================================================

@app.post("/bhashini/speak")
async def bhashini_speak(
    text: str = Form(...),
    source_language: str = Form("en"),
    target_language: str = Form("gu"),
    gender: str = Form("female"),
):
    """Translate text and generate Bhashini TTS audio."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        result = translate_and_speak(
            text=text,
            source_language=source_language,
            target_language=target_language,
            gender=gender,
        )

        return {
            "status": "success",
            "source_language": source_language,
            "target_language": target_language,
            "translated_text": result["translated_text"],
            "audio_base64": result["audio_base64"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Bhashini speech generation failed: {str(e)}",
        )


# ============================================================
# BHASHINI DIAGNOSTIC TEST
# ============================================================

@app.post("/bhashini/test-audio")
async def bhashini_test_audio(
    text: str = Form("Hello, welcome to AgriSense."),
    source_language: str = Form("en"),
    target_language: str = Form("gu"),
    gender: str = Form("female"),
):
    """Small diagnostic endpoint for testing translation + TTS independently."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        translated_text = translate_text(
            text=text,
            source_language=source_language,
            target_language=target_language,
        )

        audio_base64 = text_to_speech(
            text=translated_text,
            language=target_language,
            gender=gender,
        )

        return {
            "status": "success",
            "source_language": source_language,
            "target_language": target_language,
            "original_text": text,
            "translated_text": translated_text,
            "audio_base64": audio_base64,
            "audio_available": bool(audio_base64),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Bhashini test failed: {str(e)}",
        )

