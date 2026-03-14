/**
 * db/types.ts
 *
 * Source of truth for all DB row shapes.
 *
 * The reviews table is split into two clear sections:
 *   SPEC FIELDS   — exact fields from resource-review-spec.pdf (snake_case)
 *   APP FIELDS    — additions for our UI, moderation workflow, and analytics
 *
 * The toReviewEntry() converter maps DB rows → UI ReviewEntry shape.
 */

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserRow {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: "client" | "admin";
    created_at: string;
    last_login: string | null;
  }
  
  // ─── Resources ───────────────────────────────────────────────────────────────
  
  export interface ResourceRow {
    id: string;
    name: string | null;
    description: string | null;
    description_es: string | null;
    street: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    lat: number | null;
    lng: number | null;
    timezone: string;
    website: string | null;
    resource_type: "FOOD_PANTRY" | "SOUP_KITCHEN" | "SNAP_EBT" | "OTHER";
    accepting_new_clients: 0 | 1;
    open_by_appointment: 0 | 1;
    contact_phone: string | null;
    image_url: string | null;
    merged_to_resource_id: string | null;
    usage_limit_count: number | null;
    usage_limit_interval_count: number | null;
    usage_limit_interval: string | null;
    usage_limit_calendar_reset: 0 | 1;
    wait_time_minutes_average: number | null;
    rating_avg: number | null;
    review_count: number;
    confidence: number | null;
    reliability_score: number | null;
    tag_names: string;
    is_open_now: 0 | 1;
    raw_json: string;
    ingested_at: string;
  }
  
  // ─── Shifts ───────────────────────────────────────────────────────────────────
  
  export interface ShiftRow {
    id: string;
    resource_id: string;
    start_time: string;
    end_time: string;
    recurrence_pattern: string | null;
    duration_minutes: number | null;
    is_all_day: 0 | 1;
    address_override: string | null;
    lat: number | null;
    lng: number | null;
    location_name: string | null;
  }
  
  // ─── Occurrences ──────────────────────────────────────────────────────────────
  
  export interface OccurrenceRow {
    id: string;
    resource_id: string;
    shift_id: string | null;
    start_time: string;
    end_time: string;
    confirmed: 0 | 1;
    skipped: 0 | 1;
    title: string | null;
    title_es: string | null;
    description: string | null;
    description_es: string | null;
    address_override: string | null;
    lat: number | null;
    lng: number | null;
    location_name: string | null;
  }
  
  // ─── Resource Tags ────────────────────────────────────────────────────────────
  
  export interface ResourceTagRow {
    resource_id: string;
    tag_id: string;
    tag_name: string;
    tag_name_es: string | null;
    category_id: string | null;
  }
  
  // ─── Reviews ─────────────────────────────────────────────────────────────────
  //
  // SPEC FIELDS (resource-review-spec.pdf) — these must never be renamed/removed:
  //
  //   Spec field name       DB column name            Notes
  //   ─────────────────     ─────────────────         ──────────────────────────
  //   id                    id                        PK, required
  //   createdAt             created_at                required
  //   shareTextWithResource share_text_with_resource  required, default false
  //   authorId              author_id                 required — FK → users.id
  //   resourceId            resource_id               required — FK → resources.id
  //   attended              attended                  optional boolean
  //   deletedAt             deleted_at                optional — soft delete
  //   didNotAttendReason    did_not_attend_reason     optional
  //   informationAccurate   information_accurate      optional boolean
  //   photoPublic           photo_public              optional boolean
  //   photoUrl              photo_url                 optional URI
  //   rating                rating                    optional 1–5
  //   text                  text                      optional
  //   waitTimeMinutes       wait_time_minutes         optional
  //   occurrenceId          occurrence_id             optional — FK → occurrences.id
  //   userId                user_id                   optional — admin who manages
  //   reviewedByUserId      reviewed_by_user_id       optional — admin who moderated
  //
  // APP FIELDS (additions for our UI and analytics — not in spec):
  //
  //   author_name           Denormalized display name (avoid a JOIN on every read)
  //   status                Moderation workflow state: Pending | Completed | Flagged
  //   raffle_tickets        Incentive program — tickets awarded for this review
  //   referred_by           Volunteer/referral name who sent the client
  //   referred_role         Role of the referrer (Volunteer, Healthcare, etc.)
  //   photo_status          Photo approval state: Approved | Pending Review
  //   reviewed_by_name      Denormalized moderator display name
  //   moderation_date       Date the review was moderated
  //   inaccurate_note       Admin note explaining what is inaccurate
  //   client_flag_created   Action taken: client follow-up task created
  //   resource_flag_created Action taken: resource issue report created
  //   shared_social         Action taken: shared on social feed
  //   follow_up_sent        Action taken: follow-up message sent to client
  //   is_synthetic          1 = generated test data, 0 = real submission
  //   sentiment             Derived: positive | neutral | negative
  
  export interface ReviewRow {
    // ── SPEC fields ────────────────────────────────────────────────────────────
    id: string;
    created_at: string;
    share_text_with_resource: 0 | 1;          // spec: shareTextWithResource
    author_id: string;                          // spec: authorId (required)
    resource_id: string;                        // spec: resourceId (required)
    attended: 0 | 1 | null;                    // spec: attended
    deleted_at: string | null;                  // spec: deletedAt
    did_not_attend_reason: string | null;       // spec: didNotAttendReason
    information_accurate: 0 | 1 | null;        // spec: informationAccurate
    photo_public: 0 | 1 | null;               // spec: photoPublic
    photo_url: string | null;                  // spec: photoUrl
    rating: number | null;                     // spec: rating (1–5)
    text: string | null;                       // spec: text
    wait_time_minutes: number | null;          // spec: waitTimeMinutes
    occurrence_id: string | null;              // spec: occurrenceId
    user_id: string | null;                    // spec: userId (admin who manages)
    reviewed_by_user_id: string | null;        // spec: reviewedByUserId
  
    // ── APP fields ─────────────────────────────────────────────────────────────
    author_name: string | null;
    status: "Pending" | "Completed" | "Flagged";
    raffle_tickets: number;
    referred_by: string | null;
    referred_role: string | null;
    photo_status: "Approved" | "Pending Review" | null;
    reviewed_by_name: string | null;
    moderation_date: string | null;
    inaccurate_note: string | null;
    client_flag_created: 0 | 1;
    resource_flag_created: 0 | 1;
    shared_social: 0 | 1;
    follow_up_sent: 0 | 1;
    is_synthetic: 0 | 1;
    sentiment: "positive" | "neutral" | "negative" | null;
  }
  
  // ─── AI Summaries ─────────────────────────────────────────────────────────────
  
  export interface AISummaryRow {
    resource_id: string;
    summary_json: string;
    generated_at: string;
  }
  
  export interface AISummary {
    one_liner: string;
    top_praises: string[];
    top_complaints: string[];
    themes: string[];
    wait_verdict: "short" | "moderate" | "long" | "unknown";
    accuracy_flag: boolean;
    sentiment_score: number;
    review_count: number;
    generated_at: string;
  }
  
  // ─── Review stats view ────────────────────────────────────────────────────────
  
  export interface ReviewStatsRow {
    resource_id: string;
    total_reviews: number;
    avg_rating: number | null;
    avg_wait_minutes: number | null;
    did_not_attend_count: number;
    inaccurate_info_count: number;
    positive_count: number;
    negative_count: number;
    info_accuracy_pct: number;
    pending_count: number;
    flagged_count: number;
    earliest_review: string;
    latest_review: string;
  }
  
  // ─── UI shape ─────────────────────────────────────────────────────────────────
  // The shape expected by page.tsx ReviewEntry interface
  
  export interface ReviewEntry {
    id: string;
    name: string;
    status: "Completed" | "Flagged" | "Pending";
    tickets: number;
    stars: number;
    date: string;
    location: string;
    text: string;
    referredBy: string;
    referredRole: string;
    photos?: { src: string; alt: string }[];
    photoStatus?: "Approved" | "Pending Review";
    moderation?: {
      reviewer: string;
      date: string;
      inaccurate?: boolean;
      inaccurateNote?: string;
    };
    actionsTaken: string[];
  }
  
  /**
   * Convert a DB ReviewRow + resource name into the UI ReviewEntry shape.
   * This is the single authoritative mapping — used in API routes.
   */
  export function toReviewEntry(row: ReviewRow, resourceName: string): ReviewEntry {
    const actionsTaken: string[] = [];
    if (row.client_flag_created)   actionsTaken.push("Client Flag Created");
    if (row.resource_flag_created) actionsTaken.push("Resource Flag Created");
    if (row.shared_social)         actionsTaken.push("Shared to Social");
    if (row.follow_up_sent)        actionsTaken.push("Follow-up Sent");
  
    return {
      id:           row.id,
      name:         row.author_name ?? "Anonymous",
      status:       row.status,
      tickets:      row.raffle_tickets,
      stars:        row.rating ?? 0,
      date:         row.created_at.split("T")[0],
      location:     resourceName,
      text:         row.text ?? "",
      referredBy:   row.referred_by ?? "Direct Visit",
      referredRole: row.referred_role ?? "",
      photos:       row.photo_url
                      ? [{ src: row.photo_url, alt: "Review photo" }]
                      : undefined,
      photoStatus:  row.photo_status ?? undefined,
      moderation:   row.reviewed_by_name
                      ? {
                          reviewer:      row.reviewed_by_name,
                          date:          row.moderation_date ?? row.created_at.split("T")[0],
                          inaccurate:    row.information_accurate === 0,
                          inaccurateNote: row.inaccurate_note ?? undefined,
                        }
                      : undefined,
      actionsTaken,
    };
  }
  
  /**
   * Serialize a spec-compliant ReviewRow into the JSON shape from the spec.
   * Use this if you need to export reviews back to the Lemontree API format.
   */
  export function toSpecJson(row: ReviewRow) {
    return {
      id:                   row.id,
      createdAt:            row.created_at,
      deletedAt:            row.deleted_at,
      shareTextWithResource: row.share_text_with_resource === 1,
      authorId:             row.author_id,
      resourceId:           row.resource_id,
      attended:             row.attended === null ? null : row.attended === 1,
      didNotAttendReason:   row.did_not_attend_reason,
      informationAccurate:  row.information_accurate === null ? null : row.information_accurate === 1,
      photoPublic:          row.photo_public === null ? null : row.photo_public === 1,
      photoUrl:             row.photo_url,
      rating:               row.rating,
      text:                 row.text,
      waitTimeMinutes:      row.wait_time_minutes,
      occurrenceId:         row.occurrence_id,
      userId:               row.user_id,
      reviewedByUserId:     row.reviewed_by_user_id,
    };
  }