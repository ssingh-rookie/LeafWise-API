import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY;
const API_URL = 'https://api.plant.id/v3/identification';

async function testMultiImageIdentification() {
  if (!PLANT_ID_API_KEY) {
    console.error('PLANT_ID_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('Loading test images...\n');

  const imageDir = path.join(__dirname, 'test-images');
  const imageFiles = fs
    .readdirSync(imageDir)
    .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

  console.log(`Found ${imageFiles.length} images:`);
  imageFiles.forEach((f) => console.log(`  - ${f}`));

  // Load all images as base64
  const images = imageFiles.map((filename) => {
    const filePath = path.join(imageDir, filename);
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('base64');
  });

  console.log(`\nSending ${images.length} images to Plant.id API...\n`);

  const startTime = Date.now();

  const response = await fetch(API_URL + '?details=common_names,taxonomy', {
    method: 'POST',
    headers: {
      'Api-Key': PLANT_ID_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: images,
      similar_images: true,
    }),
  });

  const latency = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${response.status}):`, errorText);
    process.exit(1);
  }

  const result = await response.json();

  console.log('='.repeat(60));
  console.log('MULTI-IMAGE IDENTIFICATION RESULT');
  console.log('='.repeat(60));
  console.log(`Latency: ${latency}ms`);
  console.log(`Images sent: ${images.length}`);
  console.log(`Is Plant: ${result.result.is_plant.binary} (${(result.result.is_plant.probability * 100).toFixed(1)}%)`);
  console.log();

  console.log('Top Suggestions:');
  console.log('-'.repeat(60));

  result.result.classification.suggestions.slice(0, 5).forEach((s: any, i: number) => {
    const commonName = s.details?.common_names?.[0] || 'N/A';
    const family = s.details?.taxonomy?.family || 'Unknown';
    console.log(
      `${i + 1}. ${s.name} (${commonName})`,
    );
    console.log(`   Family: ${family}`);
    console.log(`   Confidence: ${(s.probability * 100).toFixed(1)}%`);
    console.log();
  });
}

testMultiImageIdentification().catch(console.error);
