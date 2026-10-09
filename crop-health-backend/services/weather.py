from datetime import date, timedelta
from typing import List, Optional

import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel, Field


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
NASA_POWER_HOURLY_URL = (
    "https://power.larc.nasa.gov/api/temporal/hourly/point"
)


# ============================================================
# RESPONSE SCHEMAS
# ============================================================

class HourlyDataPoint(BaseModel):
    timestamp: str
    temperature_2m: Optional[float] = Field(
        None,
        description="Air temperature in Celsius"
    )
    relative_humidity_2m: Optional[float] = Field(
        None,
        description="Relative humidity in %"
    )
    precipitation: Optional[float] = Field(
        None,
        description="Precipitation in mm"
    )


class WeatherUpdateResponse(BaseModel):
    source: str
    latitude: float
    longitude: float
    timezone: str
    total_hours: int
    hourly_records: List[HourlyDataPoint]


class FungalRiskAssessment(BaseModel):
    latitude: float
    longitude: float
    evaluated_hours: int
    avg_temperature: float
    avg_humidity: float
    risk_level: str
    action_required: bool
    summary: str


# ============================================================
# WEATHER SERVICE
# ============================================================

class WeatherService:

    @staticmethod
    async def fetch_open_meteo_hourly(
        lat: float,
        lon: float,
        forecast_days: int = 2
    ) -> WeatherUpdateResponse:

        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": (
                "temperature_2m,"
                "relative_humidity_2m,"
                "precipitation"
            ),
            "forecast_days": forecast_days,
            "timezone": "auto",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    OPEN_METEO_URL,
                    params=params
                )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Open-Meteo API Error: {response.text}"
                )

            data = response.json()

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Weather service unavailable: {str(exc)}"
            )

        hourly = data.get("hourly", {})

        times = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        hums = hourly.get("relative_humidity_2m", [])
        rain = hourly.get("precipitation", [])

        records = []

        for i, timestamp in enumerate(times):
            records.append(
                HourlyDataPoint(
                    timestamp=timestamp,
                    temperature_2m=(
                        temps[i]
                        if i < len(temps)
                        else None
                    ),
                    relative_humidity_2m=(
                        hums[i]
                        if i < len(hums)
                        else None
                    ),
                    precipitation=(
                        rain[i]
                        if i < len(rain)
                        else None
                    ),
                )
            )

        return WeatherUpdateResponse(
            source="Open-Meteo Forecast Engine",
            latitude=lat,
            longitude=lon,
            timezone=data.get("timezone", "auto"),
            total_hours=len(records),
            hourly_records=records,
        )

    # ========================================================
    # NASA POWER
    # ========================================================

    @staticmethod
    async def fetch_nasa_power_hourly(
        lat: float,
        lon: float,
        start_date: date,
        end_date: date
    ) -> WeatherUpdateResponse:

        params = {
            "latitude": lat,
            "longitude": lon,
            "start": start_date.strftime("%Y%m%d"),
            "end": end_date.strftime("%Y%m%d"),
            "community": "AG",
            "parameters": "T2M,RH2M,PRECTOTCORR",
            "format": "JSON",
            "time-standard": "LST",
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    NASA_POWER_HOURLY_URL,
                    params=params
                )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"NASA POWER API Error: {response.text}"
                )

            data = response.json()

        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"NASA POWER unavailable: {str(exc)}"
            )

        properties = data.get("properties", {})
        parameter = properties.get("parameter", {})

        temperatures = parameter.get("T2M", {})
        humidity = parameter.get("RH2M", {})
        precipitation = parameter.get(
            "PRECTOTCORR",
            {}
        )

        records = []

        timestamps = sorted(
            set(temperatures.keys())
            | set(humidity.keys())
            | set(precipitation.keys())
        )

        for timestamp in timestamps:

            temp = temperatures.get(timestamp)
            hum = humidity.get(timestamp)
            rain = precipitation.get(timestamp)

            # NASA POWER uses -999 as missing-data marker
            if temp == -999:
                temp = None

            if hum == -999:
                hum = None

            if rain == -999:
                rain = None

            records.append(
                HourlyDataPoint(
                    timestamp=str(timestamp),
                    temperature_2m=temp,
                    relative_humidity_2m=hum,
                    precipitation=rain,
                )
            )

        return WeatherUpdateResponse(
            source="NASA POWER",
            latitude=lat,
            longitude=lon,
            timezone="LST",
            total_hours=len(records),
            hourly_records=records,
        )


# ============================================================
# FUNGAL RISK CALCULATION
# ============================================================

async def calculate_weather_risk(
    latitude: float,
    longitude: float
) -> FungalRiskAssessment:

    weather = await WeatherService.fetch_open_meteo_hourly(
        latitude,
        longitude,
        forecast_days=1
    )

    records = weather.hourly_records[:24]

    valid_temps = [
        r.temperature_2m
        for r in records
        if r.temperature_2m is not None
    ]

    valid_hums = [
        r.relative_humidity_2m
        for r in records
        if r.relative_humidity_2m is not None
    ]

    if not valid_temps or not valid_hums:
        raise HTTPException(
            status_code=500,
            detail="Insufficient weather records to evaluate risk."
        )

    avg_temp = sum(valid_temps) / len(valid_temps)
    avg_hum = sum(valid_hums) / len(valid_hums)

    high_humidity_hours = sum(
        1
        for h in valid_hums
        if h >= 80
    )

    if (
        avg_hum >= 75
        and high_humidity_hours >= 6
        and 18 <= avg_temp <= 30
    ):
        level = "HIGH"
        action = True

        summary = (
            f"Favorable conditions for fungal outbreak: "
            f"{high_humidity_hours} hours of humidity ≥ 80% "
            f"with average temperature of {avg_temp:.1f}°C."
        )

    elif avg_hum >= 60:
        level = "MODERATE"
        action = False

        summary = (
            "Moderate humidity. "
            "Continue monitoring crop conditions."
        )

    else:
        level = "LOW"
        action = False

        summary = (
            "Dry weather conditions. "
            "Low probability of fungal spore germination."
        )

    return FungalRiskAssessment(
        latitude=latitude,
        longitude=longitude,
        evaluated_hours=len(records),
        avg_temperature=round(avg_temp, 2),
        avg_humidity=round(avg_hum, 2),
        risk_level=level,
        action_required=action,
        summary=summary,
    )