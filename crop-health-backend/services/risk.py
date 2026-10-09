def calculate_risk(
    temperature: float,
    humidity: float,
    rainfall: float,
    pest_count: int
):
    score = 0

    # Humidity
    if humidity >= 80:
        score += 30
    elif humidity >= 60:
        score += 15

    # Rainfall
    if rainfall >= 10:
        score += 25
    elif rainfall >= 5:
        score += 15

    # Temperature
    if 25 <= temperature <= 32:
        score += 20

    # Pest count
    if pest_count >= 20:
        score += 25
    elif pest_count >= 10:
        score += 15

    # Risk level
    if score >= 60:
        risk = "HIGH"
    elif score >= 30:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    return {
        "risk": risk,
        "score": min(score, 100)
    }