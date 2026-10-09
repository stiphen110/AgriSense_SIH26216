import os

import requests

from dotenv import load_dotenv

load_dotenv()

BHASHINI_URL = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

BHASHINI_API_KEY = os.getenv("BHASHINI_INFERENCE_API_KEY", "")

TRANSLATION_SERVICE_ID = os.getenv(
    "BHASHINI_TRANSLATION_SERVICE_ID",
    "ai4bharat/indictrans-v2-all-gpu--t4",
)

# Keep the environment override if one exists, but use the Bhashini IITM
# TTS service as the known Gujarati-capable fallback.
TTS_SERVICE_ID = os.getenv(
    "BHASHINI_TTS_SERVICE_ID",
    "Bhashini/IITM/TTS",
)

FALLBACK_TTS_SERVICE_ID = "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4"

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "gu": "Gujarati",
}


def _validate_language(language: str) -> None:
    if language not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported language '{language}'. Supported languages: "
            f"{', '.join(SUPPORTED_LANGUAGES.keys())}"
        )


def _headers() -> dict:
    if not BHASHINI_API_KEY:
        raise RuntimeError("BHASHINI_INFERENCE_API_KEY is not configured.")

    return {
        "Accept": "*/*",
        "Authorization": BHASHINI_API_KEY,
        "Content-Type": "application/json",
    }


def _raise_bhashini_error(response: requests.Response, task_name: str) -> None:
    """Raise a useful error while preserving Bhashini's response body."""
    if response.ok:
        return

    try:
        error_body = response.json()
    except ValueError:
        error_body = response.text.strip()

    raise RuntimeError(
        f"BHASHINI {task_name} failed: "
        f"HTTP {response.status_code} - {error_body}"
    )


def translate_text(text: str, source_language: str, target_language: str) -> str:
    """Translate text through the BHASHINI inference pipeline."""
    if not text or not text.strip():
        return text

    _validate_language(source_language)
    _validate_language(target_language)

    if source_language == target_language:
        return text

    payload = {
        "pipelineTasks": [
            {
                "taskType": "translation",
                "config": {
                    "language": {
                        "sourceLanguage": source_language,
                        "targetLanguage": target_language,
                    },
                    "serviceId": TRANSLATION_SERVICE_ID,
                },
            }
        ],
        "inputData": {
            "input": [{"source": text}],
        },
    }

    try:
        response = requests.post(
            BHASHINI_URL,
            headers=_headers(),
            json=payload,
            timeout=60,
        )
    except requests.RequestException as exc:
        raise RuntimeError(
            f"BHASHINI translation request failed: {exc}"
        ) from exc

    _raise_bhashini_error(response, "translation")

    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError(
            f"BHASHINI translation returned invalid JSON: "
            f"{response.text[:1000]}"
        ) from exc

    pipeline_response = data.get("pipelineResponse", [])
    if not pipeline_response:
        raise RuntimeError("BHASHINI returned no pipeline response.")

    output = pipeline_response[0].get("output", [])
    if not output:
        raise RuntimeError("BHASHINI returned no translation output.")

    translated = output[0].get("target")
    if not translated:
        raise RuntimeError("BHASHINI returned an empty translation.")

    return translated


def _tts_request(
    text: str,
    language: str,
    gender: str,
    service_id: str,
) -> str:
    """Make one direct TTS inference request."""
    payload = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {
                        "sourceLanguage": language,
                    },
                    "serviceId": service_id,
                    "gender": gender,
                },
            }
        ],
        "inputData": {
            "input": [{"source": text}],
        },
    }

    try:
        response = requests.post(
            BHASHINI_URL,
            headers=_headers(),
            json=payload,
            timeout=120,
        )
    except requests.RequestException as exc:
        raise RuntimeError(
            f"BHASHINI TTS request failed "
            f"(service={service_id}): {exc}"
        ) from exc

    _raise_bhashini_error(response, f"TTS ({service_id})")

    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError(
            f"BHASHINI TTS returned invalid JSON "
            f"(service={service_id}): {response.text[:1000]}"
        ) from exc

    pipeline_response = data.get("pipelineResponse", [])
    if not pipeline_response:
        raise RuntimeError(
            f"BHASHINI returned no TTS pipeline response "
            f"(service={service_id})."
        )

    for task_response in pipeline_response:
        if task_response.get("taskType") != "tts":
            continue

        audio_items = task_response.get("audio", [])
        if audio_items:
            audio_base64 = audio_items[0].get("audioContent")
            if audio_base64:
                return audio_base64

    raise RuntimeError(
        f"BHASHINI returned no audio content "
        f"(service={service_id}). Response: {data}"
    )


def text_to_speech(
    text: str,
    language: str,
    gender: str = "female",
) -> str:
    """Convert localized text into base64-encoded audio.

    Tries the configured TTS service first. If Dhruva returns a server-side
    failure, retries once with the other Gujarati-capable TTS service.
    """
    if not text or not text.strip():
        return ""

    _validate_language(language)

    gender = gender.lower().strip()
    if gender not in {"male", "female"}:
        raise ValueError("TTS gender must be 'male' or 'female'.")

    service_ids = [TTS_SERVICE_ID]

    if FALLBACK_TTS_SERVICE_ID not in service_ids:
        service_ids.append(FALLBACK_TTS_SERVICE_ID)

    errors = []

    for service_id in service_ids:
        try:
            return _tts_request(
                text=text,
                language=language,
                gender=gender,
                service_id=service_id,
            )
        except RuntimeError as exc:
            errors.append(str(exc))

    raise RuntimeError(
        "All BHASHINI TTS services failed. "
        + " | ".join(errors)
    )


def translate_and_speak(
    text: str,
    source_language: str = "en",
    target_language: str = "gu",
    gender: str = "female",
) -> dict:
    """Translate text to the farmer's language and generate speech for it."""
    if not text or not text.strip():
        return {
            "translated_text": text,
            "audio_base64": None,
        }

    _validate_language(source_language)
    _validate_language(target_language)

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
        "translated_text": translated_text,
        "audio_base64": audio_base64,
    }
