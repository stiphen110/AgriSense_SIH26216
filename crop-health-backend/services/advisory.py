import json

with open("data/advisories.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# The advisory JSON stores all disease advisories
# inside the top-level "advisories" object.
ADVISORIES = data.get("advisories", data)


def get_advisory(disease: str):

    advisory = ADVISORIES.get(disease)

    if not advisory:
        return {
            "title": "General Crop Health Advisory",
            "actions": [
                "Monitor the affected crop",
                "Capture a clearer image",
                "Contact an agriculture extension officer if symptoms continue"
            ],
            "warning": "Do not apply treatments without confirming the diagnosis.",
            "referral": "Contact your local agriculture extension service."
        }

    return advisory