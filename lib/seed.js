require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../db');
const Division = require('../models/Division');
const ActivityType = require('../models/ActivityType');
const StrategicInitiative = require('../models/StrategicInitiative');
const OrgUnit = require('../models/OrgUnit');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const seed = async () => {
  await connectDB();
  console.log('Seeding data...');

  // Clear existing data (optional)
  await Division.deleteMany({});
  await ActivityType.deleteMany({});
  await StrategicInitiative.deleteMany({});
  await OrgUnit.deleteMany({});
  await User.deleteMany({});

  // 1. Create Mega Region
  const megaRegion = await OrgUnit.create({
    type: 'mega_region',
    name: 'Mega Region 1',
  });

  // 2. Create Divisions
  const divisions = await Division.insertMany([
    { code: 'groups', name: 'Groups', description: 'General adult activity/interest groups' },
    { code: 'gmov', name: 'GMOV (God\'s Men of Valour)', description: 'Men\'s ministry' },
    { code: 'women_foundation', name: 'Women Foundation', description: 'Kneeling Mothers / Destiny Builders Program' },
    { code: 'teenage', name: 'Teenage Ministries', description: 'Zoom on Teenage Ministry' },
    { code: 'youth', name: 'Youth Ministries', description: 'Zoom on Youths and Young Adults Ministry' },
    { code: 'children', name: 'Children\'s Ministry', description: 'Zoom on Children Ministry' },
  ]);

  // 3. Create Activity Types
  const activityTypes = await ActivityType.insertMany([
    {
      code: 'crusade',
      name: 'Crusades',
      description: 'Evangelistic crusades',
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: {
        megaRegion: 2,
        region: 6, // bi-monthly (6 per year)
        zone: 6,
        branch: 6,
      },
    },
    {
      code: 'jesus_march',
      name: 'Jesus March',
      description: 'Prayer Walks / Jesus Marches',
      aliases: ['jesus match', 'jesus matches'],
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: {
        megaRegion: 4,
        region: 4,
        zone: 4,
        branch: 4,
      },
    },
    {
      code: 'eei',
      name: 'EEI - Explosive Evangelism Initiatives',
      description: 'Aggressive evangelism (digital and in-person)',
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: { megaRegion: null, region: null, zone: null, branch: null }, // undefined, informational
    },
    {
      code: 'groups_outreach',
      name: 'Groups Outreach',
      description: 'Community/charity outreach run by groups',
      applicableLevels: ['mega_region', 'region', 'zone', 'branch'],
      requiredFrequencyByLevel: { megaRegion: null, region: null, zone: null, branch: null },
    },
  ]);

  // 4. Create Strategic Initiatives
  const initiatives = await StrategicInitiative.insertMany([
    {
      code: 'mission_evangelism',
      title: 'Mission and Evangelism — Aggressive Evangelism (Digital and In-Person)',
      subtitle: 'Evangelism',
      objectives: 'To aggressively win souls through digital and in-person evangelism',
      outcomes: 'Increased outreach and conversions',
      keyTasks: ['Organize crusades', 'Deploy mobile prayer booths'],
      additionalKeyTasks2025: ['Leverage social media', 'Mobile film shows'],
      targets: ['100,000 souls won', '50 crusades'],
    },
    // Add others similarly...
  ]);

  // 5. Create Super Admin
  const superAdmin = await User.create({
    name: 'Super Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('Admin@1234', 10),
    role: 'super_admin',
    orgUnitId: megaRegion._id,
    isSuperAdmin: true,
    status: 'active',
    isActive: true,
  });

  console.log('Seeding completed.');
  process.exit(0);
};

seed().catch(console.error);