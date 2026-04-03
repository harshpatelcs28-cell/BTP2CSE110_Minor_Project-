"""
Adaptive CropShield — Weather Service
Fetches real-time weather data from OpenWeatherMap API.
Falls back to simulated data if API key is not configured.
"""

import os
import math
import random
import requests
from datetime import datetime


class WeatherService:
    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
    RAIN_URL = "https://api.openweathermap.org/data/2.5/forecast"

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self._live = bool(api_key and api_key != "demo")

    def by_city(self, city: str) -> dict:
        if self._live:
            return self._fetch(params={"q": city, "units": "metric"})
        return self._simulated(location=city)

    def by_coords(self, lat: float, lon: float) -> dict:
        if self._live:
            return self._fetch(params={"lat": lat, "lon": lon, "units": "metric"})
        return self._simulated(location=f"{lat:.2f},{lon:.2f}")

    def _fetch(self, params: dict) -> dict:
        params["appid"] = self.api_key
        try:
            resp = requests.get(self.BASE_URL, params=params, timeout=6)
            resp.raise_for_status()
            data = resp.json()

            rain_1h = data.get("rain", {}).get("1h", 0.0)
            rain_3h = data.get("rain", {}).get("3h", 0.0)

            return {
                "city": data["name"],
                "country": data["sys"]["country"],
                "temperature": round(data["main"]["temp"], 1),
                "feels_like": round(data["main"]["feels_like"], 1),
                "humidity": data["main"]["humidity"],
                "pressure_hpa": data["main"]["pressure"],
                "wind_speed_kmh": round(data["wind"]["speed"] * 3.6, 1),
                "description": data["weather"][0]["description"].title(),
                "rainfall_1h_mm": round(rain_1h, 2),
                "rainfall_3h_mm": round(rain_3h, 2),
                "clouds_pct": data["clouds"]["all"],
                "uv_index": None,
                "fetched_at": datetime.utcnow().isoformat(),
                "source": "openweathermap",
            }
        except requests.RequestException as e:
            raise RuntimeError(f"OpenWeatherMap API error: {e}")

    def _simulated(self, location: str) -> dict:
        """
        Generates plausible simulated weather data for demo mode.
        Seeded by location string for consistency.
        """
        seed = abs(hash(location)) % 10000
        rng = random.Random(seed + int(datetime.utcnow().strftime("%H")))

        temp = round(rng.gauss(26, 5), 1)
        humid = round(rng.gauss(68, 12), 0)
        rain = max(0, round(rng.gauss(45, 30), 1))

        return {
            "city": location,
            "country": "IN",
            "temperature": max(10, min(45, temp)),
            "feels_like": round(temp + rng.gauss(1, 1), 1),
            "humidity": max(20, min(100, int(humid))),
            "pressure_hpa": int(rng.gauss(1012, 8)),
            "wind_speed_kmh": round(abs(rng.gauss(12, 6)), 1),
            "description": rng.choice(["Partly Cloudy", "Clear Sky", "Scattered Clouds", "Moderate Rain", "Haze"]),
            "rainfall_1h_mm": round(rng.uniform(0, 4), 2),
            "rainfall_3h_mm": round(rain / 10, 2),
            "clouds_pct": int(rng.uniform(10, 80)),
            "uv_index": round(rng.uniform(3, 10), 1),
            "fetched_at": datetime.utcnow().isoformat(),
            "source": "simulated_demo",
        }
