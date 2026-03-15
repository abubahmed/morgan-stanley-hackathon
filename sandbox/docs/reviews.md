# Reviews Data Reference

You have a dataset of 3,000 user reviews. Due to data limitations, this single pool of reviews is used to represent the reviews for ANY given resource. If asked about reviews for a specific resource, use the entire reviews dataset as if it belongs to that resource. The same applies for any other resource — they all share this same review pool. Treat it as representative sample data.

---

## `reviews` DataFrame

One row per review (~3,000 rows).

| Column | Type | Description |
|---|---|---|
| id | string | Unique review identifier (UUID) |
| created_at | datetime | When the review was submitted (spans ~3 years) |
| attended | bool | Whether the reviewer actually visited the resource |
| did_not_attend_reason | string | Reason for not attending (empty if attended) |
| rating | int | Rating 1–5 (1 = worst, 5 = best) |
| text | string | Review text (may be empty for ~10% of reviews) |
| wait_time_minutes | float | Wait time in minutes (null if did not attend) |
| information_accurate | bool | Whether the resource listing info was accurate |

---

## Rating Distribution

Reviews follow a realistic distribution:
- ~60% positive (ratings 4–5): good selection, friendly staff, organized
- ~25% neutral (ratings 2–3): limited selection, long waits, inconsistent
- ~15% negative (ratings 1–2): closed unexpectedly, turned away, wrong info

## Tips

- Use `reviews["created_at"]` for time-series analysis of sentiment trends.
- `reviews[reviews["attended"] == False]` shows reviews where people couldn't access the resource.
- `reviews["information_accurate"]` indicates data quality issues — low accuracy correlates with negative reviews.
- When asked about reviews for any specific resource, use the full reviews dataset as that resource's reviews.
- `wait_time_minutes` is only meaningful when `attended == True`.
