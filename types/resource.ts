export type ResourceTypeId = "FOOD_PANTRY" | "SOUP_KITCHEN" | "SNAP_EBT";

export interface ResourceType {
  id: ResourceTypeId;
  name: string;
  name_es: string | null;
}

export interface Contact {
  availability: unknown[];
  phone: string;
  public: boolean;
}

export interface Tag {
  id: string;
  name: string;
  name_es: string | null;
  tagCategoryId: string;
}

export interface Occurrence {
  id: string;
  address: string;
  confirmedAt: string | null;
  description: string | null;
  description_es: string | null;
  endTime: string;
  holidays: unknown[];
  latitude: number;
  locationName: string | null;
  longitude: number;
  resourceType: ResourceType | null;
  shiftId: string;
  skippedAt: string | null;
  startTime: string;
  tags: Tag[];
  title: string | null;
  title_es: string | null;
}

export interface Shift {
  id: string;
  resourceId: string;
  isAllDay: boolean;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  recurrencePattern: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  resourceType: ResourceType | null;
  tags: Tag[];
}

export interface Resource {
  id: string;
  name: string;
  description: string | null;
  description_es: string | null;
  addressStreet1: string | null;
  addressStreet2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  confidence: number;
  priority: number;
  ratingAverage: number;
  waitTimeMinutesAverage: number;
  acceptingNewClients: boolean;
  openByAppointment: boolean;
  website: string | null;
  mergedToResourceId: string | null;
  usageLimitCount: number | null;
  usageLimitIntervalCount: number | null;
  usageLimitIntervalUnit: string | null;
  usageLimitCalendarReset: boolean;
  contacts: Contact[];
  images: { url: string }[];
  flags: unknown[];
  resourceStatus: { id: string };
  resourceType: ResourceType;
  shifts: Shift[];
  occurrences: Occurrence[];
  occurrenceSkipRanges: unknown[];
  tags: Tag[];
  resourceClaims: unknown[];
  regionalZipCodes: string[];
  regionsServed: { id: string }[];
  regions: { id: string }[];
  resourceSlugs: { slug: string }[];
  _count: {
    resourceSubscriptions: number;
    reviews: number;
  };
}

export interface ResourceResponse {
  count: number;
  resources: Resource[];
  cursor: string | null;
}
