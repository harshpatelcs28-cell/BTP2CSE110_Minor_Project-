"""
Adaptive CropShield — Resource Optimization Module
Generates precision irrigation and fertilizer recommendations.
"""

CROP_OPTIMAL = {
    "rice":       dict(N=80, P=40, K=40, water_mm_week=70),
    "wheat":      dict(N=100, P=50, K=50, water_mm_week=40),
    "maize":      dict(N=80, P=50, K=50, water_mm_week=45),
    "cotton":     dict(N=120, P=50, K=20, water_mm_week=55),
    "sugarcane":  dict(N=250, P=60, K=60, water_mm_week=90),
    "chickpea":   dict(N=40, P=70, K=80, water_mm_week=30),
    "lentil":     dict(N=20, P=70, K=20, water_mm_week=28),
    "banana":     dict(N=110, P=85, K=55, water_mm_week=80),
    "mango":      dict(N=25, P=30, K=35, water_mm_week=35),
    "grapes":     dict(N=25, P=130, K=200, water_mm_week=42),
}
DEFAULT_OPT = dict(N=60, P=50, K=50, water_mm_week=50)

FERTILIZER_MAP = {
    "N": ("Urea (46-0-0)", 46),
    "P": ("DAP (18-46-0)", 46),
    "K": ("MOP (0-0-60)", 60),
}

DAYS_TO_HARVEST = {
    "rice": 120, "wheat": 120, "maize": 90, "cotton": 160, "sugarcane": 365,
    "chickpea": 90, "lentil": 85, "banana": 270, "mango": 90, "grapes": 150,
}

PRICE_PER_KG_INR = {"Urea": 6, "DAP": 27, "MOP": 18}


class ResourceOptimizer:

    def recommend(
        self,
        crop: str,
        N: float,
        P: float,
        K: float,
        rainfall: float,
        soil_type: str = "Alluvial",
        target_yield: float = None,
    ) -> dict:
        """
        Returns detailed water and fertilizer recommendations.
        """
        opt = CROP_OPTIMAL.get(crop.lower(), DEFAULT_OPT)
        days = DAYS_TO_HARVEST.get(crop.lower(), 100)

        water_rec = self._water_recommendation(opt, rainfall, soil_type)
        fert_rec = self._fertilizer_recommendation(opt, N, P, K, days)
        cost = self._estimate_cost(fert_rec, water_rec)

        return {
            "crop": crop,
            "water": water_rec,
            "fertilizers": fert_rec,
            "estimated_cost_inr": cost,
            "notes": self._notes(water_rec, fert_rec),
        }

    def _water_recommendation(self, opt: dict, rainfall: float, soil_type: str) -> dict:
        weekly_req = opt["water_mm_week"]
        rainfall_weekly_equiv = rainfall / 4.33
        deficit = max(0, weekly_req - rainfall_weekly_equiv)

        soil_factor = {
            "Sandy": 1.25, "Loamy": 1.0, "Alluvial": 0.95,
            "Black (Regur)": 0.85, "Red Laterite": 1.10, "Clayey": 0.80,
        }.get(soil_type, 1.0)

        irrigation_required = round(deficit * soil_factor, 1)

        return {
            "weekly_crop_requirement_mm": weekly_req,
            "rainfall_equivalent_mm_week": round(rainfall_weekly_equiv, 1),
            "irrigation_required_mm_week": irrigation_required,
            "status": "Sufficient" if irrigation_required == 0 else "Deficit",
            "method": "Drip irrigation recommended" if irrigation_required > 30 else "Sprinkler or flood",
        }

    def _fertilizer_recommendation(self, opt: dict, N: float, P: float, K: float, days: int) -> list:
        recs = []
        deficit_map = {"N": (opt["N"] - N), "P": (opt["P"] - P), "K": (opt["K"] - K)}

        for nutrient, deficit in deficit_map.items():
            fert_name, content_pct = FERTILIZER_MAP[nutrient]
            product = fert_name.split(" ")[0]
            if deficit > 0:
                kg_ha = round(deficit / (content_pct / 100), 1)
                cost = round(kg_ha * PRICE_PER_KG_INR.get(product, 15), 1)
                recs.append({
                    "nutrient": nutrient,
                    "deficit_kg_ha": round(deficit, 1),
                    "fertilizer": fert_name,
                    "application_kg_ha": kg_ha,
                    "application_timing": "Basal" if nutrient == "P" else "Split (basal + top-dress)",
                    "estimated_cost_inr_per_ha": cost,
                    "action": "Apply",
                })
            else:
                recs.append({
                    "nutrient": nutrient,
                    "deficit_kg_ha": 0,
                    "fertilizer": fert_name,
                    "application_kg_ha": 0,
                    "action": "Adequate — no application needed",
                })
        return recs

    def _estimate_cost(self, fert_recs: list, water_rec: dict) -> dict:
        fert_cost = sum(r.get("estimated_cost_inr_per_ha", 0) for r in fert_recs)
        water_cost = round(water_rec["irrigation_required_mm_week"] * 4.33 * 2.5, 1)
        return {
            "fertilizer_inr_per_ha": round(fert_cost, 1),
            "irrigation_inr_per_ha": water_cost,
            "total_inr_per_ha": round(fert_cost + water_cost, 1),
        }

    def _notes(self, water_rec: dict, fert_recs: list) -> list:
        notes = []
        if water_rec["status"] == "Sufficient":
            notes.append("Rainfall is adequate. Monitor for waterlogging in clayey soils.")
        else:
            notes.append(f"Install drip/sprinkler system. Apply {water_rec['irrigation_required_mm_week']} mm/week.")
        deficits = [r["nutrient"] for r in fert_recs if r.get("deficit_kg_ha", 0) > 0]
        if deficits:
            notes.append(f"Nutrient deficits detected: {', '.join(deficits)}. Apply before sowing for best results.")
        else:
            notes.append("Nutrient levels are within optimal range.")
        return notes
