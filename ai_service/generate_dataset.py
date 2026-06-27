"""
Dataset Generator for Department Detection
Generates a large complaints.csv with 1000+ rows using templates + variations.

Run: python generate_dataset.py
Output: complaints.csv  (ready to use with ai_service.py)
"""

import csv
import random

# ─────────────────────────────────────────────
# TEMPLATES PER DEPARTMENT
# Each template has {slot} placeholders filled with variants
# ─────────────────────────────────────────────

TEMPLATES = {

    "Electricity": [
        "electricity {problem} in my {place}",
        "power {problem} in our {area}",
        "no electricity in {place} since {time}",
        "street light {issue} near {location}",
        "electric pole {damage} on {road}",
        "live wire {lying} on {road}",
        "transformer {issue} in our {area}",
        "no power supply for {time}",
        "current is not there since {time}",
        "light is not coming in {place}",
        "voltage {problem} at {place}",
        "electric meter {issue} at {place}",
        "short circuit {happened} near {place}",
        "wires hanging dangerously near {location}",
        "fuse blown in {area}",
        "power cut since {time}",
        "power fluctuation {damaging} appliances in {place}",
        "no light in our {area} at night",
        "electric shock from switchboard in {place}",
        "underground cable exposed near {location}",
        "electricity bill {issue} for {place}",
        "new electricity connection needed at {place}",
        "inverter not charging due to no power in {place}",
        "street lamp flickering at night near {location}",
        "light pole fell on {road}",
    ],

    "Police": [
        "fight {broke} out near {location}",
        "someone {attacked} me near {location}",
        "robbery happened at {place} {time_ago}",
        "theft of {item} in {area}",
        "chain snatching near {location}",
        "drunk person creating nuisance near {location}",
        "violence happening at night near {location}",
        "illegal gambling in {area}",
        "car broken into near {location}",
        "stalking by unknown person in {area}",
        "{item} stolen from {place}",
        "eve teasing happening on {road}",
        "domestic violence complaint in {area}",
        "someone threatening {family} in {area}",
        "public disorder near {location}",
        "suspicious person roaming in {area}",
        "drug dealing happening in {area}",
        "harassment by neighbor in {area}",
        "vandalism on {road}",
        "assault complaint near {location}",
        "extortion threat received in {area}",
        "molestation complaint near {location}",
        "burglary at house in {area}",
        "noise complaint violent situation near {location}",
        "illegal activity happening near {location}",
    ],

    "Municipal": [
        "garbage not collected in {area} for {time}",
        "drain blocked near {location}",
        "sewage overflow on {road}",
        "garbage bin overflowing near {location}",
        "waste dumped illegally near {location}",
        "{road} very dirty no cleaning done",
        "open drain causing issues near {location}",
        "garbage truck not coming to {area}",
        "sweeper not cleaning {road}",
        "dead animal lying on {road} not removed",
        "construction waste dumped on {road}",
        "no dustbin provided in {area}",
        "public toilet very dirty near {location}",
        "drainage water flooding {road}",
        "waste burning near houses in {area}",
        "garbage smell unbearable in {area}",
        "manhole open and dangerous on {road}",
        "sewage line choked in {area}",
        "litter everywhere on {road}",
        "garbage heap near {location}",
        "no sanitation workers coming to {area}",
        "biomedical waste dumped openly near {location}",
        "cleanliness issue in {area}",
        "drain overflow causing waterlogging on {road}",
        "sanitation problem in {area} since {time}",
    ],

    "Water Supply": [
        "no water supply in {area} since {time}",
        "water pipe burst on {road}",
        "dirty water coming from tap at {place}",
        "water tank not filled in {area} for {time}",
        "no water pressure at {place}",
        "pipeline leaking on {road}",
        "borewell not working in {area}",
        "water contamination in {area}",
        "water meter broken at {place}",
        "water supply irregular in {area}",
        "tap water smells bad at {place}",
        "water pipeline broken underground near {location}",
        "no drinking water available in {area}",
        "water problem at {place}",
        "tap is dry no water coming at {place}",
        "water not coming from tap at {place} since {time}",
        "water shortage in {area}",
        "muddy water from tap at {place}",
        "water supply stopped suddenly in {area}",
        "water tanker not arrived in {area}",
        "yellow water from tap in {place}",
        "no piped water connection in {area}",
        "water supply cut without notice in {area}",
        "water logging due to pipeline overflow on {road}",
        "water leakage wasting water on {road}",
    ],

    "Traffic": [
        "traffic signal not working at {location}",
        "traffic jam on {road}",
        "pothole causing accidents on {road}",
        "road divider broken near {location}",
        "no speed breaker near {location}",
        "wrong side driving on {road}",
        "road marking faded on {road}",
        "illegal parking blocking {road}",
        "no traffic police at {location}",
        "road encroachment by vendors on {road}",
        "footpath broken on {road}",
        "flyover lights not working near {location}",
        "missing road signboard near {location}",
        "bus stop damaged near {location}",
        "autos blocking {road}",
        "road accident spot needs attention at {location}",
        "no zebra crossing on {road}",
        "road needs repair near {location}",
        "road caved in due to rain on {road}",
        "traffic light broken at {location}",
        "signal not changing at {location}",
        "road damage due to rain on {road}",
        "construction blocking traffic on {road}",
        "road is dangerous due to potholes on {road}",
        "no streetlight causing accidents on {road} at night",
    ],

    "General": [
        "general complaint about {area}",
        "need help with civic issue in {area}",
        "public nuisance in {area}",
        "miscellaneous issue in {area}",
        "something wrong in {area}",
        "complaint regarding {area}",
        "unresolved issue in {area}",
        "requesting attention for {area}",
        "civic problem in {area}",
        "grievance from {area}",
    ],
}

# ─────────────────────────────────────────────
# SLOT VALUES
# ─────────────────────────────────────────────

SLOTS = {
    "problem":   ["problem", "issue", "outage", "failure", "fault", "cut", "disruption", "not working"],
    "issue":     ["issue", "problem", "fault", "not working", "broken", "failure"],
    "damage":    ["is broken", "is damaged", "fell down", "is leaning dangerously"],
    "lying":     ["is lying", "is hanging", "fell and lying"],
    "happened":  ["happened", "occurred", "broke out"],
    "damaging":  ["damaging", "affecting", "destroying"],
    "broke":     ["broke", "broke out", "erupted"],
    "attacked":  ["attacked", "assaulted", "hit"],
    "family":    ["my family", "us", "my children", "my wife", "my husband"],
    "item":      ["bike", "car", "mobile", "wallet", "gold chain", "laptop", "scooter"],
    "road":      ["main road", "our street", "the highway", "the lane", "our road", "the bypass", "service road"],
    "location":  ["the bus stop", "the park", "the junction", "the market", "the school", "the temple", "the signal", "our gate"],
    "area":      ["our colony", "our area", "our ward", "our street", "our neighborhood", "our locality", "our block"],
    "place":     ["my house", "our building", "our apartment", "our flat", "our office", "our shop"],
    "time":      ["2 days", "3 days", "a week", "5 hours", "since yesterday", "since morning", "since last night"],
    "time_ago":  ["last night", "yesterday", "2 days ago", "this morning", "an hour ago"],
}

# ─────────────────────────────────────────────
# GENERATOR
# ─────────────────────────────────────────────

def fill_template(template):
    result = template
    for slot, values in SLOTS.items():
        placeholder = "{" + slot + "}"
        if placeholder in result:
            result = result.replace(placeholder, random.choice(values))
    return result


def generate_dataset(rows_per_dept=200):
    rows = []
    for dept, templates in TEMPLATES.items():
        count = 0
        attempts = 0
        seen = set()
        target = rows_per_dept if dept != "General" else 50

        while count < target and attempts < target * 20:
            template = random.choice(templates)
            text = fill_template(template)
            attempts += 1
            if text not in seen:
                seen.add(text)
                rows.append((text, dept))
                count += 1

        print(f"  ✅ {dept}: {count} samples")

    random.shuffle(rows)
    return rows


def save_csv(rows, path="complaints.csv"):
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["description", "department"])
        writer.writerows(rows)
    print(f"\n💾 Saved {len(rows)} rows to: {path}")


if __name__ == "__main__":
    print("🔧 Generating complaint dataset...\n")
    rows = generate_dataset(rows_per_dept=200)
    save_csv(rows, "complaints.csv")
    print("\n✅ Done! Now run: python ai_service.py")