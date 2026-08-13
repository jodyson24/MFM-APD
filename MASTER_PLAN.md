# MFM Activities & Performance Dashboard — Master Execution Plan

**Status:** Draft v1.4 (Activity taxonomy expanded into a companion document — see companion doc note below)
**Scope:** Mega Region → Region → Zone → Branch activity tracking, compliance checking, bi-annual presentation generation, and public transparency dashboard.
**Confidentiality:** This system stores "Private and Confidential" organizational data. Treat all seed/reference content accordingly.
**Companion document:** `ACTIVITY_MODEL.md` is now the single source of truth for the full Activity Category / Activity Type catalog, field schemas, and the compliance frequency matrix — it supersedes §4's earlier "4 fixed activity types" model. Read both documents together; §4 below is now a short pointer, not the full model.

---

## 1. Purpose & Guiding Principles

The system must let every organizational tier (Mega Region, Region, Zone, Branch) schedule, execute, and report on ministry activities, then roll all of it up into two bi-annual performance presentations. It must:

1. Enforce strict **data containment by hierarchy** (RBAC) — nobody sees data above or beside their own scope, except roll-up levels which see everything beneath them.
2. Track **countdowns** to (a) each scheduled programme's own date, and (b) the next bi-annual presentation date.
3. Automatically **flag shortfalls** — any org unit that hasn't logged required activities within a division/category.
4. Let admins **file post-event reports** (Yes/No completion check + narrative + **mandatory pictorial evidence (photo)** + optional video + metrics — see §10.2).
5. Produce a **public dashboard** (dates & countdowns only, no internal metrics).
6. Export a **structured JSON** feed that a presentation-builder can consume to auto-generate the bi-annual report deck (with period-over-period and half-over-half growth comparisons).

---

## 2. Organizational Hierarchy & Scope Model

```
Mega Region
 └── Region
      └── Zone
           └── Branch
```

- Every user account belongs to exactly **one node** in this tree (a Mega Region, a Region, a Zone, or a Branch) and to exactly one **Division** (see §3) if their role is division-specific, or "General/Admin" if they administer the node itself.
- **Visibility rule (RBAC):**
  - Branch users: see only their own branch's data.
  - Zone users: see their zone + all branches under it.
  - Region users: see their region + all zones/branches under it.
  - Mega Region users: see everything under their mega region (all regions, zones, branches) — full visibility.
  - Super Admin: global visibility across all Mega Regions, user management, password resets.
- A **Region belongs to exactly one Mega Region**, a **Zone to exactly one Region**, a **Branch to exactly one Zone**. Store this as `parent_id` chains, not duplicated data.

---

## 3. Divisions (cross-cutting ministry tags — not a strict hierarchy)

**Important model correction:** Divisions are **not** a strict one-to-one classification that every activity must belong to. An activity can belong to **zero, one, or several** divisions (e.g., a Mega Regional Crusade may be a general church-wide event with no division tag at all; a Groups Outreach could be jointly run by Youth Ministries and GMOV and should be tagged with both). Treat Division as a **loose, optional, multi-select tag**, not a required foreign key — the Compliance Checker (§9) evaluates division-level shortfalls only for activities that were actually tagged to that division, and separately tracks a "general/untagged" bucket per org unit so church-wide activities aren't lost or force-fit into a division they don't belong to.

Each org unit (mega region/region/zone/branch) can log activities under these divisions, each of which is checked independently for compliance when tagged. Confirmed against the source strategy document ("2025 Tasks, Targets and Outcomes — Outside Mega Regions"):

1. **Groups** — general adult activity/interest groups (source doc: "Reinventing the Activity Groups – Group Repositioning" under Church Growth; also the umbrella for house-fellowship-linked outreach groups).
2. **GMOV — God's Men of Valour** (the men's ministry). Maps to the source doc's **"Men's Retreat"** content area: Financial Stewardship, Health & Wellbeing, Evangelism, and Ministry Involvement. Treat GMOV as a first-class division with its own retreat/training cadence (annual retreat) in addition to the 4 standard activity types in §4.
3. **Women Foundation** — maps directly to the source doc's **"Women Foundation – Kneeling Mothers / Destiny Builders Program"** under Church Growth & Development.
4. **Teenage Ministries** — maps to the source doc's dedicated "ZOOM ON TEENAGE MINISTRY" section (weekly church activities, annual conference/camps, counselling, parent-teen programs, academic support).
5. **Youth Ministries** — maps to "ZOOM ON YOUTHS AND YOUNG ADULTS MINISTRY" (youth evangelism, skill acquisition, campus conquest, creative arts).
6. **Children's Ministry** — maps to "ZOOM ON CHILDREN MINISTRY" (weekly Bible classes, character-building, creative worship, prayer warriors, tech integration).

> Divisions are stored as a lookup collection, not hardcoded, so more can be added later (e.g., Music/Hymns, House Fellowship, Social Media, CSR — all of which appear as their own "ZOOM ON…" sections in the source deck and may become divisions in a later phase) without a schema change — and, per the correction above, adding a division never forces existing or future activities to carry it.

### 3.1 Division reference table (seed data)

| Division code | Display name | Source-doc anchor | Notes for data model |
|---|---|---|---|
| `groups` | Groups | "Reinventing the Activity Groups" | Generic container; sub-group name is a free-text field on the Activity |
| `gmov` | GMOV (God's Men of Valour) | "Men's Retreat" (Financial Stewardship, Health, Evangelism, Ministry Involvement) | Add `retreat_theme` optional field to Activity.metrics for GMOV Crusades/Outreach records |
| `women_foundation` | Women Foundation | "Kneeling Mothers / Destiny Builders Program" | Add `program_track` enum (`kneeling_mothers` \| `destiny_builders`) to Activity.metrics |
| `teenage` | Teenage Ministries | "ZOOM ON TEENAGE MINISTRY" | See §3.2 for sub-programme detail |
| `youth` | Youth Ministries | "ZOOM ON YOUTHS AND YOUNG ADULTS MINISTRY" | See §3.2 |
| `children` | Children's Ministry | "ZOOM ON CHILDREN MINISTRY" | See §3.2 |

### 3.2 Division-specific sub-programmes worth capturing as `metrics.custom_metrics` or free-text tags

These are *not* separate activity types (see `ACTIVITY_MODEL.md` §5 for the full Activity Type catalog — sub-programmes stay as tags), but the source document shows each division runs its Crusade/EEI/Jesus March/Groups Outreach activities under named sub-programmes. Capture the sub-programme as a **tag/label field on the Activity record** so reporting can still slice by it without expanding the schema:

- **Teenage:** Weekly Teen Activities, Teen Evangelism Teams, Global Teen Conference, Outdoor Adventure Camps, Campus/Academic tie-ins (STEM clubs, exam prep) — these are context, not separate activity types; a Teenage "Crusade" or "Groups Outreach" record can carry one of these as a tag.
- **Youth:** Youth Evangelism Teams, Campus Conquest crusades, Youth Leaders' Boot Camps, Creative Arts outreach.
- **Children:** Young Evangelists Program ("Bring a Friend" Sundays), Mini Prayer Warriors, Faith-Based Arts & Crafts outreach.
- **Women Foundation:** Kneeling Mothers track vs Destiny Builders track (as above).
- **GMOV:** Men's Retreat themes (Financial Stewardship / Health & Wellbeing / Evangelism / Ministry Involvement) as tags on GMOV activities.
- **Groups:** whichever named activity group ran the outreach (free text or a secondary `group_name` lookup, seeded from local group names per branch — these will vary by branch and shouldn't be hardcoded).

---

## 4. Activity Categories & Types — see `ACTIVITY_MODEL.md`

> **Superseded by a dedicated document.** The earlier "4 fixed activity types" model has been replaced by a fuller, data-driven **Activity Category → Activity Type** catalog derived exhaustively from the source strategy document (not just the 4 headline categories, but every named activity across all 15 "ZOOM ON…" sections). This is now maintained as its own single source of truth: **`ACTIVITY_MODEL.md`**.
>
> Key points carried over into `ACTIVITY_MODEL.md` (do not re-derive them here — treat that document as authoritative):
> - The original 4 categories (**Crusades, EEI, Jesus March, Groups Outreach**) still exist and are marked **[CORE]** — they remain the primary compliance-driving buckets, with the same frequency cadences (Crusades: twice/year at Mega Region, bi-monthly at Region/Zone/Branch; Jesus March: quarterly org-wide; EEI and Groups Outreach: no fixed cadence stated in the source, so no hard compliance rule is seeded for them).
> - Ten additional **[PROGRAMMATIC]** categories now capture everything else the source document tracks (Church Growth & Discipleship, Facilities Projects, Administrative Initiatives, Human Capital Training, Music & Worship, Media/Brand, CSR Projects, House Fellowship Programmes, Economic Development, and Youth/Teenage/Children developmental programmes).
> - Each category contains many specific **Activity Types**, each with its own field schema layered on top of a shared baseline set of fields (attendance, souls won, follow-ups, media, etc.) — see `ACTIVITY_MODEL.md` §4–§5 for the full baseline schema and the complete seeded type catalog.
> - "Jesus March" naming and alias handling ("Jesus Match/Matches") is unchanged from the original resolution here.
> - Divisions (§3 above) remain exactly as described — loosely tagged, optional, zero-to-many — this did **not** change with the richer activity catalog.
> - The `Activity` document's `activityType` flat field becomes `activityTypeId` (a real foreign key into the new `ActivityType` collection) — see the revised `Activity` schema in `ACTIVITY_MODEL.md` §8, which also updates §5's Mongoose model below.
> - `ComplianceRule.activityTypeId` becomes `ComplianceRule.activityCategoryId`, since the source document states cadences at category level, not per individual named type.

### 4.1 Strategic Initiative Catalogue — the source document as the system's data dictionary

The 2025 corporate strategy document ("Outside Mega Regions") is the **canonical source of truth** for every label, KPI, objective statement, and cadence used anywhere in this system. Rather than inventing terminology, seed a reference collection, `StrategicInitiative`, with one document per **"ZOOM ON …"** section in the source deck, verbatim from the deck's own Objectives / Outcomes / Key Tasks / Targets fields. This does two things:

1. Gives every dropdown, tag, label, and report-narrative field in the system a **traceable origin** in the actual strategy document instead of ad-hoc naming.
2. Lets an Activity optionally reference `strategicInitiativeId` so a logged event can be tied back to the specific corporate objective it serves (e.g., a Crusade activity can link to the "Mission and Evangelism" initiative; a Groups Outreach can link to "Corporate Social Responsibility").

**Initiatives to seed (14, one per ZOOM ON section):**

| Code | Title (verbatim from doc) | Feeds |
|---|---|---|
| `mission_evangelism` | Mission and Evangelism — Aggressive Evangelism (Digital and In-Person) | Crusades, EEI |
| `church_growth` | Church Growth and Development — Driving Church Growth Through Innovation and Technology Globally | Groups Outreach, Women Foundation programmes |
| `physical_structures` | Physical Structures & Remodelling of Existing Structures | (facilities module, out of scope for Phase 0–7; reference only) |
| `admin_initiatives` | Administrative Initiatives — Rebrand the Administrative Structure | (admin module, reference only) |
| `human_capital` | Human Capital Development — Empowerment of Ministers and Members | GMOV / training-linked activities |
| `youth_ministry` | Youths and Young Adults Ministry — Development into Full Capacity | Youth division activities |
| `teenage_ministry` | Teenage Ministry | Teenage division activities |
| `children_ministry` | Children Ministry | Children division activities |
| `social_media` | Social Media Strategies | (weekly metrics, reference only) |
| `mfm_brand_tv` | MFM Brand / MFM TV — Making MFM to be in Everywhere | (reference only) |
| `csr` | Corporate Social Responsibility — Incorporate Social Objectives into Mission | Groups Outreach |
| `music_development` | Music Development — Influencing Music Development in the Church | (future division candidate) |
| `music_evangelism` | Music Evangelism — Winning Souls through Music | Crusades (music-driven), EEI |
| `house_fellowship` | House Fellowship — Reengineering House Fellowship Structures | Groups Outreach |
| `self_sustaining_economy` | Self-Sustaining Church Economy and Diversification | (reference only) |

Each `StrategicInitiative` document stores: `code, title, subtitle, objectives (text), outcomes (text), keyTasks (array of strings, copied verbatim per bullet), additionalKeyTasks2025 (array), targets (array of strings)`. This is **reference/seed data**, loaded once from the source document and editable only by Super Admin — it is the vocabulary backbone the rest of the system draws from, and it also feeds the **public dashboard's "About this initiative" text** and the **presentation JSON's narrative sections** (§13) so slide copy is grounded in the actual strategy language rather than freehand text typed by whoever runs the export.

---

## 5. Core Data Model (MongoDB / Mongoose schemas)

Using **MongoDB with Mongoose** (part of the MERN commitment — see §14). Collections below use `ObjectId` references rather than SQL foreign keys; document shape favors readability for a small team of engineering agents over strict normalization, since Mongo handles flexible/optional fields (like `divisions[]` and `metrics`) naturally.

```js
// OrgUnit
{
  _id, type: enum['mega_region','region','zone','branch'],
  name, parentId: ObjectId (ref: OrgUnit, null for mega_region),
  createdAt, updatedAt
}

// Division  (lookup/reference collection — see §3, tags are optional & non-exclusive)
{
  _id, code, name, description, isActive, createdAt
}

// ActivityType  (lookup/reference collection — see §4)
{
  _id, code, name, description,
  applicableLevels: [enum: mega_region|region|zone|branch],
  requiredFrequencyByLevel: { megaRegion, region, zone, branch }, // null where undefined, see ACTIVITY_MODEL.md §6
  aliases: [String],   // e.g. ["jesus match","jesus matches"] for the jesus_march type
  isActive
}

// StrategicInitiative  (reference/seed collection — see §4.1, source-of-truth vocabulary; reused as "ProgramArea" in ACTIVITY_MODEL.md)
{
  _id, code, title, subtitle,
  objectives, outcomes,
  keyTasks: [String], additionalKeyTasks2025: [String],
  targets: [String]
}

// Activity  (a scheduled/logged event — see ACTIVITY_MODEL.md §8 for the authoritative version of this schema)
{
  _id,
  orgUnitId: ObjectId (ref: OrgUnit),           // required
  activityTypeId: ObjectId (ref: ActivityType), // required, exactly one — full catalog in ACTIVITY_MODEL.md §5; cascades activityCategoryId + programAreaId via population
  divisions: [ObjectId] (ref: Division, default: []), // OPTIONAL, zero-to-many — see §3 correction
  strategicInitiativeId: ObjectId (ref: StrategicInitiative, nullable), // optional traceability, §4.1 (== "ProgramArea" in ACTIVITY_MODEL.md)
  title, description,
  scheduledDate, actualDate (nullable), scheduledEndDate (nullable),
  status: enum['scheduled','completed','not_held','cancelled','postponed'],
  rescheduledFromActivityId: ObjectId (ref: Activity, nullable), // set when created from a "No, rescheduled to..." follow-up, §10
  createdByUserId: ObjectId (ref: User),
  report: {                       // embedded sub-document, populated at follow-up time — shape depends on the Yes/No branch (§10)
    wasHeld: Boolean,             // the Yes/No answer itself, required once follow-up is filed
    markedByUserId, markedAt,
    // -- Yes branch (wasHeld: true) --
    narrativeReport,              // required if wasHeld === true
    metrics: { /* baseline fields (ACTIVITY_MODEL.md §4) merged with the selected ActivityType's extraFields (§5), validated dynamically per §9 there; required if wasHeld === true */ },
    media: [{ mediaType: enum['image','video'], url, caption }], // required, MIN 1 entry with mediaType:'image' if wasHeld === true — mandatory pictorial evidence, §10.2
    // -- No branch (wasHeld: false) --
    notHeldReason: String,        // required if wasHeld === false; this is the ONLY required field on this branch
    submittedAt
  },
  createdAt, updatedAt
}

// User
{
  _id, name, email, phone, passwordHash (nullable until invite is accepted, §8.1),
  role: enum['super_admin','mega_region_admin','mega_region_it','mega_region_overseer','region_admin','region_overseer','zone_admin','zonal_pastor','branch_admin','branch_pastor','pastor','it_official'],
  orgUnitId: ObjectId (ref: OrgUnit),
  divisions: [ObjectId] (ref: Division, default: []),  // optional, a user can support multiple divisions
  isSuperAdmin: Boolean, isActive,
  status: enum['invited','active','deactivated'],
  invite: {
    tokenHash, expiresAt, createdByUserId, usedAt (nullable)
  },
  createdByUserId: ObjectId (ref: User),  // who provisioned this account (§8.1)
  createdAt, lastLoginAt,
  loginCount: Number (default: 0),         // incremented on each successful login, §8.4
  totalTimeLoggedInSeconds: Number (default: 0) // running total, updated on logout/session expiry, §8.4
}

// PresentationCycle
{
  _id, label,               // e.g. "H2 2025"
  periodStart, periodEnd,
  presentationDate,
  status: enum['upcoming','past']
}

// ComplianceRule
{
  _id, orgLevel: enum['mega_region','region','zone','branch'],
  divisionId: ObjectId (nullable, ref: Division), // null = applies regardless of division tag
  activityCategoryId: ObjectId (ref: ActivityCategory), // CHANGED from activityTypeId — cadences are stated at category level, ACTIVITY_MODEL.md §6
  requiredCountPerPeriod: Number (nullable),  // null = informational only, no shortfall flag (ACTIVITY_MODEL.md §6)
  periodType: enum['monthly','bi-monthly','quarterly','half-year']
}

// ComplianceStatus  (nightly-computed snapshot — see §9)
{
  _id, orgUnitId, divisionId (nullable), activityTypeId, periodLabel,
  requiredCount, actualCount, status: enum['ok','shortfall','not_applicable'],
  lastEvaluatedAt
}

// WeeklyMetric  (e.g. Church Growth — see §12)
{
  _id, orgUnitId, metricKey, weekStartDate, value,
  submittedByUserId, submittedAt
}

// MetricsRollup  (nightly aggregation for analytics — see §11)
{
  _id, orgUnitId, activityTypeId, divisionId (nullable),
  periodLabel, metricKey, metricValue
}

// AuditLog
{
  _id, userId, action, entity, entityId, timestamp, meta: {}
}
```

### Metrics schema (per activity type — stored inside `Activity.report.metrics`, validated per type at the API layer via Joi/Zod before save)
- **Crusade:** attendance, soulsWon, newConverts, deliverancesRecorded, testimoniesCount, notes, `subProgrammeTag` (e.g. "Campus Conquest", "Men's Retreat Outreach" — see §3.2)
- **EEI:** locationsCovered, peopleReached, tractsDistributed, soulsWon, `channel` (enum: mobile_prayer_booth \| mobile_film_show \| church_on_the_move \| manna_water \| digital \| other) — channels drawn directly from the source doc's "2025 Additional Key Tasks" under Mission & Evangelism
- **Jesus March/Prayer Walk:** participants, distanceOrRoute, prayerPointsCovered
- **Groups Outreach:** beneficiariesReached, itemsDistributed, soulsWon, `outreachCategory` (enum: hospital_visitation \| prison_evangelism \| environmental_sanitation \| senior_citizen_visit \| csr_value_chain \| other) — categories drawn from the House Fellowship and CSR sections of the source doc
- Division-specific optional fields (only populated when a relevant division tag is present): `programTrack` (Women Foundation), `retreatTheme` (GMOV), `subProgrammeTag` (Teenage/Youth/Children — free text or lookup, per §3.2)
- Generic fallback: `customMetrics: { label: value }` for anything not modeled explicitly.

### Indexing notes (Mongo-specific)
- Compound index on `Activity`: `{ orgUnitId: 1, scheduledDate: -1 }` and `{ orgUnitId: 1, activityTypeId: 1, status: 1 }` for compliance/rollup queries.
- `divisions` array field gets a multikey index (`{ divisions: 1 }`) so "all activities tagged to Youth across a region" queries stay fast even though the field is optional/sparse.
- `OrgUnit.parentId` indexed; use `$graphLookup` (MongoDB aggregation) to resolve "everything under my node" for RBAC scoping rather than recursive application code where possible.

---

## 6. Presentation Cycle & Countdown Logic

### 6.1 Two key dates per year
- Super Admin / Mega Region Admin sets **two `PresentationCycle` dates per year** via a settings menu (date picker), e.g.:
  - H2 presentation: **July 4**
  - H1 presentation (of following cycle): **January 5**
- Each cycle has a defined **period_start/period_end** (e.g., cycle presenting Jan 5 covers **July 1 – Dec 31** of the prior year; cycle presenting July 4 covers **Jan 1 – Jun 30**).
- This is fully editable — do not hardcode the two dates; store them in `PresentationCycle` and let admins update every year from a **"Manage Presentation Dates"** menu.

### 6.2 Dual countdown rule (critical requirement)
For **every Mega Regional activity**, the dashboard shows **two countdowns simultaneously**:
1. **Countdown to the activity's own scheduled date** (from the day it was created/scheduled).
2. **Countdown to the next Presentation Date** (static per cycle, same for every activity in that cycle — computed once, displayed everywhere).

> Example given: an activity scheduled in February, presentation on July 4 → dashboard shows "23 days until programme" AND "121 days until presentation" (both live, both visible on the same card).

- Only **Mega Regional-level** activities are required to show both countdowns per the spec; Region/Zone/Branch activity cards show only their own event countdown (but the global "days to next presentation" banner can still appear at the top of every dashboard, scoped to viewer, as a system-wide widget).
- Countdown values are computed client-side from server-provided ISO dates (avoid timezone bugs — store all dates in UTC, render in org's local timezone).

---

## 7. Dashboards

### 7.1 Internal Admin Dashboard (per role, RBAC-scoped)
Sections:
- **My Org Unit Summary** — activity counts by division/type, upcoming vs completed, this-half vs last-half.
- **Countdown Widgets** — next presentation date (global), plus per-activity countdowns for anything in my scope.
- **Compliance/Shortfall Panel** (see §9) — scoped to my level and everything below me.
- **Activity Calendar** — list/calendar view of scheduled + completed activities, filterable by division/type/date range.
- **Pending Reports** — activities marked "completed" date has passed but report not yet filed (nudge/reminder).
- **Analytics** — per-activity-type trend charts (attendance, souls won, etc.) with half-over-half comparison (see §11).

### 7.2 Mega Region "God View"
- Everything in 7.1, plus:
  - **Aggregate Shortfall Counter** — total count of shortfalls across the entire mega region, broken down by region → zone → branch (drill-down tree/table).
  - Cross-region comparison charts.
  - User management for everyone in the mega region (create, deactivate, reassign roles) — but password reset is a Super Admin-only action (see §8).

### 7.3 Public Dashboard (no login required)
- Shows **only**:
  - Mega Regional programme names + dates (no metrics, no reports, no internal notes).
  - Drill-down by Region → Zone → Branch, each showing only that level's own scheduled programme names + dates.
  - The presentation-date countdown (global, same as internal).
- Explicitly **excludes**: attendance, souls-won, compliance/shortfall data, reports, media, user info, financials.
- Build this as a fully separate read-only API surface (`/api/public/*`) that only ever queries a whitelisted, sanitized **read-model collection** (a denormalized `PublicActivityView` collection, refreshed by a small sync job whenever an Activity's title/date/status changes) — never reuse internal admin endpoints or Mongoose models directly, to guarantee no leakage.

---

## 8. Authentication, Accounts & RBAC

### 8.1 User provisioning — Super Admin invite flow (no self-registration)

Per the tightened requirement, **only a Super Admin creates accounts** (Mega Region Admins may also create accounts, but only within their own mega region — see §8.3). There is no public self-registration form.

1. Super Admin opens **"Add User"** and enters: **full name, email, role**, then picks the person's place in the hierarchy — **Branch, Zone, Region** (Region and Zone auto-populate a cascading dropdown scoped to the Mega Region the Super Admin is creating within, so a user can only be attached to a real Branch→Zone→Region→Mega Region chain, never a mismatched combination).
2. On save, the system:
   - Creates the `User` document with `passwordHash: null`, `status: 'invited'`, and a **single-use, time-limited invite token** (`inviteToken`, hashed at rest like a password, `inviteExpiresAt` — default 72 hours).
   - Emails the person a link: `https://{app-domain}/set-password?token=...`.
3. The person opens the link and lands on a **"Set Your Password"** page (no other part of the app is reachable with an invite token — it is not a session token). They choose a password meeting the policy in §8.2. On submit:
   - Server re-validates the token (exists, not expired, not already used), hashes the new password, flips `status: 'active'`, invalidates the invite token (single use), and redirects to the normal login page.
4. From then on, the user logs in with **email + password** like any other account. If the invite link expires unused, the Super Admin (or their Mega Region Admin) can **resend a new invite** (regenerates the token, does not require re-entering the user's details).
5. Expired/unused invites, and any attempt to reuse a token, are written to the security log (§8.4) as a flagged event.

### 8.2 Password & session policy
- Minimum 10 characters, at least one number and one symbol; checked against a common-password blocklist (e.g. `zxcvbn` strength check) on both frontend and backend (§14.1).
- Passwords hashed with **bcrypt** (cost factor ≥ 12), never stored or logged in plaintext anywhere, including audit/security logs.
- JWT access token ~15 minutes; refresh token (httpOnly, secure, sameSite cookie) ~7 days, rotated on every use (refresh-token rotation with reuse detection — reusing a rotated-out refresh token immediately revokes the whole session family and logs a security event).
- Forced password reset capability for admins (§8.3) invalidates all of that user's existing sessions immediately.

### 8.3 Roles, scope & password resets
- **Roles:** `super_admin`, `mega_region_admin`, `mega_region_it`, `mega_region_overseer`, `region_admin`, `region_overseer`, `zone_admin`, `zonal_pastor`, `branch_admin`, `branch_pastor`, `pastor`, `it_official`. Pastors and IT officials at a branch/zone/region can create/edit activities and file reports for their own org unit but cannot manage other users unless explicitly granted `*_admin`.
- **Role amendment (stakeholder, 2026):** `mega_region_admin` and `mega_region_it` are the "management" roles — they can manage users, create org units, create presentation dates and access compliance (capped to their own mega region subtree by the scope middleware). `mega_region_overseer` has full read visibility of its mega region (like a super admin) but may **not** manage users (Users page is read-only). `region_overseer`, `zonal_pastor` and `branch_pastor` have data visibility over their own unit + descendants. All non-management roles can still create activities and enter data within their scope. Capability checks live in `lib/permissions.js` (mirrored in `frontend/src/utils/permissions.js`).
- **Account creation scope:** Super Admin can create a user anywhere. Mega Region Admin / Mega Region IT can create users only within their own mega region (any region/zone/branch beneath it) — enforced server-side, never trusted from the client. Only a Super Admin can create/promote a Super Admin, or create a new mega region org unit.
- **Password resets:**
  - Super Admins can reset **anyone's** password (triggers a fresh invite-style "Set Your Password" link rather than emailing a temporary password).
  - Mega Region Admins and Mega Region IT can reset passwords for users **within their mega region** (the Users page shows a copyable reset link in addition to the emailed one).
  - Lower-level admins cannot reset passwords above or outside their own scope.
- **Deactivation, not deletion:** removing a user sets `isActive: false` and revokes all sessions; historical Activities/Reports they authored are retained (never cascade-delete content a user created).

### 8.4 Security & session logging (Super Admin visibility)

A dedicated **Security Log** dashboard, visible to Super Admin only (Mega Region Admins may see a scoped slice for their own mega region's users), backed by a `SessionLog` collection:

```js
// SessionLog
{
  _id, userId: ObjectId (ref: User),
  loginAt, logoutAt (nullable — null while session is active),
  durationSeconds (computed on logout, or on session expiry via a cleanup job),
  ipAddress,
  approxLocation: { city, region, country, lat, lng }  // derived from IP via a geo-IP lookup, not GPS
  device: {
    fingerprintHash,          // hashed device fingerprint (see below), never store raw fingerprint payloads
    userAgent, os, browser, deviceType (mobile|desktop|tablet)
  },
  loginResult: enum['success','failed_password','failed_locked','failed_expired_invite'],
  refreshTokenFamilyId       // links related refresh events for reuse-detection tracing
}

// UserActivityLog  (distinct from AuditLog in §5 — this is action-level, for the security dashboard's "actions" feed)
{
  _id, userId, sessionId (ref: SessionLog), action, entity, entityId, ipAddress, timestamp
}
```

- **Device fingerprint:** generated client-side (e.g. via a lightweight library such as FingerprintJS) from stable signals (screen, timezone, canvas/audio hash, platform) — the **hash** is stored, never the raw signal set, to limit privacy exposure while still letting the dashboard flag "this account just logged in from a device we've never seen before."
- **Location:** derived server-side from the request's IP address via a geo-IP lookup (MaxMind or similar) — approximate city/region/country only. The system does **not** request browser GPS location; this is a security signal, not a tracking feature, and should be described to users as such in the privacy notice.
- **Per-user counters** shown on the Security Log and on each user's profile: total login count, total time spent logged in (sum of `durationSeconds`), last login time + location + device, and a chronological **action feed** (from `UserActivityLog`) — create/edit/complete-activity/file-report/password-reset events, each with timestamp, IP, and device.
- **Anomaly flags** (surfaced, not auto-blocking, in Phase 1 — auto-lock is a stretch goal): new device for an existing account, login from an unusual country compared to the account's history, multiple failed logins in a short window (also feeds the rate-limiting/lockout in §8.5).

### 8.5 OWASP-aligned security practices (enforced project-wide)

Baseline hardening measured against the **OWASP Top 10** and **OWASP ASVS** practices, to be treated as non-negotiable acceptance criteria (see updated Definition of Done, §17):

| Risk area | Control |
|---|---|
| Broken Access Control | Every controller re-derives scope from the authenticated JWT/session, never from client-supplied `orgUnitId`/role fields; RBAC covered by automated cross-scope-read tests (§17). |
| Cryptographic Failures | bcrypt for passwords; TLS-only (HSTS enabled) in production; secrets in a secrets manager, never committed; JWTs signed with a rotated secret/asymmetric key. |
| Injection | Mongoose schema validation + Zod/Joi request validation on every endpoint (§14.1); no raw/unsanitized string interpolation into Mongo queries (avoid `$where`, sanitize any dynamic operator use); `express-mongo-sanitize` middleware against NoSQL operator injection. |
| Insecure Design | Threat-modeled at each phase kickoff (who can see/do what); invite-only account creation (§8.1) instead of open self-registration to remove an entire attack surface. |
| Security Misconfiguration | `helmet` middleware for secure headers (CSP, X-Frame-Options, etc.); no verbose stack traces returned to clients in production; dependency audit (`npm audit`) in CI. |
| Vulnerable & Outdated Components | Automated dependency scanning in CI (`npm audit` / Dependabot/Renovate); pinned lockfile. |
| Identification & Authentication Failures | Rate limiting + progressive lockout on login (`express-rate-limit`, e.g. 5 attempts / 15 min per IP+account); refresh-token rotation with reuse detection (§8.2); MFA as a Phase 7 stretch goal. |
| Software & Data Integrity Failures | CI runs tests + lint + audit before deploy; signed/verifiable build artifacts if a CD pipeline is added later. |
| Security Logging & Monitoring Failures | §8.4's `SessionLog`/`UserActivityLog` plus the existing `AuditLog` (§5); alerting on repeated failed logins or password-reset abuse (Phase 7). |
| Server-Side Request Forgery | Not currently applicable (no user-supplied URL fetching), but if the presentation-export or media pipeline ever fetches external URLs, allowlist destinations. |

Additional cross-cutting practices: CORS locked to known frontend origins only; file-upload validation (MIME-type allowlist + size limits + virus-scan hook as a stretch goal) before any media reaches S3; presigned upload URLs scoped and short-lived (§14); all cookies `httpOnly`, `secure`, `sameSite=strict`.

---

## 9. Compliance / Shortfall Checker

**Goal:** automatically detect org units that have not logged required activities within a division/activity-type over the applicable period, and surface it at every rollup level.

### 9.1 Rule engine
- `ComplianceRule` defines, per org level + division + **activity category** (see `ACTIVITY_MODEL.md` §3/§6 — cadences are stated at category level, not per individual named activity type): required count within a period (e.g., "every Branch must log ≥1 EEI per month", "every Region must log ≥2 Crusades per half-year").
- A scheduled job (cron, nightly) evaluates every active org unit against every applicable rule for the **current open period** (rolling, e.g. month-to-date and half-to-date) and writes/updates a `ComplianceStatus` snapshot table:
```
ComplianceStatus
  org_unit_id, division_id, activity_type_id, period_label,
  required_count, actual_count, status(ok|shortfall), last_evaluated_at
```

### 9.2 Dashboard surfacing
- **Shortfall banner/table**: "Zone X has not conducted [EEI] in [Teenage Ministries] this period" — clicking expands to show sub-breakdown (which branches under Zone X are the actual gap, since a zone-level shortfall is usually the aggregate of branch-level gaps).
- **Separate Mega Regional Shortfall Counter**: a distinct KPI card that counts shortfalls specifically in **Mega-Region-owned activities** (not the roll-up of everything below) — kept visually and structurally separate from the general compliance table per the requirement.
- Drill-down path: Mega Region shortfall count → Region breakdown → Zone breakdown → Branch breakdown, each clickable.

---

## 10. Activity Lifecycle & Reporting Workflow

1. **Schedule:** Admin/pastor creates an `Activity` (org unit, activity type, optional division(s), date, description). Status = `scheduled`. Own-event countdown starts immediately.
2. **Reminder:** As `scheduledDate` approaches (configurable, e.g., 3 days before) system can surface a reminder on dashboard (and optionally email/SMS if integrated later).
3. **Follow-up prompt:** Once `scheduledDate` has passed, the activity surfaces on the org unit's dashboard with a single required question: **"Was this activity carried out?"** — presented as **Yes / No**, not a plain checkbox, so a "No" is a captured, reportable outcome rather than silence.
4. **Branch A — "Yes" (activity was done):** reveals the full completion/report form:
   - Narrative report (rich text) — required
   - Metrics fields (per activity type schema, §5) — required, validated per activity type on both frontend and backend (§14.1)
   - **Pictorial evidence (photo upload) — mandatory, minimum 1 image.** No activity report can be submitted as "completed" without at least one photo attached; this is a hard validation rule (§10.2), not a soft recommendation, because photo evidence is the primary proof point the Mega Region reviews when verifying an activity actually happened.
   - Optional video upload or video link (YouTube/Vimeo URL preferred over raw file storage for cost reasons — confirm storage strategy in §15.4)
   - On submit: saves `Activity.report`, sets `Activity.status = 'completed'`, timestamps `markedDoneAt`/`markedDoneByUserId`. This activity now counts toward compliance totals and analytics.
5. **Branch B — "No" (activity was not done):** reveals a **much shorter, mandatory** form:
   - **Reason it did not hold** (required text field — e.g. weather, low turnout, venue issue, rescheduled, resource shortfall) — this is the *only* required field; none of the Yes-branch metrics/photo/video fields are shown or required.
   - Optional: a rescheduled date, which if provided auto-creates a new linked `Activity` (`status: 'scheduled'`, `rescheduledFromActivityId` reference) so the org unit isn't penalized twice for one missed event once it's re-run.
   - On submit: sets `Activity.status = 'cancelled'` (or a dedicated `not_held` status) and stores the reason under `Activity.report.notHeldReason` — this **does not** count toward compliance totals as "met," but it is visibly distinct on the dashboard from a silently-missing report, which matters for shortfall analysis (§9): a logged, explained "No" is materially different from a scheduled activity nobody ever followed up on.
6. **Late/Missing follow-up:** If `scheduledDate` + grace period (e.g., 7 days) passes with **neither** a Yes-branch report nor a No-branch reason filed, it surfaces in the "Pending Follow-Up" nudge list and is treated as **not completed** for compliance purposes until one of the two branches is filed — same as before, but now the two outcomes (done vs. explained-not-done vs. unexplained-silence) are each their own trackable state rather than being collapsed into one.

### 10.1 Form validation summary for this workflow (see §14.1 for the shared-schema mechanics)
- The "Yes/No" toggle itself is required — the form cannot be submitted with neither selected.
- Field-level required/optional state is **conditional on the toggle**, enforced identically on the client (so the irrelevant branch's fields are hidden and not merely disabled) and on the server (so the API rejects a payload claiming "Yes" without the required metrics/photo, or claiming "No" without a reason, even if a client-side bug or a direct API call tries to skip it).

### 10.2 Pictorial evidence policy (mandatory photo proof)

Every activity marked **"Yes, it was done"** must include **at least one photo** as pictorial evidence before the report can be submitted — this applies uniformly across every Activity Category and Type (`ACTIVITY_MODEL.md` §3–§5), all divisions (§3), and all org levels (§2); there is no org-level, category, or activity-type exemption. Enforcement:

- **Frontend:** the "Submit Report" button stays disabled while `media.filter(m => m.mediaType === 'image').length === 0`; an inline message ("Attach at least one photo before submitting") is shown.
- **Backend:** the Zod schema for the "Yes" branch (§14.1) requires `media` to contain `min(1)` entries of `mediaType: 'image'` — a request with zero images (or only a video, no image) is rejected with a `422` even if it somehow bypasses the frontend.
- **Storage:** images go through the same presigned-upload + MIME/size validation pipeline as any other media (§14.1 point 6) — JPEG/PNG/WebP allowlist, a sane max size per image (e.g. 10MB), no executable/script file types accepted regardless of extension spoofing (validated by actual file signature, not just the filename).
- **Data model:** already reflected in §5's `Activity.report.media` array comment (`required (>=1) if wasHeld === true`) — this section makes that requirement explicit as a named, testable policy rather than an implicit schema detail.
- **Compliance & analytics impact:** an activity cannot reach `status: 'completed'` — and therefore cannot count toward compliance totals (§9) or analytics rollups (§11) — without satisfying this photo requirement, since completion and report submission are the same transaction (§10).
- **Definition of Done addition:** every phase touching the report-submission path must include an automated test asserting a photo-less "Yes" submission is rejected by the API (see updated §17).

---

## 11. Analytics & Half-Over-Half / Annual Growth Comparison

- Every activity report carries structured `metrics` (attendance, souls_won, etc.).
- For each activity type + division + org unit, compute:
  - **This half's totals** vs **last half's totals** → % growth/decline.
  - **This half vs same half last year** (year-over-year) once ≥2 years of data exist.
  - **Annual rollup**: H1 + H2 = full year totals, tracked per org unit and aggregated upward.
- Present as: trend line chart (per metric, per activity type), and a growth-delta summary table (e.g., "Crusade attendance: 12,400 → 14,100 (+13.7%)").
- This is computed at read-time via MongoDB aggregation pipelines, or via the nightly `MetricsRollup` collection (§5) for performance at scale.

---

## 12. Weekly-Updatable Data (e.g., Church Growth)

- Some sections (explicitly called out: **Church Growth**) are updated on a **weekly cadence** rather than per-event.
- Model as a separate lightweight entity so it doesn't need to hang off an "Activity":
```
WeeklyMetric
  id, org_unit_id, metric_key (e.g. "membership_count", "new_converts_week",
  "house_fellowship_count"), week_start_date, value, submitted_by_user_id, submitted_at
```
- Same RBAC and rollup rules apply. Include this feed in the JSON export (§13) and analytics (§11).

---

## 13. JSON Export for Presentation Generation

**Goal:** one endpoint (or scheduled export job) that assembles everything needed to auto-build the bi-annual presentation deck.

`GET /api/export/presentation/{cycle_id}` → returns a structured JSON:

```json
{
  "cycle": { "label": "H2 2025", "period_start": "...", "period_end": "...", "presentation_date": "..." },
  "org_summary": {
    "mega_regions": [
      {
        "name": "...",
        "activity_totals": { "crusades": 12, "eei": 30, "jesus_march": 4, "groups_outreach": 8 },
        "metrics_summary": { "souls_won": 4200, "attendance": 58000, "growth_vs_last_half_pct": 11.2 },
        "compliance": { "required": 54, "met": 49, "shortfall": 5 },
        "regions": [ { "...same shape, recursively down to branch level..." } ]
      }
    ]
  },
  "division_breakdown": { "groups": {...}, "gmov": {...}, "women_foundation": {...}, "teenage": {...}, "youth": {...}, "children": {...} },
  "activity_category_breakdown": { "crusades": {...}, "eei": {...}, "jesus_march": {...}, "groups_outreach": {...}, "church_growth_programme": {...}, "...": "one entry per ActivityCategory, see ACTIVITY_MODEL.md §3" },
  "weekly_metrics_summary": { "church_growth": { "start": ..., "end": ..., "net_change": ... } },
  "highlights": [ /* top reports / notable activities flagged by admins, with media refs */ ],
  "generated_at": "..."
}
```

- This JSON is the single contract between the tracking system and any downstream presentation-builder (e.g., a script that turns it into a `.pptx` using the pptx skill, or feeds an LLM to draft narrative slide content).
- Keep the schema **stable and versioned** (`"schema_version": 1`) so the presentation generator doesn't break when new fields are added.

---

## 14. Technical Architecture — MERN Stack (committed)

The stack is **MongoDB, Express, React, Node.js (MERN)**, chosen for the team's requested direction and because the data model in §5 is naturally document-shaped (flexible `metrics`, optional `divisions[]` array, nested report objects).

- **Database:** **MongoDB** (Atlas or self-hosted replica set for production). Mongoose as the ODM for schema validation, middleware (e.g., auto-hash password on save), and population (`ref`) between collections.
- **Backend:** **Node.js + Express**, organized by feature module (`orgUnits/`, `activities/`, `compliance/`, `presentationCycles/`, `users/`, `export/`), each with its own router, controller, service, and Mongoose model. Use a shared `authMiddleware` (JWT verify) and a shared `scopeMiddleware` that resolves the requesting user's allowed `orgUnitId` subtree via `$graphLookup` and attaches it to `req.scope` — every controller filters through `req.scope`, never trusting client-supplied org filters.
- **Auth:** JWT access tokens (short-lived, ~15 min) + refresh tokens (httpOnly cookie), `bcrypt` for password hashing. Role + orgUnit + divisions embedded as JWT claims for fast in-request scope checks, but always re-validated against the DB on sensitive writes (password reset, user management).
- **Frontend:** **React** (Vite) + **Tailwind**, React Router with two top-level route trees: `/admin/*` (authenticated, RBAC-gated via a route guard reading the JWT claims) and `/public/*` (no auth, hits only `/api/public/*`). State/data-fetching via React Query (TanStack Query) for caching + auto-refetch of countdowns and dashboards. Charting via Recharts for analytics (§11).
- **Media storage:** Object storage (S3-compatible, e.g. AWS S3 or Cloudflare R2) accessed via presigned upload URLs generated by Express — the frontend uploads directly to storage, and only the resulting URL is saved on the `Activity.report.media` array. Videos: default to external links (YouTube/Vimeo unlisted) to avoid raw video storage costs, with direct upload as a stretch option — **decision needed from stakeholder** (§15.4).
- **Background jobs:** `node-cron` (or `agenda` if job persistence/retries are needed) inside the same Node service for: nightly `ComplianceStatus` evaluation, nightly `MetricsRollup` aggregation (via MongoDB's aggregation pipeline — `$match`/`$group`/`$facet`), and reminder checks for pending reports.
- **Validation:** Zod (or Joi) schemas per Mongoose model, shared between frontend form validation and backend request validation where practical (single source of truth for field shape).
- **API style:** REST (`/api/v1/...`) is sufficient given the read/write patterns; GraphQL is not needed for this scope.
- **Notifications (future phase):** email (Nodemailer) / SMS / WhatsApp (Twilio or Meta Cloud API) reminders for pending reports and upcoming presentation dates.
- **Deployment:** containerize both apps (`Dockerfile` for the Express API, static build for React served via Nginx or a CDN); environment-specific config via `.env` + a secrets manager in production (never commit secrets).

### 14.1 Validation strategy — frontend AND backend, always both

No field is trusted from the client alone. The rule for every form in the system (activity scheduling, the Yes/No follow-up in §10, user creation in §8.1, presentation-date settings, etc.):

1. **Single schema definition per form**, written once as a Zod schema in a shared package (e.g. `packages/shared-validation`) importable by both the React app and the Express API — this avoids the two sides drifting out of sync.
2. **Frontend validation** runs on blur/submit for immediate user feedback (inline error messages, disabled submit until valid) — this is a UX convenience only, never treated as a security boundary.
3. **Backend validation** re-runs the exact same schema on every request body before it touches Mongoose/the database, returning a structured `422` with field-level errors on failure. This is the actual security boundary — it must reject anything the frontend would have rejected, even if the frontend is bypassed (direct API calls, tampered requests, future mobile clients).
4. **Conditional-required fields** (e.g. the §10 Yes/No branch, where "Yes" requires metrics+photo and "No" requires only a reason) are expressed as a Zod discriminated union keyed on `wasHeld`, so the "which fields are required" logic lives in exactly one place and can't diverge between client and server.
5. **Mongoose-level schema validation** acts as a last line of defense (type/enum constraints on the model itself) in case anything ever writes to the database outside the validated API path (e.g. a future internal script) — defense in depth, not a substitute for steps 2–3.
6. File uploads (photos/videos) are validated for MIME type and size **before** a presigned upload URL is even issued, and re-checked server-side once the object lands in storage (via a lightweight webhook or a post-upload confirmation call) — a client can't get an upload URL for a disallowed file type in the first place.

---

## 15. Open Questions for Stakeholder (resolve before/while building)

1. ~~**GMOV**~~ — **Resolved:** GMOV = God's Men of Valour (men's ministry). Modeled in §3 as a division mapped to the source doc's "Men's Retreat" content (Financial Stewardship, Health & Wellbeing, Evangelism, Ministry Involvement).
2. ~~**"Jesus Match"**~~ — **Resolved:** treated as "Jesus March" (per the source doc's "Prayer Walks/Jesus Marches," quarterly). Stored as the canonical label with "Jesus Match/Matches" as accepted spelling aliases (§4).
3. **Required frequency per activity category per org level** — **partially resolved** via `ACTIVITY_MODEL.md` §6's matrix, pulled directly from the source doc for Crusades (twice a year at Mega Region; bi-monthly at Region/Zone/Branch) and Jesus March (quarterly, org-wide). **Still open:** explicit required counts for EEI, Groups Outreach, and all 10 PROGRAMMATIC categories at each level — the source doc describes most of these as ongoing pushes rather than stating a fixed cadence. Recommend a short stakeholder session to set these before Phase 3 (Compliance Engine) begins, since the compliance rule seed data depends on it.
4. Video storage: raw upload vs external link only (cost/bandwidth implications).
5. Whether Region/Zone/Branch activities also need the **dual countdown**, or only Mega Regional ones (spec explicitly says Mega Regional; confirm this is intentional and not just the example given).
6. ~~Approval workflow for self-registered accounts~~ — **Resolved/superseded:** self-registration has been removed entirely; all accounts are created by a Super Admin (or a Mega Region Admin within their own mega region) via the invite flow in §8.1. Remaining bootstrap question: the very first Super Admin account is created manually (seed script / ops runbook), not through the app UI.
7. **Groups** and sub-group naming — since local activity-group names will vary per branch (the source doc only says "Reinventing the Activity Groups – Group Repositioning" without naming specific groups), confirm whether `group_name` should be a controlled lookup seeded per branch during onboarding, or a free-text field left to the branch admin.
8. **Geo-IP location precision:** confirm the org is comfortable with city/region-level IP-based location for the security log (§8.4) rather than precise GPS, and confirm this is disclosed to users in a privacy notice.
9. **Session-log retention window:** how long should `SessionLog`/`UserActivityLog` entries be kept before archival/deletion (relevant for storage cost and any data-retention policy) — needs a stakeholder answer before Phase 7's retention policy is finalized.

---

## 16. Phased Execution Plan (for engineering agents)

### Phase 0 — Foundations
- Repo scaffolding (Node/Express API + React/Vite client, MERN), CI (lint + test + `npm audit` gate), environment config, MongoDB connection (Mongoose) + migration/seed scripts (e.g. `migrate-mongo` or custom seed runner).
- Implement `OrgUnit`, `Division`, `ActivityCategory`, `ActivityType`, `StrategicInitiative`, `User` collections + seed data (from §2–4 here and `ACTIVITY_MODEL.md` §3/§5/§4.1, including the Strategic Initiative Catalogue pulled verbatim from the source document). Seed the 4 CORE categories' types first (compliance-critical); PROGRAMMATIC categories' types can be seeded in Phase 4 alongside Analytics per `ACTIVITY_MODEL.md` §10.
- Auth foundation: Super-Admin-only invite-based user creation (§8.1), "Set Your Password" flow, JWT issuance + refresh-token rotation, RBAC middleware enforcing org-scope on every query via `$graphLookup`.
- Baseline OWASP hardening from day one (§8.5): `helmet`, `express-rate-limit` on auth endpoints, `express-mongo-sanitize`, CORS allowlist, secrets via env/secrets manager.
- Shared Zod validation package scaffolded (§14.1) with the first schemas (User invite/set-password forms).

### Phase 1 — Core Activity Tracking
- CRUD for `Activity` (schedule/edit/cancel), with shared frontend+backend validation (§14.1).
- Yes/No follow-up workflow (§10): conditional-required form (Zod discriminated union), media upload for the "Yes" branch, mandatory reason field for the "No" branch, optional reschedule-linking.
- Basic admin dashboard: activity list/calendar per org unit, scoped by RBAC.

### Phase 2 — Presentation Cycles & Countdowns
- `PresentationCycle` CRUD (admin-settable dates).
- Countdown widgets: activity-own-date + presentation-date, dual display for Mega Regional activities.
- Public dashboard (dates-only view, separate API namespace).

### Phase 3 — Compliance Engine
- `ComplianceRule` collection + rule editor UI (super admin / mega region admin) — note the divisionId on a rule is nullable per §3's "not strictly tied" correction (a rule can apply org-wide regardless of division tag), and rules key off `activityCategoryId` rather than an individual `activityTypeId` per `ACTIVITY_MODEL.md` §6/§10.
- Nightly job (via `node-cron`) computing `ComplianceStatus` using MongoDB aggregation pipelines — distinguishing "completed," "not held (with reason)," and "no follow-up filed" per §10 so shortfall reporting isn't conflating silence with an explained miss.
- Shortfall dashboard panels + drill-down (region→zone→branch) + separate Mega Regional shortfall counter.

### Phase 4 — Analytics & Weekly Metrics
- `WeeklyMetric` entity + weekly submission UI (e.g., Church Growth).
- Rollup aggregation jobs (`MetricsRollup`).
- Half-over-half and year-over-year growth charts.

### Phase 5 — Presentation Export
- `/api/export/presentation/{cycle_id}` endpoint producing the JSON contract (§13).
- (Optional stretch) auto-generate a draft `.pptx` from that JSON using the pptx skill/template.

### Phase 6 — User Management & Security Logging
- Super admin console: invite users anywhere in the tree (§8.1), global password reset (re-invite flow), view all audit/security logs.
- Mega region admin console: invite/deactivate users within their mega region, reset passwords within scope.
- **Security Log dashboard (§8.4):** `SessionLog` + `UserActivityLog` collections wired up; capture login/logout, device-fingerprint hash, geo-IP location, login counters, and cumulative time-logged-in per user; per-user action feed.
- Anomaly surfacing: new-device flag, unusual-location flag, repeated-failed-login flag (display-only in this phase; auto-lockout is a Phase 7 stretch item).

### Phase 7 — Hardening
- Full OWASP Top 10 pass against the checklist in §8.5 (dependency audit, header/config review, injection testing, auth/session testing).
- Penetration test the RBAC boundaries specifically (attempt cross-scope reads).
- Load-test rollup queries at expected data volume.
- Backup/retention policy for media, reports, and security logs (define retention window for `SessionLog`/`UserActivityLog` — these grow indefinitely otherwise).
- Stretch: MFA for admin roles, refresh-token-reuse auto-lockout, virus-scan hook on uploaded media.

---

## 17. Definition of Done (per phase)

Each phase is complete only when:
- All RBAC boundaries are covered by automated tests (a branch user cannot read zone/region/mega data; public API cannot return internal fields).
- Countdown calculations are covered by unit tests across timezones and cycle-date edits mid-year.
- Compliance shortfall counts are verified against manually-computed expected values on seed data, and correctly distinguish "completed" / "not held (reason given)" / "no follow-up filed."
- The JSON export validates against a fixed schema (schema_version) and includes a snapshot test.
- **Every form's validation schema is defined once (shared package) and covered by tests proving the backend rejects a payload the frontend would have blocked** (e.g. a "Yes" follow-up missing metrics, a "No" follow-up missing a reason, a user-creation payload with a mismatched branch/zone/region chain) — this is the check that the frontend/backend validation contract in §14.1 hasn't drifted.
- **A "Yes" activity report with zero attached photos is verified (via automated test) to be rejected by the API** at the report-submission endpoint, per the mandatory pictorial-evidence policy in §10.2 — this must be re-verified any time the report-submission path changes.
- The OWASP checklist in §8.5 has been reviewed for anything the phase touched (e.g. a new endpoint gets rate-limiting/validation/scope-check review before merge, not deferred entirely to Phase 7).
- Security logging (§8.4) is confirmed to capture a login, a logout, and at least one write action end-to-end in a staging environment before the phase is marked complete, once Phase 6 has landed.

---

*End of master plan. This document is the single source of truth for build sequencing — update it (bump a changelog section, not shown here) as decisions in §15 are resolved.*
