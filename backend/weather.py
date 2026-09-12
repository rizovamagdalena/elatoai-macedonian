"""Weather lookup for elder companion context. Uses Open-Meteo (free, no API key)."""

from __future__ import annotations

import time
import httpx
from loguru import logger

_CACHE: dict[tuple[float, float], tuple[float, dict]] = {}
_CACHE_TTL_SECONDS = 1800  # 30 minutes

_WEATHER_CODE_DESCRIPTIONS = {
    0: "ведро",
    1: "претежно ведро",
    2: "делумно облачно",
    3: "облачно",
    45: "магла",
    48: "магла со слана",
    51: "слаб дожд",
    61: "дожд",
    71: "снег",
    80: "пороен дожд",
    95: "грмотевици",
}


def get_weather(lat: float, lon: float) -> dict | None:
    """Fetch current weather for a location, cached for 30 minutes."""
    cache_key = (round(lat, 2), round(lon, 2))
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached[0]) < _CACHE_TTL_SECONDS:
        return cached[1]

    try:
        response = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,weather_code",
                "timezone": "Europe/Skopje",
            },
            timeout=5.0,
        )
        response.raise_for_status()
        data = response.json()["current"]
        result = {
            "temperature_c": data["temperature_2m"],
            "description": _WEATHER_CODE_DESCRIPTIONS.get(data["weather_code"], "непознато"),
        }
        _CACHE[cache_key] = (time.time(), result)
        return result
    except Exception:
        logger.exception("Weather lookup failed for lat={}, lon={}", lat, lon)
        return None


def format_weather_for_prompt(weather: dict | None) -> str:
    if not weather:
        return "Weather data unavailable."
    return f"{weather['temperature_c']}°C, {weather['description']}"