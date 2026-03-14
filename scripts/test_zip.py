"""
Ground truth: Find all food pantries in zip code 10001.
Reports count and average confidence score.
"""

import pandas as pd

resources = pd.read_csv("data/resources/resources.csv")

pantries = resources[
    (resources["zip_code"] == "10001") &
    (resources["resource_type_id"] == "FOOD_PANTRY")
]

print(f"Food pantries in 10001: {len(pantries)}")
print(f"Average confidence: {pantries['confidence'].mean():.4f}")
print()
print(pantries[["id", "name", "confidence"]].to_string(index=False))
