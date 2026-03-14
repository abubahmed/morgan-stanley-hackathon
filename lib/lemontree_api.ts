const BASE_URL = "https://platform.foodhelpline.org"

async function fetchLemontree(path: string, params: Record<string, any> = {}) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value != null) qs.set(key, String(value))
  }
  const url = `${BASE_URL}${path}${qs.toString() ? `?${qs}` : ""}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Lemontree API error: ${res.status} ${res.statusText}`)
  const raw = await res.json()
  return raw.json ?? raw
}

// Resources 

// Get a page of resources — provide location (zip) OR lat+lng
export type GetResourcesParams = {
  lat?: number
  lng?: number
  location?: string          // zip code e.g. "10001"
  text?: string              // search by name
  resourceTypeId?: "FOOD_PANTRY" | "SOUP_KITCHEN"
  tagId?: string
  occurrencesWithin?: string // ISO 8601 interval e.g. "2026-03-09T00:00:00Z/2026-03-15T23:59:59Z"
  region?: string            // region ID or comma-separated zips
  sort?: "distance" | "referrals" | "reviews" | "confidence" | "createdAt"
  take?: number
  cursor?: string
}
export async function getResources(params: GetResourcesParams = {}) {
  return fetchLemontree("/api/resources", params)
}

// Fetch ALL resources, auto-paginating
export async function getAllResources(params: Omit<GetResourcesParams, "cursor"> = {}) {
  const all: any[] = []
  let cursor: string | undefined
  do {
    const res = await getResources({ ...params, cursor, take: params.take ?? 40 })
    all.push(...res.resources)
    cursor = res.cursor
  } while (cursor)
  return all
}

// Get a single resource by ID
export async function getResourceById(id: string) {
  return fetchLemontree(`/api/resources/${id}`)
}

// Get resources near a lat/lng, sorted by distance
export async function getResourcesNearLocation(lat: number, lng: number, options: any = {}) {
  return getResources({ lat, lng, sort: "distance", ...options })
}

// Get resources by zip code
export async function getResourcesByZip(zipCode: string, options: any = {}) {
  return getResources({ location: zipCode, ...options })
}

// Get resources by region
export async function getResourcesByRegion(region: string, options: any = {}) {
  return getResources({ region, ...options })
}

// Full text search by name
export async function searchResources(text: string, options: any = {}) {
  return getResources({ text, ...options })
}

// Get resources open within a time window
export async function getResourcesOpenBetween(startISO: string, endISO: string, options: any = {}) {
  return getResources({ occurrencesWithin: `${startISO}/${endISO}`, ...options })
}

// Get resources open today
export async function getResourcesOpenToday(options: any = {}) {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)
  return getResourcesOpenBetween(start.toISOString(), end.toISOString(), options)
}

// Map Markers 

// Lightweight map pins for a bounding box — just ID, type, coordinates
export async function getMapMarkers(sw: [number, number], ne: [number, number]) {
  const url = `${BASE_URL}/api/resources/markersWithinBounds?corner=${sw[0]},${sw[1]}&corner=${ne[0]},${ne[1]}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Lemontree API error: ${res.status}`)
  return res.json()
}

// PDF Flyer 

// Get URL for a printable flyer — embed in <iframe> or download
export function getFlyerUrl(lat: number, lng: number, options: {
  locationName?: string
  flyerLang?: "en" | "es"
  sample?: "1" | "2" | "3" | "4"
} = {}) {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), ...options as any })
  return `${BASE_URL}/api/resources.pdf?${qs}`
}

// Utilities 

// Check if a resource is open right now based on its occurrences
export function isOpenNow(resource: any) {
  const now = new Date()
  return resource.occurrences?.some(
    (o: any) => !o.skippedAt && new Date(o.startTime) <= now && new Date(o.endTime) >= now
  ) ?? false
}

// Get the next upcoming occurrence for a resource
export function getNextOccurrence(resource: any) {
  const now = new Date()
  return resource.occurrences
    ?.filter((o: any) => !o.skippedAt && new Date(o.startTime) > now)
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0] ?? null
}