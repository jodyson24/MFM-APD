require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../db');
const Division = require('../models/Division');
const ActivityCategory = require('../models/ActivityCategory');
const ActivityType = require('../models/ActivityType');
const WeeklyMetricType = require('../models/WeeklyMetricType');
const StrategicInitiative = require('../models/StrategicInitiative');
const OrgUnit = require('../models/OrgUnit');
const User = require('../models/User');
const PresentationCycle = require('../models/PresentationCycle');
const ComplianceRule = require('../models/ComplianceRule');
const Activity = require('../models/Activity');

// Strategic Initiative Catalogue (§4.2) — vocabulary backbone drawn from the source deck
const INITIATIVES = [
  {
    code: 'mission_evangelism',
    title: 'Mission and Evangelism — Aggressive Evangelism (Digital and In-Person)',
    subtitle: 'Mission & Evangelism',
    objectives: 'Aggressively win souls through digital and in-person evangelism across all levels.',
    outcomes: 'Increased conversions, sustained evangelistic culture, measurable souls won.',
    keyTasks: [
      'Organize Mega Regional Crusades (twice a year)',
      'Run Great Deliverance Crusades (bi-monthly) in Regions, Zones and Branches',
      'Conduct Prayer Walks / Jesus Marches (quarterly)',
      'Deploy mobile prayer booths and mobile film shows',
    ],
    additionalKeyTasks2025: ['Leverage social media evangelism', 'Manna Water on the Street', 'Church on the Move'],
    targets: ['Souls won targets per level', 'Crusade cadence per level'],
  },
  {
    code: 'church_growth',
    title: 'Church Growth and Development — Driving Church Growth Through Innovation and Technology Globally',
    subtitle: 'Church Growth',
    objectives: 'Drive church growth through innovation and technology globally.',
    outcomes: 'Sustained numerical and structural growth of the church.',
    keyTasks: ['Weekly church growth tracking', 'Technology-driven outreach'],
    additionalKeyTasks2025: ['Digitize membership tracking', 'Innovation hubs in zones'],
    targets: ['Weekly growth targets per branch'],
  },
  {
    code: 'physical_structures',
    title: 'Physical Structures & Remodelling of Existing Structures',
    subtitle: 'Physical Structures',
    objectives: 'Develop and remodel physical church structures.',
    outcomes: 'Improved worship and activity facilities.',
    keyTasks: ['Identify and prioritize structure projects'],
    additionalKeyTasks2025: ['Remodelling of existing structures'],
    targets: ['Structures delivered per year'],
  },
  {
    code: 'admin_initiatives',
    title: 'Administrative Initiatives — Rebrand the Administrative Structure',
    subtitle: 'Administration',
    objectives: 'Rebrand the administrative structure of the church.',
    outcomes: 'Modern, efficient administration.',
    keyTasks: ['Rebrand administrative structure'],
    additionalKeyTasks2025: ['Digitize administrative processes'],
    targets: ['Admin efficiency metrics'],
  },
  {
    code: 'human_capital',
    title: 'Human Capital Development — Empowerment of Ministers and Members',
    subtitle: 'Human Capital',
    objectives: 'Empower ministers and members through training and development.',
    outcomes: 'Well-trained workforce of ministers and members.',
    keyTasks: ['Run training and capacity programs', 'Men\'s Retreat cadence'],
    additionalKeyTasks2025: ['Skill acquisition for members'],
    targets: ['Trained ministers and members per level'],
  },
  {
    code: 'youth_ministry',
    title: 'Youths and Young Adults Ministry — Development into Full Capacity',
    subtitle: 'Youth Ministry',
    objectives: 'Develop youths and young adults into their full capacity.',
    outcomes: 'Engaged, equipped youths driving evangelism and service.',
    keyTasks: ['Youth Evangelism Teams', 'Campus Conquest crusades', 'Youth Leaders\' Boot Camps', 'Creative Arts outreach'],
    additionalKeyTasks2025: ['Skill acquisition for youths', 'Youth conferences'],
    targets: ['Youth engagement targets per level'],
  },
  {
    code: 'teenage_ministry',
    title: 'Teenage Ministry',
    subtitle: 'Teenage Ministry',
    objectives: 'Raise godly teenagers through structured ministry.',
    outcomes: 'Teenagers active in church, counselling and academics.',
    keyTasks: ['Weekly teen activities', 'Teen Evangelism Teams', 'Global Teen Conference', 'Outdoor Adventure Camps', 'Campus/academic tie-ins'],
    additionalKeyTasks2025: ['Parent-teen programs', 'STEM clubs and exam prep'],
    targets: ['Teen participation targets per level'],
  },
  {
    code: 'children_ministry',
    title: 'Children Ministry',
    subtitle: 'Children Ministry',
    objectives: 'Disciple children through Bible classes and character building.',
    outcomes: 'Children grounded in faith and worship.',
    keyTasks: ['Weekly Bible classes', 'Character-building programs', 'Creative worship', 'Prayer warriors', 'Tech integration'],
    additionalKeyTasks2025: ['Young Evangelists Program (Bring a Friend Sundays)', 'Mini Prayer Warriors', 'Faith-Based Arts & Crafts'],
    targets: ['Children enrollment targets per branch'],
  },
  {
    code: 'social_media',
    title: 'Social Media Strategies',
    subtitle: 'Social Media',
    objectives: 'Use social media to amplify the gospel and church activities.',
    outcomes: 'Wider online reach and engagement.',
    keyTasks: ['Weekly social media metrics tracking'],
    additionalKeyTasks2025: ['Influencer-driven campaigns'],
    targets: ['Reach and engagement targets'],
  },
  {
    code: 'mfm_brand_tv',
    title: 'MFM Brand / MFM TV — Making MFM to be in Everywhere',
    subtitle: 'MFM Brand / TV',
    objectives: 'Build the MFM brand and make MFM present everywhere via media.',
    outcomes: 'Global brand presence.',
    keyTasks: ['Brand campaigns', 'MFM TV content production'],
    additionalKeyTasks2025: ['Expanded media distribution'],
    targets: ['Brand reach targets'],
  },
  {
    code: 'csr',
    title: 'Corporate Social Responsibility — Incorporate Social Objectives into Mission',
    subtitle: 'CSR',
    objectives: 'Incorporate social objectives into the mission of the church.',
    outcomes: 'Community impact through value-chain projects.',
    keyTasks: ['Jesus Wells', 'IDP outreach', 'Food/welfare/benevolence evangelism'],
    additionalKeyTasks2025: ['Expanded CSR partnerships'],
    targets: ['Beneficiaries reached per level'],
  },
  {
    code: 'music_development',
    title: 'Music Development — Influencing Music Development in the Church',
    subtitle: 'Music Development',
    objectives: 'Influence music development in the church.',
    outcomes: 'Elevated worship and music standards.',
    keyTasks: ['Music training and development'],
    additionalKeyTasks2025: ['Regional music festivals'],
    targets: ['Music ministry growth targets'],
  },
  {
    code: 'music_evangelism',
    title: 'Music Evangelism — Winning Souls through Music',
    subtitle: 'Music Evangelism',
    objectives: 'Win souls through music-driven evangelism.',
    outcomes: 'Souls won and church planted through music events.',
    keyTasks: ['Music crusades', 'Concert evangelism'],
    additionalKeyTasks2025: ['Live-streamed music evangelism'],
    targets: ['Souls won through music'],
  },
  {
    code: 'house_fellowship',
    title: 'House Fellowship — Reengineering House Fellowship Structures',
    subtitle: 'House Fellowship',
    objectives: 'Reengineer house fellowship structures for growth.',
    outcomes: 'Vibrant house fellowships driving community outreach.',
    keyTasks: ['Hospital visitations', 'Prison evangelism', 'Environmental sanitation', 'Senior-citizen visits'],
    additionalKeyTasks2025: ['Reengineered fellowship leadership'],
    targets: ['Fellowship growth targets per branch'],
  },
  {
    code: 'self_sustaining_economy',
    title: 'Self-Sustaining Church Economy and Diversification',
    subtitle: 'Church Economy',
    objectives: 'Build a self-sustaining church economy through diversification.',
    outcomes: 'Financial sustainability of the church.',
    keyTasks: ['Revenue diversification projects'],
    additionalKeyTasks2025: ['Investment portfolio development'],
    targets: ['Self-sustainability targets'],
  },
];

// =====================================================================
// ACTIVITY_MODEL.md §3 — 14 Activity Categories (the compliance buckets)
// =====================================================================

// helper: number => per-cadence, null => not level-differentiated (informational only)
const NULL_FREQ = { megaRegion: null, region: null, zone: null, branch: null };

const CATEGORIES = [
  { code: 'crusades', name: 'Crusades', tier: 'core', programAreaKeys: ['mission_evangelism', 'youth_ministry', 'music_evangelism'], requiredFrequencyByLevel: { megaRegion: 1, region: 3, zone: 3, branch: 3 }, description: 'Evangelistic crusades (Mega Regional / Great Deliverance / Campus Conquest).' },
  { code: 'eei', name: 'Explosive Evangelism Initiatives (EEI)', tier: 'core', programAreaKeys: ['mission_evangelism', 'youth_ministry'], requiredFrequencyByLevel: NULL_FREQ, description: 'Aggressive continuous evangelism: street, mobile, digital, literature.' },
  { code: 'jesus_march', name: 'Jesus March (Prayer Walks)', tier: 'core', programAreaKeys: ['mission_evangelism', 'youth_ministry', 'house_fellowship'], requiredFrequencyByLevel: { megaRegion: 2, region: 2, zone: 2, branch: 2 }, description: 'Prayer walks / Jesus marches (quarterly org-wide).' },
  { code: 'groups_outreach', name: 'Groups Outreach', tier: 'core', programAreaKeys: ['church_growth', 'csr', 'house_fellowship'], requiredFrequencyByLevel: NULL_FREQ, description: 'Community/charity outreach run by divisions, as per division schedules.' },
  { code: 'church_growth_programme', name: 'Church Growth & Discipleship Programmes', tier: 'programmatic', programAreaKeys: ['church_growth'], requiredFrequencyByLevel: NULL_FREQ, description: 'Developmental church programmes, follow-up, prayer chain, church planting, Daniel\'s Band.' },
  { code: 'facilities_project', name: 'Facilities & Physical Structures Projects', tier: 'programmatic', programAreaKeys: ['physical_structures'], requiredFrequencyByLevel: NULL_FREQ, description: 'Rebranding/remodelling, facilities management, safety, CCTV/security.' },
  { code: 'admin_initiative', name: 'Administrative Initiatives', tier: 'programmatic', programAreaKeys: ['admin_initiatives'], requiredFrequencyByLevel: NULL_FREQ, description: 'Digital transformation, HR/payroll, training, performance eval, wellness, sustainability.' },
  { code: 'human_capital_training', name: 'Human Capital Development & Training', tier: 'programmatic', programAreaKeys: ['human_capital'], requiredFrequencyByLevel: NULL_FREQ, description: 'MTMS, internships, soft skills, vocational/digital literacy, career fairs, media & arts training.' },
  { code: 'music_worship', name: 'Music Development & Music Evangelism', tier: 'programmatic', programAreaKeys: ['music_development', 'music_evangelism'], requiredFrequencyByLevel: NULL_FREQ, description: 'Hymn programmes, concerts, worship festivals, album/video production.' },
  { code: 'media_brand', name: 'Media, Social & Brand Initiatives', tier: 'programmatic', programAreaKeys: ['social_media', 'mfm_brand_tv'], requiredFrequencyByLevel: NULL_FREQ, description: 'Content strategy, TV expansion, app, PR.' },
  { code: 'csr_project', name: 'Corporate Social Responsibility Projects', tier: 'programmatic', programAreaKeys: ['csr'], requiredFrequencyByLevel: NULL_FREQ, description: 'Jesus Wells, IDP outreach, medical camps, clean-up, legal aid.' },
  { code: 'house_fellowship_programme', name: 'House Fellowship Programmes', tier: 'programmatic', programAreaKeys: ['house_fellowship'], requiredFrequencyByLevel: NULL_FREQ, description: 'Internal operational programmes of house fellowship (vigils, leadership, follow-up, surveys).' },
  { code: 'economic_development', name: 'Self-Sustaining Economy & Diversification', tier: 'programmatic', programAreaKeys: ['self_sustaining_economy'], requiredFrequencyByLevel: NULL_FREQ, description: 'Schools, retail, agriculture, food banks.' },
  { code: 'youth_teen_children_programme', name: 'Youth/Teenage/Children Development Programmes', tier: 'programmatic', programAreaKeys: ['youth_ministry', 'teenage_ministry', 'children_ministry'], requiredFrequencyByLevel: NULL_FREQ, description: 'Non-evangelistic developmental activities (retreats, clubs, counselling, academic support).' },
];

// =====================================================================
// ACTIVITY_MODEL.md §5 — ActivityType catalog.
// Following the phased plan (§10): the 4 CORE categories are seeded in full
// (they drive compliance); PROGRAMMATIC categories' types are added in Phase 4.
// Each entry: { code, name, levels, divisionHints, extras, description }
// =====================================================================

const num = (key, label, required) => ({ key, label, dataType: 'number', required: !!required });
const str = (key, label, required) => ({ key, label, dataType: 'string', required: !!required });
const enm = (key, label, options, required) => ({ key, label, dataType: 'enum', enumOptions: options, required: !!required });
const arr = (key, label, required) => ({ key, label, dataType: 'array', required: !!required });

const CORE_TYPES = [
  // — 5.1 crusades —
  { code: 'mega_regional_crusade', name: 'Mega Regional Crusade', levels: ['mega_region'], extras: [num('soulsWon', 'Souls won'), num('deliverancesRecorded', 'Deliverances recorded'), num('testimoniesCount', 'Testimonies count')] },
  { code: 'regional_great_deliverance_crusade', name: 'Regional/Great Deliverance Crusade', levels: ['region', 'zone', 'branch'], extras: [num('soulsWon', 'Souls won'), num('deliverancesRecorded', 'Deliverances recorded'), num('testimoniesCount', 'Testimonies count')] },
  { code: 'youth_campus_conquest_crusade', name: 'Youth Campus Conquest Crusade', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['youth'], extras: [str('campusName', 'Campus name'), num('soulsWon', 'Souls won')] },
  { code: 'youth_teenage_mega_regional_crusade', name: 'Youth/Teenage Mega/Regional Crusade', levels: ['mega_region', 'region'], divisionHints: ['youth', 'teenage'], extras: [num('soulsWon', 'Souls won'), num('deliverancesRecorded', 'Deliverances recorded'), num('testimoniesCount', 'Testimonies count')] },
  { code: 'house_fellowship_crusade', name: 'House Fellowship Crusade', levels: ['zone', 'branch'], divisionHints: ['groups'], extras: [str('fellowshipName', 'Fellowship name'), num('soulsWon', 'Souls won')] },
  { code: 'music_praise_evangelism_crusade', name: 'Music/Praise Evangelism Crusade', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [arr('performingGroups', 'Performing groups'), num('soulsWon', 'Souls won')] },
  // — 5.2 eei —
  { code: 'manna_water_on_the_street', name: 'Manna Water on the Street', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [num('locationsCovered', 'Locations covered'), num('peopleReached', 'People reached')] },
  { code: 'mobile_film_show_street', name: 'Mobile Film Show (street)', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [num('locationsCovered', 'Locations covered'), num('peopleReached', 'People reached')] },
  { code: 'film_show_in_buses', name: 'Film Show in Buses', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [num('busesCovered', 'Buses covered'), num('peopleReached', 'People reached')] },
  { code: 'mobile_prayer_booth', name: 'Mobile Prayer Booth (market/terminal/park)', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [enm('locationType', 'Location type', ['market', 'terminal', 'park', 'other']), num('prayersOffered', 'Prayers offered')] },
  { code: 'evangelistic_literature_distribution', name: 'Evangelistic Literature Distribution (multi-language)', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [arr('languagesUsed', 'Languages used'), num('tractsDistributed', 'Tracts distributed')] },
  { code: 'virtual_prayer_room_session', name: 'Virtual Prayer Room Session (WhatsApp/Telegram/App)', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [enm('platform', 'Platform', ['whatsapp', 'telegram', 'app', 'other']), num('peopleReached', 'People reached')] },
  { code: 'digital_solution_evangelism_push', name: 'Digital/Solution Evangelism Push', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['youth'], extras: [num('contentReach', 'Content reach'), num('engagementCount', 'Engagement count')] },
  // — 5.3 jesus_march —
  { code: 'jesus_march_prayer_walk', name: 'Jesus March / Prayer Walk', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [str('routeOrLocation', 'Route or location'), num('participants', 'Participants'), num('prayerPointsCovered', 'Prayer points covered')] },
  { code: 'neighborhood_prayer_walk', name: 'Neighborhood Prayer Walk (House Fellowship)', levels: ['zone', 'branch'], divisionHints: ['groups'], extras: [str('routeOrLocation', 'Route or location'), num('participants', 'Participants'), num('prayerPointsCovered', 'Prayer points covered')] },
  { code: 'youth_jesus_march', name: 'Youth Jesus March', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['youth'], extras: [str('routeOrLocation', 'Route or location'), num('participants', 'Participants'), num('prayerPointsCovered', 'Prayer points covered')] },
  // — 5.4 groups_outreach —
  { code: 'division_community_outreach', name: 'Division Community Outreach (general)', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['groups', 'gmov', 'women_foundation', 'youth', 'teenage', 'children'], extras: [num('beneficiariesReached', 'Beneficiaries reached'), num('volunteersCount', 'Volunteers count')] },
  { code: 'hospital_visitation', name: 'Hospital Visitation', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['groups'], extras: [num('patientsMinisteredTo', 'Patients ministered to')] },
  { code: 'prison_evangelism', name: 'Prison Evangelism', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['groups'], extras: [num('inmatesReached', 'Inmates reached')] },
  { code: 'home_visit_senior_citizens', name: 'Home Visit — Senior Citizens', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['groups', 'women_foundation'], extras: [num('seniorsVisited', 'Seniors visited')] },
  { code: 'food_welfare_evangelism', name: 'Food/Welfare Evangelism', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['groups'], extras: [num('mealsOrItemsDistributed', 'Meals or items distributed'), num('familiesHelped', 'Families helped')] },
  { code: 'benevolence_mission', name: 'Benevolence Mission', levels: ['mega_region', 'region', 'zone', 'branch'], divisionHints: ['groups'], extras: [num('casesSupported', 'Cases supported'), num('fundsDisbursed', 'Funds disbursed')] },
  { code: 'csr_value_chain_outreach', name: 'CSR Value-Chain Outreach (Jesus Wells, IDP, Community Dev)', levels: ['mega_region', 'region', 'zone', 'branch'], extras: [enm('projectType', 'Project type', ['jesus_well', 'idp_outreach', 'community_dev', 'medical_camp', 'legal_aid', 'environmental', 'agricultural', 'other']), num('beneficiariesReached', 'Beneficiaries reached')] },
];

// PROGRAMMATIC categories (§5.5–5.14) — seeded so every category in §3 is
// selectable with its full type catalog (ACTIVITY_MODEL.md §10 phased plan:
// these types were deferred to Phase 4, but the user has asked for the whole
// catalog now so activities can be categorized into every bucket).
const ANY = ['mega_region', 'region', 'zone', 'branch'];
const MR = ['mega_region'];
const MRR = ['mega_region', 'region'];
const ZB = ['zone', 'branch'];

const PROGRAMMATIC_TYPES = [
  // — 5.5 church_growth_programme —
  { code: 'developmental_church_programme', name: 'Developmental Church Programme (weekly, per age group)', category: 'church_growth_programme', levels: ANY, extras: [enm('ageGroup', 'Age group', ['children', 'teenage', 'youth', 'young_adults']), num('weeklyAttendance', 'Weekly attendance'), num('newAttendees', 'New attendees')] },
  { code: 'convention_age_group', name: 'Convention (Children/Teenage/Youth/Young Adults)', category: 'church_growth_programme', levels: MRR, extras: [enm('ageGroup', 'Age group', ['children', 'teenage', 'youth', 'young_adults']), num('soulsWon', 'Souls won'), num('followUps', 'Follow-ups')] },
  { code: 'mission_outreach', name: 'Mission Outreach', category: 'church_growth_programme', levels: ANY, extras: [num('teamSize', 'Team size'), num('soulsReached', 'Souls reached')] },
  { code: 'hf_centre_monitoring', name: 'House Fellowship Centre Monitoring', category: 'church_growth_programme', levels: ZB, extras: [num('activeFellowshipsCount', 'Active fellowship centres'), num('averageAttendance', 'Average attendance'), num('newConvertsIntegrated', 'New converts integrated')] },
  { code: 'discipleship_class', name: 'Discipleship/Leadership Class (Foundational/Membership/Discipleship)', category: 'church_growth_programme', levels: ANY, extras: [enm('classTrack', 'Class track', ['foundational', 'membership', 'discipleship']), num('participants', 'Participants'), num('completionRate', 'Completion rate')] },
  { code: 'activity_group_repositioning', name: 'Activity Group Repositioning Event', category: 'church_growth_programme', levels: ANY, extras: [str('groupName', 'Group name'), num('activeMembers', 'Active members')] },
  { code: 'family_counseling_workshop', name: 'Family & Relationship Counseling/Workshop', category: 'church_growth_programme', levels: ANY, extras: [num('sessionsCount', 'Sessions count'), num('attendees', 'Attendees')] },
  { code: 'annual_family_retreat', name: 'Annual Family Retreat', category: 'church_growth_programme', levels: MRR, extras: [num('familiesCount', 'Families count')] },
  { code: 'gmov_mens_retreat', name: 'GMOV Men\'s Retreat', category: 'church_growth_programme', levels: MRR, divisionHints: ['gmov'], extras: [enm('retreatTheme', 'Retreat theme', ['financial_stewardship', 'health_wellbeing', 'evangelism', 'ministry_involvement']), num('attendance', 'Attendance')] },
  { code: 'women_foundation_programme', name: 'Women Foundation Programme (Kneeling Mothers/Destiny Builders)', category: 'church_growth_programme', levels: ANY, divisionHints: ['women_foundation'], extras: [enm('programTrack', 'Program track', ['kneeling_mothers', 'destiny_builders']), num('prayerMeetingsCount', 'Prayer meetings count')] },
  { code: 'faith_healing_conference', name: 'Faith & Healing Conference (Mountain Top Deliverance)', category: 'church_growth_programme', levels: MRR, extras: [num('deliverancesTestimonies', 'Deliverances testimonies')] },
  { code: 'senior_citizens_prayer_circle', name: 'Senior Citizens Prayer Circle', category: 'church_growth_programme', levels: ZB, extras: [num('participants', 'Participants'), num('prayerRequests', 'Prayer requests')] },
  { code: 'holy_communion_service', name: 'Holy Communion Service', category: 'church_growth_programme', levels: ANY, extras: [num('attendance', 'Attendance')] },
  { code: 'operation_none_shall_be_lost', name: 'Operation None Shall Be Lost — Follow-up Visit/Call', category: 'church_growth_programme', levels: ANY, extras: [enm('contactMethod', 'Contact method', ['visit', 'call', 'house_fellowship']), str('retentionOutcome', 'Retention outcome')] },
  { code: 'member_survey', name: 'Member Survey', category: 'church_growth_programme', levels: ANY, extras: [num('responsesCount', 'Responses count'), num('satisfactionScore', 'Satisfaction score')] },
  { code: 'global_prayer_chain_session', name: 'Global Prayer Chain Session', category: 'church_growth_programme', levels: MR, extras: [num('registeredPartners', 'Registered partners'), arr('regionsInvolved', 'Regions involved')] },
  { code: 'new_church_fellowship_plant', name: 'New Church/Fellowship Plant', category: 'church_growth_programme', levels: MRR, extras: [str('location', 'Location'), str('launchDate', 'Launch date'), num('initialMembership', 'Initial membership')] },
  { code: 'daniels_band_meeting', name: 'Daniel\'s Band Meeting', category: 'church_growth_programme', levels: MRR, extras: [num('participants', 'Participants'), num('activitiesHeld', 'Activities held')] },

  // — 5.6 facilities_project —
  { code: 'rebranding_remodelling_project', name: 'Rebranding/Remodelling Project', category: 'facilities_project', levels: ANY, extras: [enm('projectStatus', 'Project status', ['planned', 'in_progress', 'completed']), str('completionDate', 'Completion date'), num('budget', 'Budget')] },
  { code: 'facilities_inspection_maintenance', name: 'Facilities Inspection/Maintenance', category: 'facilities_project', levels: ANY, extras: [str('inspectionDate', 'Inspection date'), str('findings', 'Findings')] },
  { code: 'safety_committee_training_inspection', name: 'Safety Committee Training/Inspection', category: 'facilities_project', levels: ANY, extras: [enm('trainingOrInspection', 'Training or inspection', ['training', 'inspection']), num('incidentsLogged', 'Incidents logged')] },
  { code: 'security_network_deployment', name: 'Security Network Deployment (personnel)', category: 'facilities_project', levels: ANY, extras: [num('personnelCount', 'Personnel count')] },
  { code: 'cctv_deployment_audit', name: 'CCTV Deployment/Audit', category: 'facilities_project', levels: ANY, extras: [num('camerasCount', 'Cameras count'), str('operationalStatus', 'Operational status')] },

  // — 5.7 admin_initiative —
  { code: 'digital_transformation_milestone', name: 'Digital Transformation Milestone', category: 'admin_initiative', levels: ANY, extras: [str('milestoneName', 'Milestone name'), num('adoptionRate', 'Adoption rate')] },
  { code: 'hr_payroll_system_update', name: 'HR/Payroll System Update', category: 'admin_initiative', levels: ANY, extras: [num('staffRecordsUpdated', 'Staff records updated')] },
  { code: 'task_automation_rollout', name: 'Task Automation Rollout', category: 'admin_initiative', levels: ANY, extras: [num('tasksAssigned', 'Tasks assigned'), num('completionRate', 'Completion rate')] },
  { code: 'staff_training_certification', name: 'Staff Training/Certification', category: 'admin_initiative', levels: ANY, extras: [num('participants', 'Participants'), num('certificationsAwarded', 'Certifications awarded')] },
  { code: 'annual_staff_retreat', name: 'Annual Staff Retreat', category: 'admin_initiative', levels: ANY, extras: [num('attendance', 'Attendance')] },
  { code: 'performance_review_cycle', name: 'Performance Review Cycle', category: 'admin_initiative', levels: ANY, extras: [num('reviewScoresAvg', 'Review scores (avg)')] },
  { code: 'wellness_eap_session', name: 'Wellness/EAP Session', category: 'admin_initiative', levels: ANY, extras: [num('sessionsCount', 'Sessions count')] },
  { code: 'diversity_inclusion_training', name: 'Diversity & Inclusion Training', category: 'admin_initiative', levels: ANY, extras: [num('sessionsCount', 'Sessions count'), num('participants', 'Participants')] },
  { code: 'sustainability_initiative', name: 'Sustainability Initiative (paperless/energy)', category: 'admin_initiative', levels: ANY, extras: [enm('metricType', 'Metric type', ['paper_saved', 'energy_reduced']), num('value', 'Value')] },

  // — 5.8 human_capital_training —
  { code: 'mtms_training_session', name: 'MTMS Training Session (Pastors/Ministers)', category: 'human_capital_training', levels: ANY, extras: [num('enrollment', 'Enrollment'), num('completionRate', 'Completion rate')] },
  { code: 'online_learning_cohort', name: 'Online Learning Platform Cohort', category: 'human_capital_training', levels: ANY, extras: [num('users', 'Users'), num('coursesTaken', 'Courses taken')] },
  { code: 'internship_apprenticeship', name: 'Internship/Apprenticeship Placement', category: 'human_capital_training', levels: ANY, extras: [num('internsCount', 'Interns count'), num('placements', 'Placements')] },
  { code: 'cross_cultural_missions_training', name: 'Cross-Cultural Missions Training', category: 'human_capital_training', levels: ANY, extras: [num('participants', 'Participants')] },
  { code: 'soft_skills_workshop', name: 'Soft Skills Workshop', category: 'human_capital_training', levels: ANY, extras: [str('topic', 'Topic'), num('attendance', 'Attendance')] },
  { code: 'pastors_spouses_training', name: 'Pastors\' Spouses Training', category: 'human_capital_training', levels: ANY, extras: [num('attendance', 'Attendance')] },
  { code: 'character_building_seminar', name: 'Character-Building Seminar', category: 'human_capital_training', levels: ANY, extras: [num('attendance', 'Attendance')] },
  { code: 'sustainable_agriculture_training', name: 'Sustainable Agriculture Training', category: 'human_capital_training', levels: ANY, extras: [num('participants', 'Participants'), num('farmingProjects', 'Farming projects')] },
  { code: 'environmental_stewardship_workshop', name: 'Environmental Stewardship Workshop', category: 'human_capital_training', levels: ANY, extras: [num('participants', 'Participants'), num('initiativesTaken', 'Initiatives taken')] },
  { code: 'vocational_training', name: 'Vocational Training', category: 'human_capital_training', levels: ANY, extras: [num('coursesOffered', 'Courses offered'), num('graduates', 'Graduates'), num('jobPlacements', 'Job placements')] },
  { code: 'digital_literacy_training', name: 'Digital Literacy Training', category: 'human_capital_training', levels: ANY, extras: [num('participants', 'Participants'), num('skillAssessmentScore', 'Skill assessment score')] },
  { code: 'career_fair_networking', name: 'Career Fair/Networking Event', category: 'human_capital_training', levels: ANY, extras: [num('attendees', 'Attendees'), num('jobOffers', 'Job offers')] },
  { code: 'media_arts_training', name: 'Media & Arts Training', category: 'human_capital_training', levels: ANY, extras: [num('participants', 'Participants'), num('projectsProduced', 'Projects produced')] },

  // — 5.9 music_worship —
  { code: 'hymn_singing_programme', name: 'Hymn Singing Programme', category: 'music_worship', levels: ANY, extras: [num('hymnsLearned', 'Hymns learned'), num('participants', 'Participants')] },
  { code: 'musical_concert_talent_hunt', name: 'Musical Concert/Talent Hunt', category: 'music_worship', levels: ANY, extras: [num('attendance', 'Attendance'), num('soulsWon', 'Souls won')] },
  { code: 'hymn_app_usage', name: 'Hymn App/Learning Platform Usage', category: 'music_worship', levels: ANY, extras: [num('downloads', 'Downloads'), num('activeUsers', 'Active users')] },
  { code: 'hymn_choir_rehearsal_performance', name: 'Children\'s/Youth Hymn Choir Rehearsal/Performance', category: 'music_worship', levels: ANY, divisionHints: ['children', 'youth'], extras: [num('membersCount', 'Members count')] },
  { code: 'community_hymn_outreach', name: 'Community Hymn Outreach/Evangelistic Night', category: 'music_worship', levels: ANY, extras: [num('attendance', 'Attendance'), num('soulsWon', 'Souls won')] },
  { code: 'cultural_hymn_exchange_tour', name: 'Cultural Hymn Exchange/Tour', category: 'music_worship', levels: ANY, extras: [num('participants', 'Participants')] },
  { code: 'indoor_outdoor_concert', name: 'Indoor/Outdoor Concert', category: 'music_worship', levels: ANY, extras: [num('attendance', 'Attendance'), num('soulsWon', 'Souls won')] },
  { code: 'praise_worship_festival', name: 'Praise/Worship Festival (High Praises, Mega Praise, etc.)', category: 'music_worship', levels: MRR, extras: [num('attendance', 'Attendance'), num('decisionsForChrist', 'Decisions for Christ')] },
  { code: 'virtual_worship_night', name: 'Virtual Worship Night/Live-Stream', category: 'music_worship', levels: ANY, extras: [num('viewership', 'Viewership'), num('engagement', 'Engagement')] },
  { code: 'multi_language_worship_session', name: 'Multi-Language Worship Session', category: 'music_worship', levels: ANY, extras: [arr('languagesUsed', 'Languages used')] },
  { code: 'worship_album_video_production', name: 'Worship Album/Music Video Production', category: 'music_worship', levels: MR, extras: [num('unitsReleased', 'Units released'), num('streams', 'Streams')] },
  { code: 'gospel_musical_drama', name: 'Gospel Musical Drama/Storytelling', category: 'music_worship', levels: ANY, extras: [num('productionsCount', 'Productions count'), num('soulsWon', 'Souls won')] },
  { code: 'campus_school_music_outreach', name: 'Campus/School Music Outreach', category: 'music_worship', levels: ANY, divisionHints: ['youth'], extras: [num('studentsReached', 'Students reached'), num('decisions', 'Decisions')] },

  // — 5.10 media_brand —
  { code: 'social_content_post_series', name: 'Social Content Post/Series', category: 'media_brand', levels: ANY, extras: [str('platform', 'Platform'), num('engagementCount', 'Engagement count')] },
  { code: 'short_form_video_devotional', name: 'Short-Form Video/Devotional', category: 'media_brand', levels: ANY, extras: [num('views', 'Views'), num('shares', 'Shares')] },
  { code: 'digital_discipleship_group', name: 'Digital Discipleship Group Activity', category: 'media_brand', levels: ANY, extras: [str('groupPlatform', 'Group platform'), num('membersCount', 'Members count')] },
  { code: 'youth_challenge_hashtag_campaign', name: 'Youth Challenge/Hashtag Campaign', category: 'media_brand', levels: ANY, divisionHints: ['youth'], extras: [num('participationCount', 'Participation count')] },
  { code: 'targeted_ad_campaign', name: 'Targeted Ad Campaign', category: 'media_brand', levels: ANY, extras: [num('budget', 'Budget'), num('reach', 'Reach'), num('conversions', 'Conversions')] },
  { code: 'referral_brand_advocacy', name: 'Referral/Brand Advocacy Push', category: 'media_brand', levels: ANY, extras: [num('referralsCount', 'Referrals count')] },
  { code: 'billboard_signage_placement', name: 'Billboard/Signage Placement', category: 'media_brand', levels: ANY, extras: [arr('locations', 'Locations'), num('cost', 'Cost')] },
  { code: 'digital_newsletter_issue', name: 'Digital Newsletter Issue', category: 'media_brand', levels: ANY, extras: [num('subscribers', 'Subscribers'), num('openRate', 'Open rate')] },
  { code: 'press_release_media_coverage', name: 'Press Release/Media Coverage', category: 'media_brand', levels: ANY, extras: [num('outletsReached', 'Outlets reached')] },
  { code: 'tv_channel_expansion_milestone', name: 'TV Channel Expansion Milestone', category: 'media_brand', levels: MR, extras: [str('channelName', 'Channel name'), num('viewershipRating', 'Viewership rating')] },
  { code: 'virtual_prayer_meeting_tv', name: 'Virtual Prayer Meeting/Counseling (TV)', category: 'media_brand', levels: ANY, extras: [num('participants', 'Participants')] },
  { code: 'mobile_app_milestone', name: 'Mobile App Milestone', category: 'media_brand', levels: MR, extras: [num('downloads', 'Downloads'), num('activeUsers', 'Active users')] },

  // — 5.11 csr_project —
  { code: 'jesus_well_initiative', name: 'Jesus Well Initiative', category: 'csr_project', levels: ANY, extras: [num('wellsDrilled', 'Wells drilled'), num('beneficiaries', 'Beneficiaries')] },
  { code: 'idp_needy_community_outreach', name: 'IDP/Needy-Community Outreach', category: 'csr_project', levels: ANY, extras: [enm('region', 'Region', ['north_east', 'north_west', 'north_central', 'other']), num('peopleServed', 'People served')] },
  { code: 'community_development_project', name: 'Community Development Project', category: 'csr_project', levels: ANY, extras: [str('projectDescription', 'Project description'), str('impactMeasure', 'Impact measure')] },
  { code: 'medical_camp_free_clinic', name: 'Medical Camp/Free Clinic', category: 'csr_project', levels: ANY, extras: [num('patientsTreated', 'Patients treated')] },
  { code: 'mental_health_support_session', name: 'Mental Health Support Session', category: 'csr_project', levels: ANY, extras: [num('sessionsHeld', 'Sessions held')] },
  { code: 'tree_planting_cleanup_drive', name: 'Tree Planting/Clean-Up Drive', category: 'csr_project', levels: ANY, extras: [num('treesPlanted', 'Trees planted'), num('wasteCollectedKg', 'Waste collected (kg)')] },
  { code: 'community_farming_agricultural_training', name: 'Community Farming/Agricultural Training', category: 'csr_project', levels: ANY, extras: [num('farmSize', 'Farm size'), arr('crops', 'Crops'), num('participants', 'Participants')] },
  { code: 'legal_aid_support', name: 'Legal Aid Support', category: 'csr_project', levels: ANY, extras: [num('casesHandled', 'Cases handled')] },

  // — 5.12 house_fellowship_programme —
  { code: 'hf_night_vigil', name: 'House Fellowship Night Vigil', category: 'house_fellowship_programme', levels: ZB, divisionHints: ['groups'], extras: [num('attendance', 'Attendance'), num('prayerRequests', 'Prayer requests')] },
  { code: 'hf_leadership_training', name: 'Leadership Training/Volunteer Mentorship', category: 'house_fellowship_programme', levels: ZB, divisionHints: ['groups'], extras: [num('participants', 'Participants'), num('newLeadersIdentified', 'New leaders identified')] },
  { code: 'hf_followup_contact', name: 'Follow-Up Contact (SMS/Email/Call)', category: 'house_fellowship_programme', levels: ZB, divisionHints: ['groups'], extras: [enm('contactMethod', 'Contact method', ['sms', 'email', 'call', 'other']), str('conversionOutcome', 'Conversion outcome')] },
  { code: 'hf_quarterly_reflection', name: 'Quarterly Leadership Reflection Session', category: 'house_fellowship_programme', levels: ZB, divisionHints: ['groups'], extras: [str('challengesNoted', 'Challenges noted'), str('actionPlans', 'Action plans')] },
  { code: 'hf_member_feedback_survey', name: 'Member Feedback Survey', category: 'house_fellowship_programme', levels: ZB, divisionHints: ['groups'], extras: [num('responsesCount', 'Responses count'), num('satisfactionScore', 'Satisfaction score')] },
  { code: 'hf_annual_celebration_awards', name: 'Annual House Fellowship Celebration/Awards', category: 'house_fellowship_programme', levels: MRR, divisionHints: ['groups'], extras: [num('attendance', 'Attendance'), num('awardsGiven', 'Awards given')] },

  // — 5.13 economic_development —
  { code: 'school_enrollment_update', name: 'School Enrollment Update (Creche–Secondary)', category: 'economic_development', levels: MR, extras: [str('location', 'Location'), num('enrollmentCount', 'Enrollment count')] },
  { code: 'supermarket_bookstore_snapshot', name: 'Supermarket/Bookstore Performance Snapshot', category: 'economic_development', levels: MRR, extras: [num('revenue', 'Revenue'), num('itemsSold', 'Items sold')] },
  { code: 'agricultural_project_update', name: 'Agricultural Project Update', category: 'economic_development', levels: MRR, extras: [num('acreage', 'Acreage'), arr('crops', 'Crops'), num('yield', 'Yield')] },
  { code: 'food_bank_distribution', name: 'Food Bank Distribution', category: 'economic_development', levels: ANY, extras: [num('foodDistributedKg', 'Food distributed (kg)'), num('peopleReached', 'People reached')] },
  { code: 'youth_agriculture_entrepreneurship', name: 'Youth Agriculture Entrepreneurship Cohort', category: 'economic_development', levels: ANY, divisionHints: ['youth'], extras: [num('youthTrained', 'Youth trained'), num('startupsSupported', 'Startups supported')] },
  { code: 'large_scale_farming_cycle_report', name: 'Large-Scale Farming Cycle Report', category: 'economic_development', levels: MR, extras: [num('productionVolume', 'Production volume'), num('income', 'Income')] },

  // — 5.14 youth_teen_children_programme (non-evangelistic developmental only) —
  { code: 'global_retreat_conference_camp', name: 'Global Retreat/Conference/Camp', category: 'youth_teen_children_programme', levels: MRR, divisionHints: ['youth', 'teenage'], extras: [num('sessions', 'Sessions'), num('decisionsMade', 'Decisions made')] },
  { code: 'leaders_development_boot_camp', name: 'Leaders Development Boot Camp', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage'], extras: [num('trainingModules', 'Training modules'), num('participants', 'Participants')] },
  { code: 'character_leadership_workshop', name: 'Character & Leadership Workshop', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage', 'children'], extras: [num('attendance', 'Attendance'), num('evaluations', 'Evaluations')] },
  { code: 'goal_setting_life_planning_seminar', name: 'Goal-Setting/Life Planning Seminar', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage'], extras: [num('participants', 'Participants'), num('goalsSet', 'Goals set')] },
  { code: 'financial_literacy_session', name: 'Financial Literacy Session', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage'], extras: [num('participants', 'Participants'), num('knowledgeTestScore', 'Knowledge test score')] },
  { code: 'counseling_conflict_resolution', name: 'Counseling/Conflict Resolution Session', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage', 'children'], extras: [num('sessionsCount', 'Sessions count')] },
  { code: 'sports_tournament_fitness', name: 'Sports Tournament/Fitness Workshop', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage'], extras: [num('teamsOrParticipants', 'Teams or participants')] },
  { code: 'skill_acquisition_programme', name: 'Skill Acquisition Programme (PEF, Dorcas, coding, etc.)', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage'], extras: [str('programmeName', 'Programme name'), num('participants', 'Participants'), num('certifications', 'Certifications')] },
  { code: 'internship_job_placement', name: 'Internship/Job Placement', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth'], extras: [num('interns', 'Interns'), num('placements', 'Placements')] },
  { code: 'career_talk_trade_fair', name: 'Career Talk/Trade Fair', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth', 'teenage'], extras: [num('attendees', 'Attendees'), num('connectionsMade', 'Connections made')] },
  { code: 'premarital_counseling_singles_event', name: 'Premarital Counseling/Singles Event', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['youth'], extras: [num('attendance', 'Attendance')] },
  { code: 'hands_on_mission_project_teens', name: 'Hands-On Mission Project (Teens)', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['teenage'], extras: [str('projectDescription', 'Project description'), str('communityImpact', 'Community impact')] },
  { code: 'parent_teen_bonding_event', name: 'Parent-Teen Bonding Event', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['teenage'], extras: [num('familiesCount', 'Families count')] },
  { code: 'stem_club_academic_support', name: 'STEM Club/Academic Support Session', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['teenage'], extras: [num('participants', 'Participants'), str('progressNotes', 'Progress notes')] },
  { code: 'children_weekly_bible_exploration', name: 'Weekly Bible Exploration/Service (Children)', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('weeklyAttendance', 'Weekly attendance')] },
  { code: 'bible_trivia_games_session', name: 'Bible Trivia/Games Session', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('participants', 'Participants')] },
  { code: 'fruits_of_the_spirit_club', name: 'Fruits of the Spirit Club Meeting', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('attendance', 'Attendance')] },
  { code: 'kindness_campaign', name: 'Kindness Campaign', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('actsCount', 'Acts count')] },
  { code: 'annual_faith_festival_childrens_day', name: 'Annual Faith Festival/Children\'s Day', category: 'youth_teen_children_programme', levels: MRR, divisionHints: ['children'], extras: [num('attendance', 'Attendance')] },
  { code: 'creative_worship_praise_dance', name: 'Creative Worship/Praise Dance Rehearsal or Performance', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('membersCount', 'Members count')] },
  { code: 'children_instrumental_music_lesson', name: 'Instrumental Music Lesson (Children)', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('studentsCount', 'Students count')] },
  { code: 'mini_prayer_warriors_training', name: 'Mini Prayer Warriors Training', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('prayerRequestsCollected', 'Prayer requests collected')] },
  { code: 'arts_crafts_project', name: 'Arts & Crafts Project', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('participants', 'Participants')] },
  { code: 'children_bible_app_tech_session', name: 'Bible App/Interactive Tech Session (Kids)', category: 'youth_teen_children_programme', levels: ANY, divisionHints: ['children'], extras: [num('sessionsOrUsageStats', 'Sessions or usage stats')] },
];

// =====================================================================
// ACTIVITY_MODEL.md §7 — WeeklyMetricType catalog
// =====================================================================

const WEEKLY_METRIC_TYPES = [
  { code: 'weekly_attendance_overall', name: 'Weekly church attendance (overall)' },
  { code: 'weekly_attendance_by_division', name: 'Weekly attendance by division', description: 'Stored as { divisionId, count }[]' },
  { code: 'new_converts_weekly', name: 'New converts this week' },
  { code: 'new_members_weekly', name: 'New members this week' },
  { code: 'house_fellowship_centres_count', name: 'Active House Fellowship centres' },
  { code: 'house_fellowship_avg_attendance', name: 'Average House Fellowship attendance' },
  { code: 'house_fellowship_new_converts_integrated', name: 'New converts integrated via House Fellowship' },
  { code: 'discipleship_class_enrollment', name: 'Discipleship class enrollment this week' },
  { code: 'discipleship_class_completions', name: 'Discipleship class completions this week' },
  { code: 'prayer_meeting_vigil_participation', name: 'Prayer meeting / vigil participation' },
  { code: 'social_media_engagement_growth', name: 'Weekly social media engagement growth' },
];

const seed = async () => {
  await connectDB();
  console.log('Seeding data...');

  // Clear existing data (dev/reset)
  await Division.deleteMany({});
  await ActivityCategory.deleteMany({});
  await ActivityType.deleteMany({});
  await WeeklyMetricType.deleteMany({});
  await StrategicInitiative.deleteMany({});
  await OrgUnit.deleteMany({});
  await User.deleteMany({});
  await PresentationCycle.deleteMany({});
  await ComplianceRule.deleteMany({});
  await Activity.deleteMany({});

  // 1. Org tree: 1 Mega Region Hq → 2 Regions → 2 Zones each → 2 Branches each.
  // The application is built for the Mega Regional Headquarters:
  // North Central Mega Region 12, Lugbe.
  // const megaRegion = await OrgUnit.create({
  //   type: 'mega_region',
  //   name: 'North Central Mega Region 12',
  //   location: 'Lugbe, Abuja (FCT)',
  //   isHeadquarters: true,
  // });
  // const regionA = await OrgUnit.create({ type: 'region', name: 'Abuja Region', location: 'Abuja (FCT)', parentId: megaRegion._id });
  // const regionB = await OrgUnit.create({ type: 'region', name: 'Niger/Kogi Region', location: 'Minna, Niger / Lokoja, Kogi', parentId: megaRegion._id });
  // const zones = [];
  // for (const region of [regionA, regionB]) {
  //   zones.push(
  //     await OrgUnit.create({ type: 'zone', name: `${region.name} - Zone 1`, location: region.location, parentId: region._id }),
  //     await OrgUnit.create({ type: 'zone', name: `${region.name} - Zone 2`, location: region.location, parentId: region._id })
  //   );
  // }
  // for (const zone of zones) {
  //   await OrgUnit.create({ type: 'branch', name: `${zone.name} - Branch A`, location: `${zone.location} — Branch A`, parentId: zone._id });
  //   await OrgUnit.create({ type: 'branch', name: `${zone.name} - Branch B`, location: `${zone.location} — Branch B`, parentId: zone._id });
  // }
  // const branches = await OrgUnit.find({ type: 'branch' });

  // 2. Divisions (§3 of MASTER_PLAN / §2 of ACTIVITY_MODEL)
  const divisions = await Division.insertMany([
    { code: 'groups', name: 'Groups', description: 'General adult activity/interest groups' },
    { code: 'gmov', name: 'GMOV (God\'s Men of Valour)', description: 'Men\'s ministry' },
    { code: 'women_foundation', name: 'Women Foundation', description: 'Kneeling Mothers / Destiny Builders Program' },
    { code: 'teenage', name: 'Teenage Ministries', description: 'Zoom on Teenage Ministry' },
    { code: 'youth', name: 'Youth Ministries', description: 'Zoom on Youths and Young Adults Ministry' },
    { code: 'children', name: 'Children\'s Ministry', description: 'Zoom on Children Ministry' },
  ]);
  const divisionByCode = Object.fromEntries(divisions.map((d) => [d.code, d._id]));

  // 3. Strategic Initiatives (§4.2 / ProgramArea) — created before categories so we can link IDs
  await StrategicInitiative.insertMany(INITIATIVES);
  const initiatives = await StrategicInitiative.find().lean();
  const initiativeByCode = Object.fromEntries(initiatives.map((i) => [i.code, i._id]));

  // 4. Activity Categories (§3) with their Program Area links + frequency matrix (§6)
  const categoryDocs = await ActivityCategory.insertMany(
    CATEGORIES.map((c) => ({
      code: c.code,
      name: c.name,
      description: c.description,
      tier: c.tier,
      programAreaIds: c.programAreaKeys.map((k) => initiativeByCode[k]),
      requiredFrequencyByLevel: c.requiredFrequencyByLevel,
    }))
  );
  const categoryByCode = Object.fromEntries(categoryDocs.map((c) => [c.code, c._id]));

  // 5. ActivityType catalog (§5) — all 14 categories seeded with their full
  // type list (CORE + PROGRAMMATIC), so every category is usable at creation time.
  const divisionHintIds = (hints) => (hints || []).map((code) => divisionByCode[code]).filter(Boolean);
  const allTypes = [...CORE_TYPES, ...PROGRAMMATIC_TYPES];
  await ActivityType.insertMany(
    allTypes.map((t) => ({
      code: t.code,
      name: t.name,
      description: t.description || '',
      activityCategoryId: categoryByCode[t.category || categoryForType(t.code)],
      applicableLevels: t.levels,
      applicableDivisionHint: divisionHintIds(t.divisionHints),
      aliases: [],
      extraFields: t.extras || [],
    }))
  );

  // 6. WeeklyMetricType (§7)
  await WeeklyMetricType.insertMany(WEEKLY_METRIC_TYPES);

  // 7. Presentation cycles (editable dates, §6.1)
  await PresentationCycle.insertMany([
    {
      label: 'H1 2026',
      periodStart: new Date('2026-01-01T00:00:00Z'),
      periodEnd: new Date('2026-06-30T23:59:59Z'),
      presentationDate: new Date('2026-07-04T00:00:00Z'),
      status: 'past',
    },
    {
      label: 'H2 2026',
      periodStart: new Date('2026-07-01T00:00:00Z'),
      periodEnd: new Date('2026-12-31T23:59:59Z'),
      presentationDate: new Date('2027-01-05T00:00:00Z'),
      status: 'upcoming',
    },
  ]);

  // 8. Compliance rules (§6 / §9) — keyed on CATEGORY, frequency read from the matrix
  const crusades = categoryByCode.crusades;
  const jesusMarch = categoryByCode.jesus_march;
  const eei = categoryByCode.eei;
  const groupsOutreach = categoryByCode.groups_outreach;
  await ComplianceRule.insertMany([
    // Crusades: Mega Region twice a year (1 per half-year); Region/Zone/Branch bi-monthly (~3 per half-year)
    { orgLevel: 'mega_region', divisionId: null, activityCategoryId: crusades, requiredCountPerPeriod: 1, periodType: 'half-year' },
    { orgLevel: 'region', divisionId: null, activityCategoryId: crusades, requiredCountPerPeriod: 3, periodType: 'half-year' },
    { orgLevel: 'zone', divisionId: null, activityCategoryId: crusades, requiredCountPerPeriod: 3, periodType: 'half-year' },
    { orgLevel: 'branch', divisionId: null, activityCategoryId: crusades, requiredCountPerPeriod: 3, periodType: 'half-year' },
    // Jesus March: quarterly org-wide (2 per half-year)
    { orgLevel: 'mega_region', divisionId: null, activityCategoryId: jesusMarch, requiredCountPerPeriod: 2, periodType: 'half-year' },
    { orgLevel: 'region', divisionId: null, activityCategoryId: jesusMarch, requiredCountPerPeriod: 2, periodType: 'half-year' },
    { orgLevel: 'zone', divisionId: null, activityCategoryId: jesusMarch, requiredCountPerPeriod: 2, periodType: 'half-year' },
    { orgLevel: 'branch', divisionId: null, activityCategoryId: jesusMarch, requiredCountPerPeriod: 2, periodType: 'half-year' },
    // EEI + Groups Outreach: not level-differentiated — informational only (null count => skipped by the checker)
    { orgLevel: 'mega_region', divisionId: null, activityCategoryId: eei, requiredCountPerPeriod: null, periodType: 'half-year' },
    { orgLevel: 'region', divisionId: null, activityCategoryId: eei, requiredCountPerPeriod: null, periodType: 'half-year' },
    { orgLevel: 'zone', divisionId: null, activityCategoryId: eei, requiredCountPerPeriod: null, periodType: 'half-year' },
    { orgLevel: 'branch', divisionId: null, activityCategoryId: eei, requiredCountPerPeriod: null, periodType: 'half-year' },
    { orgLevel: 'mega_region', divisionId: null, activityCategoryId: groupsOutreach, requiredCountPerPeriod: null, periodType: 'half-year' },
    { orgLevel: 'region', divisionId: null, activityCategoryId: groupsOutreach, requiredCountPerPeriod: null, periodType: 'half-year' },
    { orgLevel: 'zone', divisionId: null, activityCategoryId: groupsOutreach, requiredCountPerPeriod: null, periodType: 'half-year' },
    { orgLevel: 'branch', divisionId: null, activityCategoryId: groupsOutreach, requiredCountPerPeriod: null, periodType: 'half-year' },
  ]);

  // 9. Users (invite-based provisioning, §8.1) — created before activities so sample
  // activities can reference a real creator
  const adminUser = await User.create({
    name: 'Super Admin',
    email: 'admin@example.com',
    passwordHash: 'Admin@1234', // plaintext — hashed by pre-save hook
    role: 'super_admin',
    orgUnitId: megaRegion._id,
    isSuperAdmin: true,
    status: 'active',
    isActive: true,
  });

  await User.create({
    name: 'Mega Region Admin',
    email: 'megaadmin@example.com',
    passwordHash: 'Admin@1234',
    role: 'mega_region_admin',
    orgUnitId: megaRegion._id,
    isActive: true,
    status: 'active',
  });

  await User.create({
    name: 'Branch Pastor',
    email: 'pastor@example.com',
    passwordHash: 'Admin@1234',
    role: 'pastor',
    orgUnitId: branches[0]._id,
    divisions: [divisionByCode.youth],
    isActive: true,
    status: 'active',
  });

  // Sample users for the added roles (role expansion)
  const seedUsers = [
    { name: 'Mega Region IT Official', email: 'mega_it@example.com', role: 'mega_region_it', orgUnitId: megaRegion._id, divisions: [] },
    { name: 'Mega Regional Overseer', email: 'overseer@example.com', role: 'mega_region_overseer', orgUnitId: megaRegion._id, divisions: [] },
    { name: 'Regional Overseer', email: 'region_overseer@example.com', role: 'region_overseer', orgUnitId: regionA._id, divisions: [] },
    { name: 'Zonal Pastor', email: 'zonal_pastor@example.com', role: 'zonal_pastor', orgUnitId: zones[0]._id, divisions: [] },
    { name: 'Branch Pastor', email: 'branch_pastor@example.com', role: 'branch_pastor', orgUnitId: branches[1]._id, divisions: [] },
  ];
  for (const su of seedUsers) {
    await User.create({
      name: su.name,
      email: su.email,
      passwordHash: 'Admin@1234',
      role: su.role,
      orgUnitId: su.orgUnitId,
      divisions: su.divisions,
      isActive: true,
      status: 'active',
    });
  }

  // 10. Sample activities (scheduled + completed with reports)
  const typeByCode = Object.fromEntries((await ActivityType.find().lean()).map((t) => [t.code, t._id]));
  const now = new Date();
  const mission = initiativeByCode.mission_evangelism;

  await Activity.create({
    orgUnitId: megaRegion._id,
    activityTypeId: typeByCode.mega_regional_crusade,
    divisions: [],
    strategicInitiativeId: mission,
    title: 'Mega Regional Crusade',
    description: 'Quarter flagship crusade',
    scheduledDate: new Date(now.getFullYear(), now.getMonth(), 28),
    status: 'scheduled',
    createdByUserId: adminUser._id,
  });
  await Activity.create({
    orgUnitId: branches[0]._id,
    activityTypeId: typeByCode.youth_jesus_march,
    divisions: [divisionByCode.youth],
    strategicInitiativeId: mission,
    title: 'Youth Jesus March',
    description: 'Prayer walk with the youth',
    scheduledDate: new Date(now.getFullYear(), now.getMonth(), 15),
    status: 'scheduled',
    createdByUserId: adminUser._id,
  });
  await Activity.create({
    orgUnitId: branches[1]._id,
    activityTypeId: typeByCode.regional_great_deliverance_crusade,
    divisions: [divisionByCode.women_foundation],
    strategicInitiativeId: mission,
    title: 'Women Foundation Outreach Crusade',
    description: 'Kneeling Mothers track',
    scheduledDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
    status: 'completed',
    createdByUserId: adminUser._id,
    report: {
      wasHeld: true,
      markedAt: new Date(now.getFullYear(), now.getMonth() - 1, 7),
      submittedAt: new Date(now.getFullYear(), now.getMonth() - 1, 7),
      narrativeReport: 'Great turnout, many testimonies recorded.',
      metrics: {
        attendanceBreakdown: { total: 850, adults: 520, youth: 330 },
        soulsWon: 64,
        deliverancesRecorded: 22,
        testimoniesCount: 18,
      },
      media: [
        { mediaType: 'image', url: 'https://example.com/report-photo-1.jpg', caption: 'Crowd view' },
        { mediaType: 'image', url: 'https://example.com/report-photo-2.jpg', caption: 'Altar call' },
      ],
    },
  });

  console.log('Seeding completed.');
  console.log(`  Categories: ${categoryDocs.length}`);
  console.log(`  ActivityTypes: ${allTypes.length} (${CORE_TYPES.length} CORE + ${PROGRAMMATIC_TYPES.length} PROGRAMMATIC)`);
  console.log(`  Admin login: admin@example.com / Admin@1234`);
  await mongoose.connection.close();
  process.exit(0);
};

// Map a type code to its category code (used only for types declared without an explicit category key)
function categoryForType(code) {
  if (code.startsWith('crusade') || ['mega_regional_crusade', 'regional_great_deliverance_crusade', 'youth_campus_conquest_crusade', 'youth_teenage_mega_regional_crusade', 'house_fellowship_crusade', 'music_praise_evangelism_crusade'].includes(code)) return 'crusades';
  if (['manna_water_on_the_street', 'mobile_film_show_street', 'film_show_in_buses', 'mobile_prayer_booth', 'evangelistic_literature_distribution', 'virtual_prayer_room_session', 'digital_solution_evangelism_push'].includes(code)) return 'eei';
  if (['jesus_march_prayer_walk', 'neighborhood_prayer_walk', 'youth_jesus_march'].includes(code)) return 'jesus_march';
  return 'groups_outreach';
}

seed().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});