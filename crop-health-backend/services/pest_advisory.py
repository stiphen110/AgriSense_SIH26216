"""
Crop-specific pest advisory service for AgriSense.

Lookup is intentionally crop + model-label based. Unsupported combinations
return advisory_available=False instead of silently returning generic advice.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_DATA_PATH = Path(__file__).resolve().parent.parent / "pest_advisories.json"

with _DATA_PATH.open("r", encoding="utf-8") as file:
    _DATA: dict[str, Any] = json.load(file)

_CROP_ALIASES = {
    "rice": "paddy",
    "paddy": "paddy",
    "chilli": "chilli",
    "chili": "chilli",
    "capsicum": "chilli",
    "potato": "potato",
    "cotton": "cotton",
    "wheat": "wheat",
}

_PEST_ALIASES = {
    "brown plant hopper": "brown plant hopper",
    "brown planthopper": "brown plant hopper",
    "white backed plant hopper": "white backed plant hopper",
    "white-backed planthopper": "white backed plant hopper",
    "white backed planthopper": "white backed plant hopper",
    "asiatic rice borer": "asiatic rice borer",
    "scirtothrips dorsalis hood": "scirtothrips dorsalis hood",
    "chilli thrips": "scirtothrips dorsalis hood",
    "leaf hopper": "leaf hopper",
    "leafhopper": "leaf hopper",
    "whitefly": "whitefly",
    "white flies": "whitefly",
    "cutworm": "cutworms",
    "cutworms": "cutworms",
    "armyworm": "army worm",
    "army worm": "army worm",
}

def _normalise(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"\s+", " ", value)
    return value

def normalise_crop(crop: str) -> str:
    key = _normalise(crop)
    return _CROP_ALIASES.get(key, key)

def normalise_pest(pest: str) -> str:
    key = _normalise(pest)
    return _PEST_ALIASES.get(key, key)

def get_pest_advisory(crop: str, pest: str) -> dict[str, Any]:
    crop_key = normalise_crop(crop)
    pest_key = normalise_pest(pest)

    crop_data = _DATA.get("advisories", {}).get(crop_key)
    if not crop_data:
        return {
            "advisory_available": False,
            "crop": crop,
            "pest": pest,
            "reason": "Crop is not available in the advisory database."
        }

    advisory = crop_data.get("advisories", {}).get(pest_key)
    if not advisory:
        return {
            "advisory_available": False,
            "crop": crop,
            "pest": pest,
            "normalised_crop": crop_key,
            "normalised_pest": pest_key,
            "reason": "This crop-pest combination is not verified in the prototype advisory database.",
            "available_pests": sorted(crop_data.get("advisories", {}).keys())
        }

    return {
        "advisory_available": True,
        "crop": crop_data.get("display_name", crop),
        "pest": advisory.get("common_name", pest),
        "model_label": pest,
        "actions": advisory.get("actions", []),
        "source": crop_data.get("source"),
        "source_url": crop_data.get("source_url"),
        "safety_note": _DATA.get("safety_note")
    }
