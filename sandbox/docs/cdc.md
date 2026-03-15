# CDC PLACES Health Data Reference

You have county-level health estimates from the CDC PLACES dataset (2023 snapshot). One row per county.

---

## `cdc_health` DataFrame

2,957 counties. Keyed on `fips`.

### Identifiers

| Column | Type | Description |
|---|---|---|
| fips | string | 5-digit county FIPS code |
| state | string | 2-letter state abbreviation |
| county | string | County name |

### Health Outcomes (crude prevalence %)

| Column | Description |
|---|---|
| diabetes_pct | Diagnosed diabetes |
| obesity_pct | Obesity (BMI >= 30) |
| heart_disease_pct | Coronary heart disease |
| stroke_pct | Stroke |
| copd_pct | Chronic obstructive pulmonary disease |
| asthma_pct | Current asthma |
| depression_pct | Depression |
| high_blood_pressure_pct | High blood pressure |
| high_cholesterol_pct | High cholesterol |

### Health Status

| Column | Description |
|---|---|
| frequent_mental_distress_pct | Mental health not good >= 14 days/month |
| frequent_physical_distress_pct | Physical health not good >= 14 days/month |
| poor_health_pct | Fair or poor self-rated health |

### Health Risk Behaviors

| Column | Description |
|---|---|
| physical_inactivity_pct | No leisure-time physical activity |
| smoking_pct | Current smoking |
| binge_drinking_pct | Binge drinking |
| short_sleep_pct | Short sleep duration (< 7 hours) |

### Food, Housing & Transportation

| Column | Description |
|---|---|
| food_insecurity_pct | Food insecurity in past 12 months |
| food_stamp_pct | Received food stamps in past 12 months |
| lack_transportation_pct | Lack of reliable transportation in past 12 months |
| housing_insecurity_pct | Housing insecurity in past 12 months |

### Social & Access

| Column | Description |
|---|---|
| loneliness_pct | Loneliness |
| lack_social_support_pct | Lack of social and emotional support |
| no_health_insurance_pct | No health insurance |
| any_disability_pct | Any disability |

---

## Tips

- All values are percentages (crude prevalence). Some may be empty where CDC suppressed data.
- Join to other datasets on `fips`.
- Counties with high `diabetes_pct` + high `obesity_pct` + high `physical_inactivity_pct` correlate strongly with food desert conditions.
- `food_insecurity_pct` and `food_stamp_pct` are direct measures of food need — compare with USDA and Census SNAP data for cross-validation.
- `lack_transportation_pct` paired with Census `no_vehicle` data gives a strong picture of transportation barriers to food access.
- `frequent_mental_distress_pct` is a useful proxy for overall community wellbeing.
