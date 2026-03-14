import Anthropic from "@anthropic-ai/sdk";
import { Sandbox } from "@e2b/code-interpreter";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { SYSTEM_PROMPT } from "./systemPrompt";
import { TOOLS } from "./tools";

// CSV files to upload into the sandbox
const CSV_DIR = path.join(__dirname, "..", "data", "resources");
const CSV_FILES = ["resources.csv", "descriptions.csv", "shifts.csv", "occurrences.csv", "tags.csv", "flags.csv"];

// Python bootstrap that loads all CSVs into DataFrames
const PYTHON_BOOTSTRAP = `
import pandas as pd
import json
import random
import hashlib
import requests
from urllib.parse import urlparse
from datetime import datetime
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ALLOWED_DOMAINS = {"platform.foodhelpline.org"}

def _is_allowed_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    return parsed.scheme == "https" and parsed.netloc in ALLOWED_DOMAINS

_original_request = requests.request

def _guarded_request(method, url, **kwargs):
    if not _is_allowed_url(url):
        raise PermissionError(f"Blocked outbound request to non-allowlisted host: {url}")
    timeout = kwargs.pop("timeout", 10)
    return _original_request(method, url, timeout=timeout, **kwargs)

requests.request = _guarded_request
requests.get = lambda url, **kwargs: _guarded_request("GET", url, **kwargs)

# Force string types on ID/zip columns so they don't get read as numbers
_str_cols = {"id", "resource_id", "shift_id", "resource_type_id", "resource_status_id",
             "source_id", "tag_category_id", "zip_code"}

def _load(path):
    df = pd.read_csv(path, dtype={c: str for c in _str_cols}, keep_default_na=True)
    return df

resources = _load("/home/user/data/resources.csv")
descriptions = _load("/home/user/data/descriptions.csv")
shifts = _load("/home/user/data/shifts.csv")
occurrences = _load("/home/user/data/occurrences.csv")
tags = _load("/home/user/data/tags.csv")
flags = _load("/home/user/data/flags.csv")

# --- CORE ANALYSIS FUNCTIONS ---

def get_resources(**kwargs):
    """
    Fetches food resources by filtering the pre-loaded 'resources' DataFrame.
    """
    df = resources.copy()

    zip_value = kwargs.get('zip') or kwargs.get('zip_code')
    if zip_value:
        df = df[df['zip_code'] == str(zip_value)]
        
    if kwargs.get('region'):
        region = kwargs['region'].lower()
        mask = (
            df['city'].str.lower().str.contains(region, na=False) | 
            df['address_street1'].str.lower().str.contains(region, na=False)
        )
        df = df[mask]
        
    if kwargs.get('text'):
        text = kwargs['text'].lower()
        df = df[df['name'].str.lower().str.contains(text, na=False)]
        
    if kwargs.get('sort') and kwargs['sort'] in df.columns:
        df = df.sort_values(by=kwargs['sort'])

    take = kwargs.get('take', 50)
    return df.head(take)

def filter_resources(
    zip=None,
    region=None,
    city=None,
    resource_type=None,
    status=None,
    priority_min=None,
    resource_ids=None,
):
    """
    Flexible filter over the local resources DataFrame.
    """
    df = resources.copy()

    if zip is not None:
        df = df[df["zip_code"] == str(zip)]
    if city is not None:
        df = df[df["city"].str.lower() == str(city).lower()]
    if region is not None:
        region_l = str(region).lower()
        mask = (
            df["city"].str.lower().str.contains(region_l, na=False)
            | df["address_street1"].str.lower().str.contains(region_l, na=False)
        )
        df = df[mask]
    if resource_type is not None and "resource_type_id" in df.columns:
        df = df[df["resource_type_id"] == str(resource_type)]
    if status is not None and "resource_status_id" in df.columns:
        df = df[df["resource_status_id"] == str(status)]
    if priority_min is not None and "priority" in df.columns:
        df["priority"] = pd.to_numeric(df["priority"], errors="coerce").fillna(-1)
        df = df[df["priority"] >= int(priority_min)]
    if resource_ids is not None:
        ids = set([str(x) for x in resource_ids])
        df = df[df["id"].isin(ids)]
    return df

def _seeded_rng(seed: str) -> random.Random:
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return random.Random(int(digest[:16], 16))

def _pick(rng: random.Random, arr):
    return arr[rng.randrange(0, len(arr))]

def _weighted_pick(rng: random.Random, items, weights):
    total = sum(weights)
    roll = rng.random() * total
    for item, weight in zip(items, weights):
        roll -= weight
        if roll <= 0:
            return item
    return items[-1]

def _random_date(rng: random.Random, days_back=365):
    now = pd.Timestamp.utcnow()
    offset = pd.Timedelta(
        days=rng.randint(0, days_back),
        hours=rng.randint(0, 23),
        minutes=rng.randint(0, 59),
    )
    return (now - offset).isoformat()

POSITIVE_TEXTS = [
    "Amazing variety of fresh produce today. The volunteers were incredibly kind and welcoming.",
    "Really impressed with the selection. Got fresh vegetables, bread, and canned goods. Will definitely return.",
    "Staff were so helpful and respectful. No judgment, just genuine kindness. Thank you.",
    "Wonderful experience. They had meat, dairy, and fresh fruit. More than I expected.",
    "The volunteers remembered me from last time. Such a warm community here.",
    "Very organized and efficient. Was in and out in 15 minutes with a full bag.",
    "Fresh bread and vegetables today. Everything was clean and well presented.",
    "They had halal options available which was so important for my family.",
]

NEUTRAL_TEXTS = [
    "Decent selection but ran out of bread by the time I got there.",
    "Wait was longer than usual today, about 45 minutes. Staff were apologetic.",
    "Got some basics but selection was more limited than previous visits.",
    "Fine experience overall. Nothing special but nothing bad either.",
    "They were low on fresh produce but had plenty of canned goods.",
    "Mixed visit. Long line but staff were friendly once inside.",
    "Okay selection today. Hoping for more variety next time.",
    "Limited parking made it difficult but the pantry itself was well run.",
]

NEGATIVE_TEXTS = [
    "Arrived at 10am and was told they were already out of food. Very disappointing.",
    "The listing says open until 2pm but they closed at noon. Wasted my trip.",
    "Waited over an hour only to be told they couldn't help me without an ID I didn't know I needed.",
    "Hours on the website are completely wrong. Please update them.",
    "The address listed is different from the actual location. Took me 30 minutes to find.",
    "Staff were dismissive and made me feel unwelcome. Will not be returning.",
    "Not enough staff for the number of people waiting. Chaotic and disorganized.",
    "Food was past its use-by date. Health concern that should be addressed.",
]

DID_NOT_ATTEND_REASONS = [
    "Location was closed when I arrived",
    "Arrived too late, they had stopped distributing",
    "Too far to travel without transportation",
    "Ran out of food before I reached the front",
    "Did not have required ID documentation",
    "Outside of their service zip code area",
    "Could not find the location — address was incorrect",
    "Wait time was too long, had to leave for work",
]

def get_reviews(resource_id):
    """
    Generates synthetic reviews for a specific resource_id to support analysis demos.
    """
    rng = _seeded_rng(resource_id)
    row = resources[resources["id"] == str(resource_id)]
    review_count = 10
    if not row.empty and "review_count" in row.columns:
        try:
            review_count = int(pd.to_numeric(row["review_count"].iloc[0], errors="coerce"))
        except Exception:
            review_count = 10
    review_count = max(5, min(review_count, 50))

    reviews = []
    for _ in range(review_count):
        outcome_roll = rng.random()

        if outcome_roll < 0.6:
            attended = True
            rating = _weighted_pick(rng, [5, 4, 3], [50, 35, 15])
            text = _pick(rng, POSITIVE_TEXTS)
            wait = rng.randint(5, 30)
            info_accurate = rng.random() > 0.05
        elif outcome_roll < 0.85:
            attended = True
            rating = _weighted_pick(rng, [3, 2], [60, 40])
            text = _pick(rng, NEUTRAL_TEXTS)
            wait = rng.randint(20, 75)
            info_accurate = rng.random() > 0.2
        else:
            attended = rng.random() > 0.4
            rating = _weighted_pick(rng, [2, 1], [40, 60])
            text = _pick(rng, NEGATIVE_TEXTS)
            wait = rng.randint(0, 90) if attended else None
            info_accurate = rng.random() > 0.55

        reviews.append({
            "id": hashlib.md5(f"{resource_id}-{rng.random()}".encode("utf-8")).hexdigest(),
            "created_at": _random_date(rng, 365),
            "resource_id": str(resource_id),
            "attended": attended,
            "did_not_attend_reason": _pick(rng, DID_NOT_ATTEND_REASONS) if not attended else None,
            "rating": rating,
            "text": text if rng.random() > 0.1 else None,
            "wait_time_minutes": wait,
            "information_accurate": info_accurate,
        })

    return pd.DataFrame(reviews)

def get_wait_time_trends(resource_id):
    """
    Computes weekly average wait times using synthetic reviews.
    """
    df = get_reviews(resource_id)
    if df.empty or "wait_time_minutes" not in df.columns:
        return pd.DataFrame(columns=["week", "avg_wait_minutes"])
    df = df.dropna(subset=["wait_time_minutes"]).copy()
    if df.empty:
        return pd.DataFrame(columns=["week", "avg_wait_minutes"])
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    df = df.dropna(subset=["created_at"])
    if df.empty:
        return pd.DataFrame(columns=["week", "avg_wait_minutes"])
    df["week"] = df["created_at"].dt.to_period("W").apply(lambda p: p.start_time.date())
    trend = (
        df.groupby("week")["wait_time_minutes"]
        .mean()
        .reset_index()
        .rename(columns={"wait_time_minutes": "avg_wait_minutes"})
        .sort_values("week")
    )
    return trend

def fetch_json(url):
    """
    Fetch JSON from an allowlisted host.
    """
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def filter_occurrences(resource_ids=None, date_from=None, date_to=None, include_cancelled=False):
    """
    Filter occurrences by resource_ids and date window.
    """
    df = occurrences.copy()
    if not include_cancelled and "skipped_at" in df.columns:
        df = df[df["skipped_at"].isna()]
    if resource_ids is not None:
        ids = set([str(x) for x in resource_ids])
        df = df[df["resource_id"].isin(ids)]
    if "start_time" in df.columns:
        df["start_time"] = pd.to_datetime(df["start_time"], errors="coerce")
        if date_from is not None:
            df = df[df["start_time"] >= pd.to_datetime(date_from)]
        if date_to is not None:
            df = df[df["start_time"] <= pd.to_datetime(date_to)]
    return df

def filter_reviews(
    resource_ids=None,
    date_from=None,
    date_to=None,
    attended=None,
    rating_min=None,
    max_resources=25,
):
    """
    Aggregate synthetic reviews across resources and apply filters.
    """
    if resource_ids is None:
        resource_ids = resources["id"].head(int(max_resources)).tolist()
    reviews = pd.concat([get_reviews(rid) for rid in resource_ids], ignore_index=True)
    if reviews.empty:
        return reviews
    reviews["created_at"] = pd.to_datetime(reviews["created_at"], errors="coerce")
    if date_from is not None:
        reviews = reviews[reviews["created_at"] >= pd.to_datetime(date_from)]
    if date_to is not None:
        reviews = reviews[reviews["created_at"] <= pd.to_datetime(date_to)]
    if attended is not None and "attended" in reviews.columns:
        reviews = reviews[reviews["attended"] == bool(attended)]
    if rating_min is not None and "rating" in reviews.columns:
        reviews = reviews[pd.to_numeric(reviews["rating"], errors="coerce") >= float(rating_min)]
    return reviews

def categorize_feedback(reviews_df):
    """
    Automated NLP categorization of free-text reviews. 
    """
    if reviews_df.empty or 'text' not in reviews_df.columns:
        return reviews_df
    
    categories = {
        'Service': ['volunteer', 'staff', 'friendly', 'kind', 'rude', 'organized'],
        'Food Quality': ['fresh', 'produce', 'vegetables', 'meat', 'dairy', 'eggs', 'expired'],
        'Wait Time': ['wait', 'hour', 'minutes', 'line', 'queue', 'slow'],
        'Access/Hours': ['closed', 'hours', 'address', 'location', 'zip', 'distance']
    }
    
    def get_category(text):
        if not isinstance(text, str): return 'Other'
        text = text.lower()
        for cat, keywords in categories.items():
            if any(kw in text for kw in keywords):
                return cat
        return 'General'
    
    reviews_df['category'] = reviews_df['text'].apply(get_category)
    return reviews_df

def summarize_feedback(reviews_df):
    """
    Summarize structured feedback metrics and category distribution.
    """
    if reviews_df is None or reviews_df.empty:
        return {
            "review_count": 0,
            "avg_rating": None,
            "avg_wait_minutes": None,
            "attended_rate": None,
            "info_inaccurate_rate": None,
            "category_counts": {},
        }
    df = reviews_df.copy()
    avg_rating = pd.to_numeric(df.get("rating"), errors="coerce").mean()
    avg_wait = pd.to_numeric(df.get("wait_time_minutes"), errors="coerce").mean()
    attended_rate = df["attended"].mean() if "attended" in df.columns else None
    if "information_accurate" in df.columns:
        info_inaccurate_rate = 1.0 - df["information_accurate"].mean()
    else:
        info_inaccurate_rate = None
    if "category" not in df.columns:
        df = categorize_feedback(df)
    category_counts = df["category"].value_counts().to_dict() if "category" in df.columns else {}
    return {
        "review_count": int(len(df)),
        "avg_rating": None if pd.isna(avg_rating) else float(avg_rating),
        "avg_wait_minutes": None if pd.isna(avg_wait) else float(avg_wait),
        "attended_rate": None if attended_rate is None else float(attended_rate),
        "info_inaccurate_rate": None if info_inaccurate_rate is None else float(info_inaccurate_rate),
        "category_counts": category_counts,
    }

def extract_key_phrases(reviews_df, top_n=10):
    """
    Extract simple key phrases by token frequency.
    """
    if reviews_df is None or reviews_df.empty or "text" not in reviews_df.columns:
        return []
    stop = {
        "the","and","or","to","of","a","in","is","was","were","for","on","with","it","they","we","had",
        "this","that","at","as","be","from","by","an","if","but","not","my","our","their","your","me"
    }
    tokens = []
    for text in reviews_df["text"].dropna().astype(str).tolist():
        for token in "".join(ch.lower() if ch.isalnum() else " " for ch in text).split():
            if len(token) > 2 and token not in stop:
                tokens.append(token)
    if not tokens:
        return []
    counts = pd.Series(tokens).value_counts().head(int(top_n))
    return counts.to_dict()

def sentiment_score(reviews_df):
    """
    Simple lexicon sentiment score in [-1, 1].
    """
    if reviews_df is None or reviews_df.empty or "text" not in reviews_df.columns:
        return None
    positive = {"amazing","great","good","helpful","kind","friendly","fresh","wonderful","excellent","organized","clean"}
    negative = {"bad","rude","disappointing","chaotic","dirty","expired","long","slow","closed","wasted","unwelcoming"}
    scores = []
    for text in reviews_df["text"].dropna().astype(str).tolist():
        tokens = set("".join(ch.lower() if ch.isalnum() else " " for ch in text).split())
        score = len(tokens & positive) - len(tokens & negative)
        scores.append(score)
    if not scores:
        return None
    max_abs = max(1, max(abs(s) for s in scores))
    return float(sum(scores) / (len(scores) * max_abs))

def get_neighborhood_stats(region):
    """
    Performs geographic gap analysis for a specific neighborhood.
    """
    df = get_resources(region=region)
    if df.empty:
        return pd.DataFrame()
    
    stats = df.groupby('resource_type_id').agg({
        'id': 'count',
        'zip_code': 'nunique'
    }).rename(columns={'id': 'resource_count', 'zip_code': 'unique_zip_codes'})
    return stats

def get_service_disruptions():
    """
    Identifies service disruptions by joining 'shifts' and 'occurrences' to find cancelled events.
    """
    if 'occurrences' not in globals() or 'resources' not in globals():
        return pd.DataFrame()
        
    # Get occurrences that have a skipped_at date (cancelled)
    cancelled = occurrences.dropna(subset=['skipped_at'])
    
    # Merge with resources to get the names
    disruptions = pd.merge(cancelled, resources[['id', 'name']], left_on='resource_id', right_on='id', suffixes=('', '_resource'))
    return disruptions[['resource_id', 'name', 'skipped_at', 'address', 'start_time']]

def disruption_summary(date_from=None, date_to=None):
    """
    Summarize cancelled occurrences within a date range.
    """
    df = get_service_disruptions()
    if df.empty:
        return {"cancelled_count": 0, "top_resources": {}}
    df["start_time"] = pd.to_datetime(df["start_time"], errors="coerce")
    if date_from is not None:
        df = df[df["start_time"] >= pd.to_datetime(date_from)]
    if date_to is not None:
        df = df[df["start_time"] <= pd.to_datetime(date_to)]
    top_resources = df["name"].value_counts().head(5).to_dict()
    return {"cancelled_count": int(len(df)), "top_resources": top_resources}

def wait_time_trends(resource_ids=None, date_from=None, date_to=None, group_by="week"):
    """
    Compute wait time trends for multiple resources.
    """
    reviews = filter_reviews(resource_ids=resource_ids, date_from=date_from, date_to=date_to)
    if reviews.empty:
        return pd.DataFrame(columns=[group_by, "avg_wait_minutes"])
    reviews = reviews.dropna(subset=["wait_time_minutes"]).copy()
    reviews["created_at"] = pd.to_datetime(reviews["created_at"], errors="coerce")
    if group_by == "month":
        reviews["period"] = reviews["created_at"].dt.to_period("M").apply(lambda p: p.start_time.date())
    else:
        reviews["period"] = reviews["created_at"].dt.to_period("W").apply(lambda p: p.start_time.date())
    trend = (
        reviews.groupby("period")["wait_time_minutes"]
        .mean()
        .reset_index()
        .rename(columns={"period": group_by, "wait_time_minutes": "avg_wait_minutes"})
        .sort_values(group_by)
    )
    return trend

def compute_resource_breakdown(resources_df):
    """
    Groups food resources by their type and calculates the average wait time for each type.
    """
    summary = {}
    for r_type, group in resources_df.groupby('resource_type_id'):
        wait_times = pd.to_numeric(group['wait_time_minutes_average'], errors='coerce')
        avg_wait = wait_times.mean()
        summary[r_type] = {
            "total_count": len(group),
            "avg_wait_minutes": float(avg_wait) if not pd.isna(avg_wait) else 0.0
        }
    return {"breakdown": summary, "total_resources_analyzed": len(resources_df)}

def resource_type_breakdown(
    zip=None,
    region=None,
    city=None,
    resource_type=None,
    status=None,
    priority_min=None,
):
    """
    Resource type counts and avg wait time in a filtered slice.
    """
    df = filter_resources(
        zip=zip,
        region=region,
        city=city,
        resource_type=resource_type,
        status=status,
        priority_min=priority_min,
    )
    if df.empty:
        return {"breakdown": {}, "total_resources_analyzed": 0}
    summary = {}
    for r_type, group in df.groupby("resource_type_id"):
        wait_times = pd.to_numeric(group["wait_time_minutes_average"], errors="coerce")
        avg_wait = wait_times.mean()
        summary[r_type] = {
            "total_count": int(len(group)),
            "avg_wait_minutes": float(avg_wait) if not pd.isna(avg_wait) else 0.0,
        }
    return {"breakdown": summary, "total_resources_analyzed": int(len(df))}

def filter_active_high_priority(resources_df, min_priority=0):
    """
    Filters the dataset for resources that are currently PUBLISHED and have a 
    priority level at or above the requested threshold.
    """
    published = resources_df[resources_df['resource_status_id'] == 'PUBLISHED'].copy()
    published['priority'] = pd.to_numeric(published['priority'], errors='coerce').fillna(-1)
    filtered = published[published['priority'] >= min_priority]
    filtered = filtered.sort_values(by=['priority', 'rating_average'], ascending=[False, False])
    return filtered[['id', 'name', 'city', 'priority']].to_dict(orient='records')

def get_neighborhood_coverage(resources_df):
    """
    Analyzes which cities/neighborhoods have the most food assistance coverage versus
    which ones are sparsely populated with resources.
    """
    coverage = resources_df['city'].value_counts()
    top_served = coverage.head(5).to_dict()
    underserved = coverage[coverage == 1].index.tolist()
    return {
        "most_served_cities": top_served,
        "underserved_cities_count": len(underserved),
        "underserved_city_names": underserved
    }

def coverage_by_area(level="city"):
    """
    Coverage counts for city, zip_code, or region_ids.
    """
    df = resources.copy()
    if level == "zip":
        counts = df["zip_code"].value_counts()
    elif level == "region":
        if "region_ids" not in df.columns:
            return {"counts": {}, "underserved": []}
        exploded = df["region_ids"].dropna().apply(json.loads).explode()
        counts = exploded.value_counts()
    else:
        counts = df["city"].value_counts()
    top = counts.head(10).to_dict()
    underserved = counts[counts == 1].index.tolist()
    return {"counts": top, "underserved": underserved}

def _ensure_export_dir():
    export_dir = "/home/user/exports"
    os.makedirs(export_dir, exist_ok=True)
    return export_dir

def plot_trend(df, x, y, title="Trend"):
    """
    Save a line plot to /home/user/exports and return path.
    """
    export_dir = _ensure_export_dir()
    fig, ax = plt.subplots()
    ax.plot(df[x], df[y])
    ax.set_title(title)
    ax.set_xlabel(x)
    ax.set_ylabel(y)
    fig.autofmt_xdate()
    path = os.path.join(export_dir, f"trend_{int(datetime.utcnow().timestamp())}.png")
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return path

def plot_bar(df, x, y, title="Bar Chart"):
    """
    Save a bar chart to /home/user/exports and return path.
    """
    export_dir = _ensure_export_dir()
    fig, ax = plt.subplots()
    ax.bar(df[x], df[y])
    ax.set_title(title)
    ax.set_xlabel(x)
    ax.set_ylabel(y)
    fig.autofmt_xdate()
    path = os.path.join(export_dir, f"bar_{int(datetime.utcnow().timestamp())}.png")
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return path

def plot_map(resources_df):
    """
    Save a scatter plot of lat/long points to /home/user/exports and return path.
    """
    export_dir = _ensure_export_dir()
    df = resources_df.dropna(subset=["latitude", "longitude"]).copy()
    if len(df) > 1000:
        df = df.sample(1000, random_state=42)
    fig, ax = plt.subplots()
    ax.scatter(df["longitude"], df["latitude"], s=8, alpha=0.6)
    ax.set_title("Resource Locations")
    ax.set_xlabel("Longitude")
    ax.set_ylabel("Latitude")
    path = os.path.join(export_dir, f"map_{int(datetime.utcnow().timestamp())}.png")
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)
    return path

def generate_partner_report(region=None, date_from=None, date_to=None):
    """
    Generate a lightweight report dict for a region and time window.
    """
    filtered_resources = filter_resources(region=region)
    resource_ids = filtered_resources["id"].tolist()
    reviews = filter_reviews(resource_ids=resource_ids, date_from=date_from, date_to=date_to)
    reviews = categorize_feedback(reviews)
    summary = summarize_feedback(reviews)
    disruptions = disruption_summary(date_from=date_from, date_to=date_to)
    trends = wait_time_trends(resource_ids=resource_ids, date_from=date_from, date_to=date_to)
    coverage = coverage_by_area(level="city")
    return {
        "region": region,
        "resource_count": int(len(filtered_resources)),
        "feedback_summary": summary,
        "disruptions": disruptions,
        "wait_time_trends": trends.to_dict(orient="records"),
        "coverage": coverage,
    }

def export_report(report_dict, format="json"):
    """
    Export a report dict to /home/user/exports and return path.
    """
    export_dir = _ensure_export_dir()
    ts = int(datetime.utcnow().timestamp())
    if format == "html":
        path = os.path.join(export_dir, f"report_{ts}.html")
        html = "<html><body><pre>" + json.dumps(report_dict, indent=2) + "</pre></body></html>"
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
        return path
    path = os.path.join(export_dir, f"report_{ts}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report_dict, f, indent=2)
    return path

def load_public_dataset(path_or_url):
    """
    Load a public dataset from local path or allowlisted URL.
    """
    if isinstance(path_or_url, str) and path_or_url.startswith("http"):
        if not _is_allowed_url(path_or_url):
            raise PermissionError("Blocked public dataset URL (not allowlisted).")
        return pd.read_csv(path_or_url)
    return pd.read_csv(path_or_url)

def join_on_geo(resources_df, public_df, on="zip_code"):
    """
    Join resources with a public dataset on a geographic key.
    """
    return resources_df.merge(public_df, on=on, how="left")

print(f"Loaded: resources={len(resources)}, descriptions={len(descriptions)}, shifts={len(shifts)}, occurrences={len(occurrences)}, tags={len(tags)}, flags={len(flags)}")
print("Pre-loaded Functions: get_resources(), filter_resources(), filter_occurrences(), filter_reviews(), summarize_feedback(), extract_key_phrases(), sentiment_score(), get_reviews(), get_wait_time_trends(), wait_time_trends(), categorize_feedback(), get_neighborhood_stats(), get_service_disruptions(), disruption_summary(), compute_resource_breakdown(), resource_type_breakdown(), filter_active_high_priority(), get_neighborhood_coverage(), coverage_by_area(), plot_trend(), plot_bar(), plot_map(), generate_partner_report(), export_report(), load_public_dataset(), join_on_geo(), fetch_json()")
`;

const MAX_ITERATIONS = 12;
const MODEL = "claude-opus-4-5";
const MAX_CONSOLE_LINES = 20;

// After COMPACT_AFTER iterations, summarize older context using a fast model.
// The last KEEP_RECENT iteration pairs are kept fully intact.
const COMPACT_AFTER = 4;
const KEEP_RECENT = 3;
const SUMMARY_MODEL = "claude-haiku-4-5-20251001";

// Keep the first HEAD_LINES and last TAIL_LINES of output so Claude always sees
// the data shape (column headers) and the end of the output (summaries, totals).
// Anything in the middle is replaced with a count of omitted lines.
const HEAD_LINES = 30;
const TAIL_LINES = 10;
const MAX_LINE_LENGTH = 300;

function smartTruncate(text: string): string {
  // Truncate individual lines that are too wide (e.g. a single massive JSON blob)
  let lines = text.split("\n").map((line) =>
    line.length > MAX_LINE_LENGTH
      ? line.slice(0, MAX_LINE_LENGTH) + " ... (line truncated)"
      : line
  );

  // If the output fits, return as-is
  if (lines.length <= HEAD_LINES + TAIL_LINES) return lines.join("\n");

  // Keep head and tail so Claude sees column headers + final results
  const omitted = lines.length - HEAD_LINES - TAIL_LINES;
  return [
    ...lines.slice(0, HEAD_LINES),
    `\n... (${omitted} lines omitted)\n`,
    ...lines.slice(-TAIL_LINES),
  ].join("\n");
}

// Pre-installed packages for the sandbox environment.
// Covers data analysis, visualization, geo, and stats so Claude doesn't waste
// iterations pip-installing common libraries.
const SANDBOX_PACKAGES = [
  "pandas",
  "requests",
  "numpy",
  "matplotlib",
  "seaborn",
  "scipy",
  "geopy",
];

// Spin up an E2B sandbox with common data science libraries and pre-loaded CSV data.
async function initSandbox(): Promise<Sandbox> {
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });
  await sandbox.runCode(
    `import subprocess; subprocess.run(['pip', 'install', ${SANDBOX_PACKAGES.map((p) => `'${p}'`).join(", ")}, '-q'])`
  );

  // Upload CSV files into the sandbox
  await sandbox.runCode("import os; os.makedirs('/home/user/data', exist_ok=True)");
  for (const file of CSV_FILES) {
    const filePath = path.join(CSV_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  Warning: ${filePath} not found, skipping`);
      continue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    await sandbox.files.write(`/home/user/data/${file}`, content);
  }

  // Load CSVs into DataFrames
  await sandbox.runCode(PYTHON_BOOTSTRAP);
  return sandbox;
}

export async function createSandbox(): Promise<Sandbox> {
  return initSandbox();
}

// Run Python code in the sandbox and return the smartly truncated output.
// Preserves head (column headers) and tail (summaries) of the output so
// Claude always sees the data shape and final results.
async function executePython(sandbox: Sandbox, code: string): Promise<string> {
  let execResult: any;
  try {
    execResult = await sandbox.runCode(code);
  } catch (err: any) {
    execResult = {
      logs: { stdout: [], stderr: [err.message] },
      error: err,
    };
  }

  const stdout = (execResult.logs.stdout || []).join("").trim();
  const stderr = (execResult.logs.stderr || []).join("").trim();
  const error = execResult.error?.value || "";

  // Print a short console preview
  if (stdout) {
    const lines = stdout.split("\n");
    const display =
      lines.length > MAX_CONSOLE_LINES
        ? [...lines.slice(0, MAX_CONSOLE_LINES), `... (${lines.length - MAX_CONSOLE_LINES} more lines)`]
        : lines;
    display.forEach((l) => console.log(`    ${l}`));
  }
  if (error) console.log(`  Error: ${error.split("\n")[0]}`);
  else if (stderr) console.log(`  Stderr: ${stderr.split("\n")[0]}`);

  // Build and smart-truncate the output sent back to Claude
  let output = "";
  if (stdout) output += smartTruncate(stdout);
  if (stderr) output += `\nSTDERR:\n${stderr.split("\n").slice(0, 5).join("\n")}`;
  if (error) output += `\nERROR:\n${error}`;

  return output || "(no output)";
}

export async function runPython(sandbox: Sandbox, code: string): Promise<string> {
  return executePython(sandbox, code);
}

// Summarize older messages using a fast model (Haiku) and replace them with
// a single summary message. Keeps the original job message and the last
// KEEP_RECENT iteration pairs intact. Only triggers after COMPACT_AFTER iterations.
// Returns true if compaction happened.
async function compactContext(
  anthropic: Anthropic,
  messages: Anthropic.MessageParam[]
): Promise<boolean> {
  // Keep first message (job) and last KEEP_RECENT pairs intact.
  // Everything in between is eligible for compaction.
  const keepTail = KEEP_RECENT * 2;
  const toSummarize = messages.slice(1, messages.length - keepTail);

  // Only compact when there are enough old messages worth summarizing.
  // At minimum we need COMPACT_AFTER pairs (2 messages each) in the old zone.
  if (toSummarize.length < COMPACT_AFTER * 2) return false;

  // Serialize the old messages into a readable format for the summarizer
  const transcript = toSummarize
    .map((msg) => {
      if (typeof msg.content === "string") {
        return `${msg.role}: ${msg.content}`;
      }
      if (Array.isArray(msg.content)) {
        const parts = msg.content.map((block: any) => {
          if (block.type === "text") return block.text;
          if (block.type === "tool_use") {
            const reasoning = (block.input as any)?.reasoning || "";
            const code = (block.input as any)?.code || "";
            return `[execute_python: ${reasoning}]\n${code}`;
          }
          if (block.type === "tool_result") {
            const content =
              typeof block.content === "string"
                ? block.content
                : JSON.stringify(block.content);
            return `[output]: ${content}`;
          }
          return "";
        });
        return `${msg.role}: ${parts.join("\n")}`;
      }
      return "";
    })
    .join("\n\n");

  console.log("  Compacting context...");

  const summary = await anthropic.messages.create({
    model: SUMMARY_MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are summarizing the work-in-progress of a data analysis agent. Below is a transcript of the agent's earlier steps — the code it ran and the outputs it received. Summarize what was done, what was computed, what variables and files exist in the sandbox, and any key findings so far. Be specific about numbers, column names, variable names, and file paths. Be concise.\n\n${transcript}`,
      },
    ],
  });

  const summaryText =
    summary.content[0].type === "text" ? summary.content[0].text : "";

  // Replace the old messages with a single summary injected after the job message.
  // The conversation becomes: [job, summary, ...recent messages]
  messages.splice(1, toSummarize.length, {
    role: "user",
    content: `Summary of prior analysis steps:\n${summaryText}`,
  });

  // Need a valid assistant response after user message, insert a placeholder
  // only if the next message is also a user message (which would be invalid).
  if (messages[2]?.role === "user") {
    messages.splice(2, 0, {
      role: "assistant",
      content: [{ type: "text", text: "Understood, continuing the analysis." }],
    });
  }

  console.log("  Context compacted.\n");
  return true;
}

// Core agentic loop: sends the job to Claude, executes tool calls in a sandbox,
// and iterates until Claude calls finish_analysis or we hit MAX_ITERATIONS.
export async function runAgent(job: string) {
  console.log(`\nJob: ${job}\n`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("Setting up sandbox...");
  const sandbox = await initSandbox();
  console.log("Sandbox ready.\n");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Complete the following data analysis job:\n\n${job}\n\nThe data is already loaded as DataFrames. Answer exactly what is asked — nothing more. Call finish_analysis as soon as you have the answer.`,
    },
  ];

  let finalReport: { answer: string } | null = null;

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    console.log(`[${i}/${MAX_ITERATIONS}]`);

    // Summarize older iterations to keep context window lean
    await compactContext(anthropic, messages);

    // Ask Claude for the next step
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS as any,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    // Process each content block: print text, execute tools, or record the final report
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        console.log(`\n  ${block.text.trim()}`);
      }

      if (block.type !== "tool_use") continue;

      // finish_analysis = Claude is done, capture the report
      if (block.name === "finish_analysis") {
        finalReport = block.input as { answer: string };
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: "Report recorded.",
        });
        break;
      }

      // execute_python = run code in sandbox, return output to Claude
      if (block.name === "execute_python") {
        const { code, reasoning } = block.input as { code: string; reasoning: string };
        console.log(`\n  > ${reasoning}`);
        console.log(`  --- code ---\n${code}\n  --- end ---`);
        const output = await executePython(sandbox, code);
        const hasError = output.includes("ERROR:") || output.includes("Traceback");
        const budget = `[Step ${i}/${MAX_ITERATIONS}]`;
        let result = `${budget}\n${output}`;
        if (hasError) {
          result += "\n\nThe code above errored. Fix the issue and try again. Do not retry the exact same code.";
        }
        if (i >= MAX_ITERATIONS - 2) {
          result += "\n\nYou are running low on steps. Call finish_analysis with your best answer on the next step.";
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    // Feed tool results back into the conversation
    if (finalReport) {
      if (toolResults.length) messages.push({ role: "user", content: toolResults });
      break;
    }

    if (toolResults.length) {
      messages.push({ role: "user", content: toolResults });
    } else if (response.stop_reason === "end_turn") {
      // Claude stopped without using a tool or finishing — nudge it to finish
      messages.push({
        role: "user",
        content:
          `[Step ${i}/${MAX_ITERATIONS}] You stopped without calling finish_analysis. If you have enough data to answer the question, call finish_analysis now. Only run more code if you truly cannot answer yet.`,
      });
    }
  }

  await sandbox.kill();
  return finalReport;
}
