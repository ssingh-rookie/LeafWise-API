// ============================================================================
// LeafWise API - Database Seed
// ============================================================================
// Run with: pnpm db:seed
// ============================================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed common houseplant species
  await seedSpecies();

  // Seed test user (development only)
  if (process.env.NODE_ENV === 'development') {
    await seedTestUser();
  }

  console.log('✅ Seeding complete!');
}

async function seedSpecies() {
  const species = [
    {
      scientificName: 'Epipremnum aureum',
      commonNames: ['Pothos', "Devil's Ivy", 'Golden Pothos'],
      family: 'Araceae',
      genus: 'Epipremnum',
      lightRequirement: 'Low to bright indirect light',
      waterFrequency: 'When top inch of soil is dry (every 1-2 weeks)',
      humidityLevel: 'Average (40-60%)',
      temperature: '65-85°F (18-29°C)',
      toxicity: 'Toxic to pets and humans if ingested',
      difficulty: 'easy',
      description:
        'One of the easiest houseplants to grow. Pothos is a hardy trailing vine that tolerates low light and irregular watering. Perfect for beginners.',
      propagationMethods: ['Stem cuttings in water', 'Stem cuttings in soil'],
      commonIssues: [
        'Yellow leaves from overwatering',
        'Brown leaf tips from low humidity',
        'Leggy growth from low light',
      ],
    },
    {
      scientificName: 'Monstera deliciosa',
      commonNames: ['Swiss Cheese Plant', 'Monstera', 'Split Leaf Philodendron'],
      family: 'Araceae',
      genus: 'Monstera',
      lightRequirement: 'Bright indirect light',
      waterFrequency: 'When top 2 inches of soil are dry (every 1-2 weeks)',
      humidityLevel: 'High (60%+)',
      temperature: '65-85°F (18-29°C)',
      toxicity: 'Toxic to pets and humans if ingested',
      difficulty: 'moderate',
      description:
        'Iconic tropical plant with distinctive split leaves (fenestrations). A statement plant that can grow quite large with proper care.',
      propagationMethods: ['Stem cuttings', 'Air layering'],
      commonIssues: [
        'Brown edges from low humidity',
        'Yellow leaves from overwatering',
        'No fenestrations from insufficient light',
      ],
    },
    {
      scientificName: 'Ficus lyrata',
      commonNames: ['Fiddle Leaf Fig', 'FLF'],
      family: 'Moraceae',
      genus: 'Ficus',
      lightRequirement: 'Bright indirect to direct light',
      waterFrequency: 'When top 2 inches of soil are dry (every 1-2 weeks)',
      humidityLevel: 'High (50-60%+)',
      temperature: '60-75°F (16-24°C)',
      toxicity: 'Mildly toxic to pets',
      difficulty: 'difficult',
      description:
        'Popular statement plant with large, violin-shaped leaves. Known for being finicky about conditions and prone to dropping leaves when stressed.',
      propagationMethods: ['Stem cuttings', 'Air layering'],
      commonIssues: [
        'Brown spots from bacterial infection or overwatering',
        'Leaf drop from changes in environment',
        'Root rot from overwatering',
      ],
    },
    {
      scientificName: 'Sansevieria trifasciata',
      commonNames: ['Snake Plant', "Mother-in-Law's Tongue", 'Sansevieria'],
      family: 'Asparagaceae',
      genus: 'Dracaena',
      lightRequirement: 'Low to bright indirect light',
      waterFrequency: 'When soil is completely dry (every 2-6 weeks)',
      humidityLevel: 'Low to average',
      temperature: '60-85°F (16-29°C)',
      toxicity: 'Mildly toxic to pets',
      difficulty: 'easy',
      description:
        'Extremely hardy succulent with striking upright leaves. Tolerates neglect, low light, and infrequent watering. Great air purifier.',
      propagationMethods: ['Division', 'Leaf cuttings'],
      commonIssues: [
        'Root rot from overwatering',
        'Mushy leaves from cold damage',
        'Brown tips from inconsistent watering',
      ],
    },
    {
      scientificName: 'Spathiphyllum wallisii',
      commonNames: ['Peace Lily'],
      family: 'Araceae',
      genus: 'Spathiphyllum',
      lightRequirement: 'Low to medium indirect light',
      waterFrequency: 'When top inch of soil is dry (every 1-2 weeks)',
      humidityLevel: 'High (50%+)',
      temperature: '65-80°F (18-27°C)',
      toxicity: 'Toxic to pets and humans',
      difficulty: 'easy',
      description:
        'Elegant plant with dark green leaves and white flower-like spathes. Known for its air-purifying qualities and ability to thrive in low light.',
      propagationMethods: ['Division'],
      commonIssues: [
        'Drooping from underwatering',
        'Brown tips from tap water chemicals',
        'Yellow leaves from overwatering',
      ],
    },
    {
      scientificName: 'Chlorophytum comosum',
      commonNames: ['Spider Plant', 'Airplane Plant'],
      family: 'Asparagaceae',
      genus: 'Chlorophytum',
      lightRequirement: 'Medium to bright indirect light',
      waterFrequency: 'When top inch of soil is dry (every 1-2 weeks)',
      humidityLevel: 'Average',
      temperature: '55-80°F (13-27°C)',
      toxicity: 'Non-toxic to pets',
      difficulty: 'easy',
      description:
        'Fast-growing plant that produces baby "spiderettes" on long runners. Excellent air purifier and safe for homes with pets.',
      propagationMethods: ['Plantlets (spiderettes)', 'Division'],
      commonIssues: [
        'Brown tips from fluoride in water',
        'Pale leaves from too much direct sun',
        'No babies from insufficient light',
      ],
    },
    {
      scientificName: 'Philodendron hederaceum',
      commonNames: ['Heartleaf Philodendron', 'Sweetheart Plant'],
      family: 'Araceae',
      genus: 'Philodendron',
      lightRequirement: 'Low to bright indirect light',
      waterFrequency: 'When top inch of soil is dry (every 1-2 weeks)',
      humidityLevel: 'Average to high',
      temperature: '65-80°F (18-27°C)',
      toxicity: 'Toxic to pets and humans',
      difficulty: 'easy',
      description:
        'Classic trailing houseplant with heart-shaped leaves. Very adaptable and forgiving, making it perfect for beginners.',
      propagationMethods: ['Stem cuttings in water', 'Stem cuttings in soil'],
      commonIssues: [
        'Yellow leaves from overwatering',
        'Leggy growth from low light',
        'Small leaves from lack of nutrients',
      ],
    },
    {
      scientificName: 'Dracaena marginata',
      commonNames: ['Dragon Tree', 'Madagascar Dragon Tree'],
      family: 'Asparagaceae',
      genus: 'Dracaena',
      lightRequirement: 'Medium to bright indirect light',
      waterFrequency: 'When top half of soil is dry (every 2-3 weeks)',
      humidityLevel: 'Average',
      temperature: '65-80°F (18-27°C)',
      toxicity: 'Toxic to pets',
      difficulty: 'easy',
      description:
        'Striking plant with slender, arching leaves edged in red. Grows into a small tree shape and is very drought tolerant.',
      propagationMethods: ['Stem cuttings', 'Air layering'],
      commonIssues: [
        'Brown tips from fluoride sensitivity',
        'Leaf drop from overwatering',
        'Yellowing from underwatering',
      ],
    },
  ];

  for (const sp of species) {
    await prisma.species.upsert({
      where: { scientificName: sp.scientificName },
      update: sp,
      create: sp,
    });
  }

  console.log(`  📗 Seeded ${species.length} plant species`);
}

async function seedTestUser() {
  const testUser = await prisma.user.upsert({
    where: { email: 'test@leafwise.app' },
    update: {},
    create: {
      email: 'test@leafwise.app',
      name: 'Test User',
      experienceLevel: 'beginner',
      city: 'San Francisco',
      climateZone: '10a',
      hemisphere: 'northern',
      homeType: 'apartment',
      lightConditions: 'medium',
      humidityLevel: 'medium',
    },
  });

  // Add a test plant
  const pothos = await prisma.species.findUnique({
    where: { scientificName: 'Epipremnum aureum' },
  });

  if (pothos) {
    await prisma.plant.upsert({
      where: {
        id: '00000000-0000-0000-0000-000000000001',
      },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        userId: testUser.id,
        speciesId: pothos.id,
        nickname: 'My First Pothos',
        locationInHome: 'Living room, east window',
        lightExposure: 'medium',
        acquiredDate: new Date('2024-06-01'),
        acquisitionMethod: 'purchased',
      },
    });
  }

  console.log(`  👤 Seeded test user: ${testUser.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
