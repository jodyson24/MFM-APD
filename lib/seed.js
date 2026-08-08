require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../db');
const Division = require('../models/Division');
const ActivityType = require('../models/ActivityType');
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

const seed = async () => {
  await connectDB();
  console.log('Seeding data...');

  // Clear existing data (dev/reset)
  await Division.deleteMany({});
  await ActivityType.deleteMany({});
  await StrategicInitiative.deleteMany({});
  await OrgUnit.deleteMany({});
  await User.deleteMany({});
  await PresentationCycle.deleteMany({});
  await ComplianceRule.deleteMany({});
  await Activity.deleteMany({});

  // 1. Org tree: 1 Mega Region → 2 Regions → 2 Zones each → 2 Branches each
  const megaRegion = await OrgUnit.create({ type: 'mega_region', name: 'Mega Region 1' });
  const regionA = await OrgUnit.create({ type: 'region', name: 'Region A', parentId: megaRegion._id });
  const regionB = await OrgUnit.create({ type: 'region', name: 'Region B', parentId: megaRegion._id });
  const zones = [];
  for (const region of [regionA, regionB]) {
    zones.push(
      await OrgUnit.create({ type: 'zone', name: `${region.name} - Zone 1`, parentId: region._id }),
      await OrgUnit.create({ type: 'zone', name: `${region.name} - Zone 2`, parentId: region._id })
    );
  }
  for (const zone of zones) {
    await OrgUnit.create({ type: 'branch', name: `${zone.name} - Branch A`, parentId: zone._id });
    await OrgUnit.create({ type: 'branch', name: `${zone.name} - Branch B`, parentId: zone._id });
  }
  const branches = await OrgUnit.find({ type: 'branch' });

  // 2. Divisions (§3)
  const divisions = await Division.insertMany([
    { code: 'groups', name: 'Groups', description: 'General adult activity/interest groups' },
    { code: 'gmov', name: 'GMOV (God\'s Men of Valour)', description: 'Men\'s ministry' },
    { code: 'women_foundation', name: 'Women Foundation', description: 'Kneeling Mothers / Destiny Builders Program' },
    { code: 'teenage', name: 'Teenage Ministries', description: 'Zoom on Teenage Ministry' },
    { code: 'youth', name: 'Youth Ministries', description: 'Zoom on Youths and Young Adults Ministry' },
    { code: 'children', name: 'Children\'s Ministry', description: 'Zoom on Children Ministry' },
  ]);

  // 3. Activity Types (§4 / §4.1 frequency matrix)
  const youth = divisions.find((d) => d.code === 'youth');
  const women = divisions.find((d) => d.code === 'women_foundation');
  const activityTypes = await ActivityType.insertMany([
    {
      code: 'crusade',
      name: 'Crusades',
      description: 'Evangelistic crusades (Mega Regional / Great Deliverance)',
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: { megaRegion: 2, region: 6, zone: 6, branch: 6 },
    },
    {
      code: 'jesus_march',
      name: 'Jesus March',
      description: 'Prayer Walks / Jesus Marches',
      aliases: ['jesus match', 'jesus matches'],
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: { megaRegion: 4, region: 4, zone: 4, branch: 4 },
    },
    {
      code: 'eei',
      name: 'EEI - Explosive Evangelism Initiatives',
      description: 'Aggressive evangelism (digital and in-person)',
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: { megaRegion: null, region: null, zone: null, branch: null },
    },
    {
      code: 'groups_outreach',
      name: 'Groups Outreach',
      description: 'Community/charity outreach run by groups',
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: { megaRegion: null, region: null, zone: null, branch: null },
    },
  ]);

  // 4. Strategic Initiatives (§4.2)
  await StrategicInitiative.insertMany(INITIATIVES);

  // 5. Presentation cycles (editable dates, §6.1)
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

  // 6. Compliance rules (§4.1 / §9)
  const crusade = activityTypes.find((t) => t.code === 'crusade');
  const jesusMarch = activityTypes.find((t) => t.code === 'jesus_march');
  await ComplianceRule.insertMany([
    // Crusades: Mega Region twice a year (1 per half-year); Region/Zone/Branch bi-monthly (~3 per half-year)
    { orgLevel: 'mega_region', divisionId: null, activityTypeId: crusade._id, requiredCountPerPeriod: 1, periodType: 'half-year' },
    { orgLevel: 'region', divisionId: null, activityTypeId: crusade._id, requiredCountPerPeriod: 3, periodType: 'half-year' },
    { orgLevel: 'zone', divisionId: null, activityTypeId: crusade._id, requiredCountPerPeriod: 3, periodType: 'half-year' },
    { orgLevel: 'branch', divisionId: null, activityTypeId: crusade._id, requiredCountPerPeriod: 3, periodType: 'half-year' },
    // Jesus March: quarterly org-wide (2 per half-year)
    { orgLevel: 'mega_region', divisionId: null, activityTypeId: jesusMarch._id, requiredCountPerPeriod: 2, periodType: 'half-year' },
    { orgLevel: 'region', divisionId: null, activityTypeId: jesusMarch._id, requiredCountPerPeriod: 2, periodType: 'half-year' },
    { orgLevel: 'zone', divisionId: null, activityTypeId: jesusMarch._id, requiredCountPerPeriod: 2, periodType: 'half-year' },
    { orgLevel: 'branch', divisionId: null, activityTypeId: jesusMarch._id, requiredCountPerPeriod: 2, periodType: 'half-year' },
  ]);

  // 7. Users (invite-based provisioning, §8.1) — created before activities so sample
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
    divisions: [youth._id],
    isActive: true,
    status: 'active',
  });

  // 8. Sample activities (scheduled + completed with reports)
  const now = new Date();
  const mission = await StrategicInitiative.findOne({ code: 'mission_evangelism' });

  await Activity.create({
    orgUnitId: megaRegion._id,
    activityTypeId: crusade._id,
    divisions: [],
    strategicInitiativeId: mission._id,
    title: 'Mega Regional Crusade',
    description: 'Quarter flagship crusade',
    scheduledDate: new Date(now.getFullYear(), now.getMonth(), 28),
    status: 'scheduled',
    createdByUserId: adminUser._id,
  });
  await Activity.create({
    orgUnitId: branches[0]._id,
    activityTypeId: jesusMarch._id,
    divisions: [youth._id],
    strategicInitiativeId: mission._id,
    title: 'Youth Jesus March',
    description: 'Prayer walk with the youth',
    scheduledDate: new Date(now.getFullYear(), now.getMonth(), 15),
    status: 'scheduled',
    createdByUserId: adminUser._id,
  });
  await Activity.create({
    orgUnitId: branches[1]._id,
    activityTypeId: crusade._id,
    divisions: [women._id],
    strategicInitiativeId: mission._id,
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
      metrics: { attendance: 850, soulsWon: 64, newConverts: 41, deliverancesRecorded: 22, testimoniesCount: 18 },
      media: [
        { mediaType: 'image', url: 'https://example.com/report-photo-1.jpg', caption: 'Crowd view' },
        { mediaType: 'image', url: 'https://example.com/report-photo-2.jpg', caption: 'Altar call' },
      ],
    },
  });

  console.log('Seeding completed.');
  console.log('  Admin login: admin@example.com / Admin@1234');
  await mongoose.connection.close();
  process.exit(0);
};

seed().catch(async (err) => {
  console.error(err);
  await mongoose.connection.close();
  process.exit(1);
});
