import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Basic Claude client — text in, text out */
export async function ask(prompt: string) {
  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }

  console.log();
}

/** Claude client with code execution — runs code on Claude's servers */
export async function runCode(code: string): Promise<{ stdout: string; stderr: string; images: string[] }> {
  // The prelude is injected before the user's code to setup the sandbox environment.
  const PYTHON_PRELUDE = `
import sys
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import requests
import json
from urllib.parse import urlencode

# --- SECURITY BOUNDARIES ---
# Monkey-patch requests to ONLY allow calls to platform.foodhelpline.org
_original_request = requests.Session.request

def _safe_request(self, method, url, *args, **kwargs):
    if not url.startswith("https://platform.foodhelpline.org"):
        raise PermissionError(f"Sandbox Error: Network request to {url} is blocked by security policy.")
    return _original_request(self, method, url, *args, **kwargs)

requests.Session.request = _safe_request
requests.get = lambda url, **kwargs: requests.Session().get(url, **kwargs)
requests.post = lambda url, **kwargs: requests.Session().post(url, **kwargs)

# Remove potentially dangerous modules from the environment
bad_modules = ['os', 'subprocess', 'shutil', 'socket']
for mod in bad_modules:
    if mod in sys.modules:
        del sys.modules[mod]

# --- DATA FETCH & TOOLS ---
def get_resources(**kwargs):
    """
    Fetches resources from the Lemontree API and returns a pandas DataFrame.
    Example kwargs: zip="10001", text="pantry", sort="distance", take=50
    """
    base_url = "https://platform.foodhelpline.org/api/resources"
    
    # Map 'zip' kwarg to 'location' params as Lemontree API expects
    if 'zip' in kwargs:
        kwargs['location'] = kwargs.pop('zip')

    query_string = urlencode({k: v for k, v in kwargs.items() if v is not None})
    url = f"{base_url}?{query_string}" if query_string else base_url
    
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
    
    resources_list = data.get('resources', []) if isinstance(data, dict) and 'resources' in data else data
    if not isinstance(resources_list, list):
        resources_list = [resources_list]

    return pd.DataFrame(resources_list)

def get_reviews(resource_id):
    """
    Fetches user reviews for a specific resource ID and returns them as a pandas DataFrame.
    (Note: This requires the reviews endpoint to exist at /api/reviews)
    """
    url = f"https://platform.foodhelpline.org/api/reviews?resourceId={resource_id}"
    response = requests.get(url)
    
    # Gracefully handle 404s if the endpoint doesn't exist yet on production
    if response.status_code == 404:
        return pd.DataFrame()
        
    response.raise_for_status()
    data = response.json()
    
    reviews_list = data.get('reviews', []) if isinstance(data, dict) and 'reviews' in data else data
    if not isinstance(reviews_list, list):
        reviews_list = [reviews_list]
        
    return pd.DataFrame(reviews_list)

def fetch_json(url):
    """
    Generic data scraper. Fetches JSON from any allowed URL and returns it as a dict.
    Strictly constrained to platform.foodhelpline.org by security rules.
    """
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

def get_wait_time_trends(resource_id):
    """
    Analyzes wait time trends over time for a specific resource.
    Returns a DataFrame resampled by week to show service performance changes.
    """
    df = get_reviews(resource_id)
    if df.empty or 'waitTimeMinutes' not in df.columns:
        return pd.DataFrame()
    
    # Clean and convert to datetime
    df['createdAt'] = pd.to_datetime(df['createdAt'])
    df = df.dropna(subset=['waitTimeMinutes'])
    
    # Group by week and calculate mean wait time
    trends = df.set_index('createdAt')['waitTimeMinutes'].resample('W').mean().reset_index()
    trends.columns = ['week', 'avg_wait_minutes']
    return trends

def get_neighborhood_stats(region):
    """
    Aggregates resource performance by neighborhood/region.
    Helps partners identify geographic gaps in food access.
    """
    df = get_resources(region=region)
    if df.empty:
        return pd.DataFrame()
    
    stats = df.groupby('resourceTypeId').agg({
        'id': 'count',
        'zip': 'nunique'
    }).rename(columns={'id': 'resource_count', 'zip': 'unqiue_zip_codes'})
    return stats

def categorize_feedback(reviews_df):
    """
    Automates the categorization of free-text reviews into actionable buckets.
    Buckets: 'Service', 'Food Quality', 'Wait Time', 'Access/Hours'.
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

# Set matplotlib to non-interactive mode so it doesn't block
plt.switch_backend('Agg')

# --- END PRELUDE ---
`.trim();

  const fullPayload = `${PYTHON_PRELUDE}\n\n${code}`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Run this Python code and return the output. If the code generates a plot, make sure the plot is displayed so the tool captures it.\n\n\`\`\`python\n${fullPayload}\n\`\`\``,
      },
    ],
    tools: [{ type: "code_execution_20260120", name: "code_execution" }],
  });

  let stdout = "";
  let stderr = "";
  let images: string[] = [];

  for (const block of response.content) {
    if (block.type === "bash_code_execution_tool_result" || block.type === "tool_result") {
      const result = block.content;
      
      // The code execution tool can return text blocks (stdout/stderr) and image blocks (matplotlib plots)
      if (Array.isArray(result)) {
        for (const item of result) {
            if (item.type === "text") {
                stdout += item.text;
            }
        }
      } else if (result && typeof result === 'object') {
          if ('stdout' in result && result.stdout) stdout += String(result.stdout);
          if ('stderr' in result && result.stderr) stderr += String(result.stderr);
          
          // Depending on API version, figures are sometimes passed inside the tool result object.
          // Note: Anthropic's docs specify they might return an array of images.
      }
    }
  }
  
  // Actually, Anthropic's new code_execution returns blocks in standard message content if it generated a plot:
  for(const block of response.content) {
      if (block.type === "image" && block.source.type === "base64") {
          images.push(block.source.data);
      }
  }

  // Print results locally for backward compatibility with scripts/python.ts
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  return { stdout, stderr, images };
}
