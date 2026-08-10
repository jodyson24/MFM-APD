# Activity Structure Model — Single Source of Truth

**Status:** v1.0 — supersedes and refines §3 (Divisions) and §4 (Activity Types) of `MASTER_PLAN.md`
**Purpose:** This document is the authoritative data model for every trackable activity in the system. It replaces the earlier simplified "4 activity types" model with a taxonomy derived exhaustively from the 2025 corporate strategy document ("Tasks, Targets and Outcomes — Outside Mega Regions"). `MASTER_PLAN.md` should treat this file as the source of truth for anything activity-shaped; where the two disagree, this document wins and `MASTER_PLAN.md` should be updated to match (see §9, Integration Notes).

---

## 1. Taxonomy Overview

Activities are modeled as a **three-tier taxonomy**, plus one instance layer:

```
ProgramArea            (the 15 "ZOOM ON ..." strategic sections — WHY the activity exists)
   └── ActivityCategory   (the reporting/compliance bucket — WHAT KIND of activity)
         └── ActivityType    (the specific named event — WHICH activity, with its own field schema)
               └── Activity     (an actual scheduled/logged instance at an org unit — WHEN/WHERE/WHO)
```

- **ProgramArea** = the existing `StrategicInitiative` collection from `MASTER_PLAN.md` §4.2 (unchanged, reused as-is — see §8 below).
- **ActivityCategory** is new: a broader, extensible bucket than the original 4 "Crusades / EEI / Jesus March / Groups Outreach" types. The original 4 remain, but are now recognized as the **four high-frequency, compliance-critical categories** sitting alongside additional categories needed to capture everything else the strategy document tracks (discipleship programmes, physical-structure projects, administrative KPIs, training, music, media/brand, CSR, house fellowship, economic-development projects).
- **ActivityType** is new: each category contains many specific named activities (e.g., under "Crusades": *Mega Regional Crusade*, *Regional/Great Deliverance Crusade*, *Campus Conquest Crusade*). Each ActivityType carries its own **field schema** — the exact data points the source document specifies for that kind of event — layered on top of a shared baseline (§4).
- **Activity** is the existing instance-level document from `MASTER_PLAN.md` §5 (schedule, org unit, divisions, Yes/No report, media, etc.) — unchanged in mechanics, but now references `activityTypeId` (which cascades `activityCategoryId` and `programAreaId`) instead of a flat 4-value enum.

This keeps the system's day-to-day workflow (§6–§10 of `MASTER_PLAN.md`: scheduling, Yes/No follow-up, mandatory photo evidence, countdowns, compliance) **completely unchanged** — only the catalog of *what* can be scheduled gets richer and data-driven instead of hardcoded.

---

## 2. Divisions — unchanged, still loosely tagged

Divisions (`Groups`, `GMOV`, `Women Foundation`, `Teenage`, `Youth`, `Children's Ministry`) remain exactly as refined in `MASTER_PLAN.md` §3: an **optional, zero-to-many tag array** on every Activity, never a mandatory classification. This model does not change that — an Activity now picks an `ActivityType` (required) and, independently, zero-to-many `Divisions` (optional), because the source document repeatedly shows the same activity type (e.g., a Crusade, a Jesus March) being run *by* different divisions without the activity type itself belonging exclusively to one division.

---

## 3. Activity Categories (the compliance-reporting buckets)

Fourteen categories, replacing the earlier fixed set of 4. The original 4 are marked **[CORE]** — these are the categories the source document gives explicit, org-level-differentiated frequencies for, and are the primary drivers of the Compliance Checker (`MASTER_PLAN.md` §9). The remaining categories are **[PROGRAMMATIC]** — tracked for reporting/analytics/presentation purposes but without a hard org-wide cadence stated in the source document (see the frequency matrix in §6).

| Code | Category | [CORE/PROGRAMMATIC] | Primary Program Area(s) | Source-doc anchor |
|---|---|---|---|---|
| `crusades` | Crusades | **CORE** | mission_evangelism, youth_ministry, music_evangelism | "Core Activity Categories," p.2 |
| `eei` | Explosive Evangelism Initiatives (EEI) | **CORE** | mission_evangelism, youth_ministry | "Core Activity Categories," p.2 |
| `jesus_march` | Jesus March (Prayer Walks/Jesus Marches) | **CORE** | mission_evangelism, youth_ministry, house_fellowship | "Core Activity Categories," p.2 |
| `groups_outreach` | Groups Outreach | **CORE** | church_growth, csr, house_fellowship | "Core Activity Categories," p.2 |
| `church_growth_programme` | Church Growth & Discipleship Programmes | PROGRAMMATIC | church_growth | §2.1–2.5 (Developmental Church Programmes, Follow-up, Prayer Chain, Church Planting, Daniel's Band) |
| `facilities_project` | Facilities & Physical Structures Projects | PROGRAMMATIC | physical_structures | §3 (Rebranding/Remodelling, Facilities Mgmt, Safety, CCTV/Security) |
| `admin_initiative` | Administrative Initiatives | PROGRAMMATIC | admin_initiatives | §4 (Digital Transformation, HR/Payroll, Training, Performance Eval, Wellness, Sustainability) |
| `human_capital_training` | Human Capital Development & Training | PROGRAMMATIC | human_capital | §5 (MTMS, Internships, Soft Skills, Vocational/Digital Literacy, Career Fairs, Media & Arts Training) |
| `music_worship` | Music Development & Music Evangelism | PROGRAMMATIC | music_development, music_evangelism | §12 (Hymn programmes, Concerts, Worship festivals, Album/video production) |
| `media_brand` | Media, Social & Brand Initiatives | PROGRAMMATIC | social_media, mfm_brand_tv | §9–10 (Content strategy, TV expansion, App, PR) |
| `csr_project` | Corporate Social Responsibility Projects | PROGRAMMATIC | csr | §11 (Jesus Wells, IDP outreach, Medical Camps, Clean-up, Legal Aid) |
| `house_fellowship_programme` | House Fellowship Programmes | PROGRAMMATIC | house_fellowship | §13 (distinct from `groups_outreach`, which covers HF's *outreach* sub-activities specifically — see §5.13 below for the split) |
| `economic_development` | Self-Sustaining Economy & Diversification | PROGRAMMATIC | self_sustaining_economy | §14 (Schools, Retail, Agriculture, Food Banks) |
| `youth_teen_children_programme` | Youth/Teenage/Children Development Programmes | PROGRAMMATIC | youth_ministry, teenage_ministry, children_ministry | §6–8 (non-evangelistic developmental activities: retreats, clubs, counselling, academic support — evangelistic activities from these ministries route through `crusades`/`eei`/`jesus_march`/`groups_outreach` instead, tagged with the relevant division) |

> **Design rule:** if an activity from Youth/Teenage/Children/Women/GMOV/Groups is fundamentally a Crusade, EEI, Jesus March, or Groups Outreach (i.e., it appears under "Core Activity Categories" in the source document, just run by that division), it is logged under the relevant **[CORE]** category with the division tagged — **not** duplicated into `youth_teen_children_programme`. That programmatic category is reserved for the ministry's *non-evangelistic developmental* activities (retreats, clubs, counselling, academic support) that don't fit the 4 core buckets.

---

## 4. Baseline Field Schema (applies to every Activity, every category)

Drawn from the source document's own "Cross-Cutting Data Requirements" section (§15 of the source), this is the field set every `ActivityType` inherits automatically — it is not re-declared per type, it is merged in at validation time (§7):

| Field | Type | Required? | Notes |
|---|---|---|---|
| `orgUnitId` | ObjectId ref OrgUnit | required | owner of the activity (`MASTER_PLAN.md` §2) |
| `divisions` | [ObjectId ref Division] | optional, default `[]` | §2 above |
| `activityTypeId` | ObjectId ref ActivityType | required | drives which extra fields apply (§5) |
| `scheduledDate` / `actualDate` | Date | `scheduledDate` required; `actualDate` optional (only set if it differs from scheduled) | |
| `status` | enum `scheduled\|completed\|not_held\|cancelled\|postponed` | required | `MASTER_PLAN.md` §10 |
| `wasHeld` (report) | Boolean | required once follow-up filed | the Yes/No toggle, §10 |
| `attendanceBreakdown` (report.metrics) | `{ adults, children, teenagers, youth, total }` | optional, but strongly recommended wherever attendance applies | numeric sub-fields, each optional individually so a type that doesn't track e.g. "children" attendance can omit it |
| `soulsWon` / `decisionsForChrist` (report.metrics) | Number | optional | only meaningful for evangelistic categories; omitted/hidden for e.g. `admin_initiative` types |
| `followUpsConducted` (report.metrics) | Number | optional | |
| `tractsLiteratureDistributed` (report.metrics) | Number | optional | |
| `prayerRequestsOrTestimonies` (report.metrics) | Number | optional | |
| `narrativeReport` (report) | String | required if `wasHeld === true` | `MASTER_PLAN.md` §10 |
| `media` (report) | `[{ mediaType, url, caption }]` | **required, min 1 image if `wasHeld === true`** | mandatory pictorial-evidence policy, `MASTER_PLAN.md` §10.2 — applies uniformly across every category, no exceptions |
| `notHeldReason` (report) | String | required if `wasHeld === false` | §10 |
| `budgetOrResources` (report.metrics) | `{ amount, currency, notes }` | optional | source doc lists this as optional across most categories |
| `createdByUserId` | ObjectId ref User | required | |
| `createdAt` / `updatedAt` | Date | system-managed | |

Every `ActivityType` in §5 below **only needs to declare fields *in addition to* this baseline** — this keeps the catalog compact and avoids re-specifying "attendance" and "media" for every single one of the ~150 named activities in the source document.

---

## 5. Activity Type Catalog (seed data, organized by category)

This is the authoritative seed list for the `ActivityType` collection. Each entry is `{ code, name, applicableLevels, applicableDivisionsHint, extraFields }` — `extraFields` lists **only what's additional to the baseline in §4**. Levels: `MR` = Mega Region, `R` = Region, `Z` = Zone, `B` = Branch.

### 5.1 `crusades`
| Type | Levels | Division hint | Extra fields |
|---|---|---|---|
| Mega Regional Crusade | MR | — | `souls_won`, `deliverances_recorded`, `testimonies_count` |
| Regional/Great Deliverance Crusade | R, Z, B | — | same as above |
| Youth Campus Conquest Crusade | Any | Youth | `campus_name`, `souls_won` |
| Youth/Teenage Mega/Regional Crusade | MR, R | Youth, Teenage | as core crusade |
| House Fellowship Crusade | Z, B | Groups, House Fellowship context | `fellowship_name` |
| Music/Praise Evangelism Crusade | Any | — | `performing_groups`, `souls_won` (from `music_evangelism`) |

### 5.2 `eei` (Explosive Evangelism Initiatives)
| Type | Levels | Division hint | Extra fields |
|---|---|---|---|
| Manna Water on the Street | Any | — | `locations_covered`, `people_reached` |
| Mobile Film Show (street) | Any | — | `locations_covered`, `people_reached` |
| Film Show in Buses | Any | — | `buses_covered`, `people_reached` |
| Mobile Prayer Booth (market/terminal/park) | Any | — | `location_type` enum(`market\|terminal\|park\|other`), `prayers_offered` |
| Evangelistic Literature Distribution (multi-language) | Any | — | `languages_used[]`, `tracts_distributed` |
| Virtual Prayer Room Session (WhatsApp/Telegram/App) | Any | — | `platform` enum(`whatsapp\|telegram\|app\|other`), `people_reached` |
| Digital/Solution Evangelism Push | Any | Youth | `content_reach`, `engagement_count` |

### 5.3 `jesus_march`
| Type | Levels | Division hint | Extra fields |
|---|---|---|---|
| Jesus March / Prayer Walk | MR, R, Z, B | — | `route_or_location`, `participants`, `prayer_points_covered` |
| Neighborhood Prayer Walk (House Fellowship) | Z, B | House Fellowship context | as above |
| Youth Jesus March | Any | Youth | as above |

### 5.4 `groups_outreach`
| Type | Levels | Division hint | Extra fields |
|---|---|---|---|
| Division Community Outreach (general) | Any | Any division | `beneficiaries_reached`, `volunteers_count` |
| Hospital Visitation | Any | House Fellowship, Groups | `patients_ministered_to` |
| Prison Evangelism | Any | House Fellowship, Groups | `inmates_reached` |
| Home Visit — Senior Citizens | Any | House Fellowship, Women Foundation, Groups | `seniors_visited` |
| Food/Welfare Evangelism | Any | CSR context, Groups | `meals_or_items_distributed`, `families_helped` |
| Benevolence Mission | Any | CSR context | `cases_supported`, `funds_disbursed` |
| CSR Value-Chain Outreach (Jesus Wells, IDP outreach, Community Dev) | Any | — | `project_type` enum(`jesus_well\|idp_outreach\|community_dev\|medical_camp\|legal_aid\|environmental\|agricultural\|other`), `beneficiaries_reached` |

### 5.5 `church_growth_programme`
| Type | Levels | Extra fields |
|---|---|---|
| Developmental Church Programme (weekly, per age group) | Any | `age_group` enum(`children\|teenage\|youth\|young_adults`), `weekly_attendance`, `new_attendees` |
| Convention (Children/Teenage/Youth/Young Adults) | MR, R | `age_group`, `souls_won`, `follow_ups` |
| Mission Outreach | Any | `team_size`, `souls_reached` |
| House Fellowship Centre Monitoring | Z, B | `active_fellowships_count`, `average_attendance`, `new_converts_integrated` |
| Discipleship/Leadership Class (Foundational/Membership/Discipleship) | Any | `class_track` enum(`foundational\|membership\|discipleship`), `participants`, `completion_rate` |
| Activity Group Repositioning Event | Any | `group_name`, `active_members` |
| Family & Relationship Counseling/Workshop | Any | `sessions_count`, `attendees` |
| Annual Family Retreat | MR, R | `families_count` |
| GMOV Men's Retreat | MR, R | `retreat_theme` enum(`financial_stewardship\|health_wellbeing\|evangelism\|ministry_involvement`), `attendance` |
| Women Foundation Programme (Kneeling Mothers/Destiny Builders) | Any | `program_track` enum(`kneeling_mothers\|destiny_builders`), `prayer_meetings_count` |
| Faith & Healing Conference (Mountain Top Deliverance) | MR, R | `deliverances_testimonies` |
| Senior Citizens Prayer Circle | Z, B | `participants`, `prayer_requests` |
| Holy Communion Service | Any | `attendance` (frequency-only, low extra-field need) |
| Operation None Shall Be Lost — Follow-up Visit/Call | Any | `contact_method` enum(`visit\|call\|house_fellowship`), `retention_outcome` |
| Member Survey | Any | `responses_count`, `satisfaction_score` |
| Global Prayer Chain Session | MR | `registered_partners`, `regions_involved[]` |
| New Church/Fellowship Plant | MR, R | `location`, `launch_date`, `initial_membership` |
| Daniel's Band Meeting | MR, R | `participants`, `activities_held` |

### 5.6 `facilities_project`
| Type | Levels | Extra fields |
|---|---|---|
| Rebranding/Remodelling Project | Any | `project_status` enum(`planned\|in_progress\|completed`), `completion_date`, `budget` |
| Facilities Inspection/Maintenance | Any | `inspection_date`, `findings` |
| Safety Committee Training/Inspection | Any | `training_or_inspection` enum(`training\|inspection`), `incidents_logged` |
| Security Network Deployment (personnel) | Any | `personnel_count` |
| CCTV Deployment/Audit | Any | `cameras_count`, `operational_status` |

### 5.7 `admin_initiative`
| Type | Levels | Extra fields |
|---|---|---|
| Digital Transformation Milestone | Any | `milestone_name`, `adoption_rate` |
| HR/Payroll System Update | Any | `staff_records_updated` |
| Task Automation Rollout | Any | `tasks_assigned`, `completion_rate` |
| Staff Training/Certification | Any | `participants`, `certifications_awarded` |
| Annual Staff Retreat | Any | `attendance` |
| Performance Review Cycle | Any | `review_scores_avg` |
| Wellness/EAP Session | Any | `sessions_count` |
| Diversity & Inclusion Training | Any | `sessions_count`, `participants` |
| Sustainability Initiative (paperless/energy) | Any | `metric_type` enum(`paper_saved\|energy_reduced`), `value` |

### 5.8 `human_capital_training`
| Type | Levels | Extra fields |
|---|---|---|
| MTMS Training Session (Pastors/Ministers) | Any | `enrollment`, `completion_rate` |
| Online Learning Platform Cohort | Any | `users`, `courses_taken` |
| Internship/Apprenticeship Placement | Any | `interns_count`, `placements` |
| Cross-Cultural Missions Training | Any | `participants` |
| Soft Skills Workshop | Any | `topic`, `attendance` |
| Pastors' Spouses Training | Any | `attendance` |
| Character-Building Seminar | Any | `attendance` |
| Sustainable Agriculture Training | Any | `participants`, `farming_projects` |
| Environmental Stewardship Workshop | Any | `participants`, `initiatives_taken` |
| Vocational Training | Any | `courses_offered`, `graduates`, `job_placements` |
| Digital Literacy Training | Any | `participants`, `skill_assessment_score` |
| Career Fair/Networking Event | Any | `attendees`, `job_offers` |
| Media & Arts Training | Any | `participants`, `projects_produced` |

### 5.9 `music_worship`
| Type | Levels | Extra fields |
|---|---|---|
| Hymn Singing Programme | Any | `hymns_learned`, `participants` |
| Musical Concert/Talent Hunt | Any | `attendance`, `souls_won` |
| Hymn App/Learning Platform Usage | Any | `downloads`, `active_users` |
| Children's/Youth Hymn Choir Rehearsal/Performance | Any | `members_count` |
| Community Hymn Outreach/Evangelistic Night | Any | `attendance`, `souls_won` |
| Cultural Hymn Exchange/Tour | Any | `participants` |
| Indoor/Outdoor Concert | Any | `attendance`, `souls_won` |
| Praise/Worship Festival (High Praises, Mega Praise, etc.) | MR, R | `attendance`, `decisions_for_christ` |
| Virtual Worship Night/Live-Stream | Any | `viewership`, `engagement` |
| Multi-Language Worship Session | Any | `languages_used[]` |
| Worship Album/Music Video Production | MR | `units_released`, `streams` |
| Gospel Musical Drama/Storytelling | Any | `productions_count`, `souls_won` |
| Campus/School Music Outreach | Any | `students_reached`, `decisions` |

### 5.10 `media_brand`
| Type | Levels | Extra fields |
|---|---|---|
| Social Content Post/Series | Any | `platform`, `engagement_count` |
| Short-Form Video/Devotional | Any | `views`, `shares` |
| Digital Discipleship Group Activity | Any | `group_platform`, `members_count` |
| Youth Challenge/Hashtag Campaign | Any | `participation_count` |
| Targeted Ad Campaign | Any | `budget`, `reach`, `conversions` |
| Referral/Brand Advocacy Push | Any | `referrals_count` |
| Billboard/Signage Placement | Any | `locations[]`, `cost` |
| Digital Newsletter Issue | Any | `subscribers`, `open_rate` |
| Press Release/Media Coverage | Any | `outlets_reached` |
| TV Channel Expansion Milestone | MR | `channel_name`, `viewership_rating` |
| Virtual Prayer Meeting/Counseling (TV) | Any | `participants` |
| Mobile App Milestone | MR | `downloads`, `active_users` |

### 5.11 `csr_project`
| Type | Levels | Extra fields |
|---|---|---|
| Jesus Well Initiative | Any | `wells_drilled`, `beneficiaries` |
| IDP/Needy-Community Outreach | Any | `region` enum(`north_east\|north_west\|north_central\|other`), `people_served` |
| Community Development Project | Any | `project_description`, `impact_measure` |
| Medical Camp/Free Clinic | Any | `patients_treated` |
| Mental Health Support Session | Any | `sessions_held` |
| Tree Planting/Clean-Up Drive | Any | `trees_planted`, `waste_collected_kg` |
| Community Farming/Agricultural Training | Any | `farm_size`, `crops[]`, `participants` |
| Legal Aid Support | Any | `cases_handled` |

### 5.12 `house_fellowship_programme`
> Note: pure *outreach* activities run by House Fellowship (hospital visits, prison evangelism, prayer walks) are logged under `groups_outreach` / `jesus_march` with the House Fellowship context noted — this category is for the fellowship's **internal operational** programmes.

| Type | Levels | Extra fields |
|---|---|---|
| House Fellowship Night Vigil | Z, B | `attendance`, `prayer_requests` |
| Leadership Training/Volunteer Mentorship | Z, B | `participants`, `new_leaders_identified` |
| Follow-Up Contact (SMS/Email/Call) | Z, B | `contact_method`, `conversion_outcome` |
| Quarterly Leadership Reflection Session | Z, B | `challenges_noted`, `action_plans` |
| Member Feedback Survey | Z, B | `responses_count`, `satisfaction_score` |
| Annual House Fellowship Celebration/Awards | MR, R | `attendance`, `awards_given` |

### 5.13 `economic_development`
| Type | Levels | Extra fields |
|---|---|---|
| School Enrollment Update (Creche–Secondary) | MR | `location`, `enrollment_count` |
| Supermarket/Bookstore Performance Snapshot | MR, R | `revenue`, `items_sold` |
| Agricultural Project Update | MR, R | `acreage`, `crops[]`, `yield` |
| Food Bank Distribution | Any | `food_distributed_kg`, `people_reached` |
| Youth Agriculture Entrepreneurship Cohort | Any | `youth_trained`, `startups_supported` |
| Large-Scale Farming Cycle Report | MR | `production_volume`, `income` |

### 5.14 `youth_teen_children_programme`
(Non-evangelistic developmental activities only — see the design rule at the end of §3.)

| Type | Levels | Division | Extra fields |
|---|---|---|---|
| Global Retreat/Conference/Camp | MR, R | Youth, Teenage | `sessions`, `decisions_made` |
| Leaders Development Boot Camp | Any | Youth, Teenage | `training_modules`, `participants` |
| Character & Leadership Workshop | Any | Youth, Teenage, Children | `attendance`, `evaluations` |
| Goal-Setting/Life Planning Seminar | Any | Youth, Teenage | `participants`, `goals_set` |
| Financial Literacy Session | Any | Youth, Teenage | `participants`, `knowledge_test_score` |
| Counseling/Conflict Resolution Session | Any | Youth, Teenage, Children | `sessions_count` |
| Sports Tournament/Fitness Workshop | Any | Youth, Teenage | `teams_or_participants` |
| Skill Acquisition Programme (PEF, Dorcas, coding, etc.) | Any | Youth, Teenage | `programme_name`, `participants`, `certifications` |
| Internship/Job Placement | Any | Youth | `interns`, `placements` |
| Career Talk/Trade Fair | Any | Youth, Teenage | `attendees`, `connections_made` |
| Premarital Counseling/Singles Event | Any | Youth | `attendance` |
| Hands-On Mission Project (Teens) | Any | Teenage | `project_description`, `community_impact` |
| Parent-Teen Bonding Event | Any | Teenage | `families_count` |
| STEM Club/Academic Support Session | Any | Teenage | `participants`, `progress_notes` |
| Weekly Bible Exploration/Service (Children) | Any | Children | `weekly_attendance` |
| Bible Trivia/Games Session | Any | Children | `participants` |
| Fruits of the Spirit Club Meeting | Any | Children | `attendance` |
| Kindness Campaign | Any | Children | `acts_count` |
| Annual Faith Festival/Children's Day | MR, R | Children | `attendance` |
| Creative Worship/Praise Dance Rehearsal or Performance | Any | Children | `members_count` |
| Instrumental Music Lesson (Children) | Any | Children | `students_count` |
| Mini Prayer Warriors Training | Any | Children | `prayer_requests_collected` |
| Arts & Crafts Project | Any | Children | `participants` |
| Bible App/Interactive Tech Session (Kids) | Any | Children | `sessions_or_usage_stats` |

---

## 6. Frequency / Compliance Matrix (extends `MASTER_PLAN.md` §4.1 to all 14 categories)

| Category | Mega Region | Region | Zone | Branch | Source |
|---|---|---|---|---|---|
| `crusades` | Twice a year | Bi-monthly | Bi-monthly | Bi-monthly | source doc, explicit |
| `jesus_march` | Quarterly | Quarterly | Quarterly | Quarterly | source doc, explicit |
| `eei` | Not level-differentiated — ongoing | — | — | — | source doc describes as continuous, no fixed count |
| `groups_outreach` | Not level-differentiated — "as per division schedules" | — | — | — | source doc, no fixed count |
| All 10 `PROGRAMMATIC` categories | Not level-differentiated in source | — | — | — | tracked for reporting/analytics, not (yet) subject to a hard compliance rule |

> As in `MASTER_PLAN.md` §4.1: wherever the matrix shows "—" or "not level-differentiated," seed the `ComplianceRule` with `requiredCountPerPeriod: null` (informational only) rather than guessing a number. This is unchanged policy, just re-affirmed for the fuller category list.

---

## 7. Weekly/Periodic Metric Catalog (extends `MASTER_PLAN.md` §12)

Replacing the free-form `metricKey` string with a small controlled catalog (`WeeklyMetricType` collection) so weekly submissions stay consistent across branches:

| Code | Metric | Notes |
|---|---|---|
| `weekly_attendance_overall` | Weekly church attendance (overall) | |
| `weekly_attendance_by_division` | Weekly attendance broken down by division | stored as `{ divisionId, count }[]` |
| `new_converts_weekly` | New converts this week | |
| `new_members_weekly` | New members this week | |
| `house_fellowship_centres_count` | Active House Fellowship centres | |
| `house_fellowship_avg_attendance` | Average House Fellowship attendance | |
| `house_fellowship_new_converts_integrated` | New converts integrated via House Fellowship | |
| `discipleship_class_enrollment` | Discipleship class enrollment this week | |
| `discipleship_class_completions` | Discipleship class completions this week | |
| `prayer_meeting_vigil_participation` | Prayer meeting / vigil participation | |
| `social_media_engagement_growth` | Weekly social media engagement growth | numeric delta or %, platform-tagged |

`WeeklyMetric` (instance collection, per `MASTER_PLAN.md` §5/§12) now references `weeklyMetricTypeId` instead of a raw `metricKey` string, mirroring the Activity/ActivityType relationship in §1.

---

## 8. Mongoose Schema Additions (MERN, per `MASTER_PLAN.md` §5/§14)

```js
// ActivityCategory
{
  _id, code, name, tier: enum['core','programmatic'],
  programAreaIds: [ObjectId] (ref: StrategicInitiative), // usually 1, sometimes 2-3 — see §3 table
  requiredFrequencyByLevel: { megaRegion, region, zone, branch }, // nullable per §6
  isActive
}

// ActivityType
{
  _id, code, name, activityCategoryId: ObjectId (ref: ActivityCategory),
  applicableLevels: [enum: mega_region|region|zone|branch],
  applicableDivisionHint: [ObjectId] (ref: Division, optional — a hint for the UI's default suggestion, NOT an enforced restriction, consistent with §2's "loosely tagged" rule),
  extraFields: [
    { key, label, dataType: enum['string','number','enum','array','object'], enumOptions: [String] (if applicable), required: Boolean }
  ],
  isActive
}

// Activity  (revision of MASTER_PLAN.md §5 — activityTypeId replaces the old flat activityType enum)
{
  _id,
  orgUnitId: ObjectId (ref: OrgUnit),
  activityTypeId: ObjectId (ref: ActivityType),     // required — cascades category + programArea via population
  divisions: [ObjectId] (ref: Division, default: []),
  strategicInitiativeId: ObjectId (ref: StrategicInitiative, nullable), // can still be set explicitly, or derived from activityType->category->programArea if omitted
  title, description,
  scheduledDate, actualDate (nullable), scheduledEndDate (nullable),
  status: enum['scheduled','completed','not_held','cancelled','postponed'],
  rescheduledFromActivityId: ObjectId (ref: Activity, nullable),
  createdByUserId: ObjectId (ref: User),
  report: {
    wasHeld: Boolean,
    markedByUserId, markedAt,
    narrativeReport,
    metrics: {
      // baseline (§4) + activityType.extraFields (§5), validated dynamically — see §9 below
    },
    media: [{ mediaType: enum['image','video'], url, caption }], // min 1 image required if wasHeld === true, MASTER_PLAN.md §10.2
    notHeldReason: String,
    submittedAt
  },
  createdAt, updatedAt
}

// WeeklyMetricType
{ _id, code, name, description, isActive }

// WeeklyMetric (revision of MASTER_PLAN.md §5/§12)
{
  _id, orgUnitId, weeklyMetricTypeId: ObjectId (ref: WeeklyMetricType),
  weekStartDate, value, // value shape depends on the metric type (number, or breakdown array per §7)
  submittedByUserId, submittedAt
}
```

### Indexing (additive to `MASTER_PLAN.md` §5)
- `ActivityType.activityCategoryId` indexed.
- `Activity.activityTypeId` indexed, and a compound `{ orgUnitId: 1, activityTypeId: 1, status: 1 }` for compliance queries (this replaces the earlier `{ orgUnitId, activityType, status }` index, since `activityType` is no longer a flat field).

---

## 9. Dynamic Validation (extends `MASTER_PLAN.md` §14.1)

Because `report.metrics` now varies per `ActivityType` rather than per one of 4 fixed enums, the shared Zod schema (§14.1) is **built dynamically at request time**:

1. Load the baseline schema (§4 of this document) once, as a static Zod object.
2. Look up the `ActivityType` by `activityTypeId`, read its `extraFields` array, and generate a Zod field for each (`z.string()`, `z.number()`, `z.enum([...])`, etc., wrapped in `.optional()` unless `required: true`).
3. Merge baseline + dynamic fields into one Zod object (`baselineSchema.merge(dynamicSchema)`), cached per `activityTypeId` for the lifetime of the process (invalidate the cache when an `ActivityType` is edited).
4. Wrap the whole `report` object in the same Yes/No discriminated union from `MASTER_PLAN.md` §10/§14.1 (`wasHeld: true` branch requires the merged metrics schema + ≥1 image; `wasHeld: false` branch requires only `notHeldReason`).
5. Run this merged schema on **both** the frontend (for inline validation once the user picks an ActivityType — the form renders extra fields dynamically from `ActivityType.extraFields`) **and** the backend (the real security boundary, unchanged principle from §14.1).

This keeps the "one schema, enforced identically client- and server-side" rule from `MASTER_PLAN.md` §14.1 intact while accommodating a data-driven catalog instead of a hardcoded 4-type enum.

---

## 10. Integration Notes for `MASTER_PLAN.md`

To bring the master plan in line with this model:

- **§3 (Divisions):** unchanged — this document reuses it as-is (see §2 above).
- **§4 (Activity Types) and §4.1 (Frequency matrix):** superseded by §3, §5, and §6 of this document. `MASTER_PLAN.md` should be edited to a short pointer: *"See ACTIVITY_MODEL.md for the full Activity Category / Activity Type catalog and frequency matrix — this replaces the earlier 4-type model."*
- **§4.2 (Strategic Initiative Catalogue):** unchanged, reused here as `ProgramArea` (§1, §8).
- **§5 (Core Data Model):** the `Activity` schema's `activityTypeId` field changes from a flat 4-value lookup to the richer `ActivityType` catalog in §5/§8 of this document; add the new `ActivityCategory`, `ActivityType`, `WeeklyMetricType` collections; `WeeklyMetric.metricKey` becomes `weeklyMetricTypeId`.
- **§9 (Compliance Checker):** `ComplianceRule.activityTypeId` becomes `ComplianceRule.activityCategoryId` (frequency is stated at category level in the source document, not per individual named type) — `divisionId` stays nullable/optional per the existing "not strictly tied" rule.
- **§10 / §10.1 / §10.2 (Lifecycle, validation, photo policy):** mechanics unchanged; only the source of the "extra metrics fields" changes, from a fixed per-type object to the dynamic per-`ActivityType` schema in §9 of this document.
- **§13 (JSON Export):** the `division_breakdown` object in the export contract should be extended with an `activity_category_breakdown` object (one entry per category in §3) so the presentation can report both by division and by category.
- **Phased Execution Plan:** Phase 0 seed data now includes `ActivityCategory` (14 rows, §3), `ActivityType` (the catalog in §5 — can be phased: seed the 4 CORE categories' types first since those drive compliance, seed PROGRAMMATIC categories' types in Phase 4 alongside Analytics), and `WeeklyMetricType` (§7). Phase 3 (Compliance Engine) reads `ComplianceRule.activityCategoryId` per the change above.

---

*This document is derived exclusively from the source strategy document's own activity/data-point breakdown and is intended to be the definitive reference an engineering agent uses when seeding the database and building activity-related forms — every ActivityType listed here should be selectable in the system with its corresponding fields, per the source document's own closing instruction.*
