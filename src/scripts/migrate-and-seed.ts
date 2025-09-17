import { execSync } from 'child_process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PropertyStatus, PropertyType, Role } from '../prisma/types';

const prisma = new PrismaClient();

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  await prisma.$connect();

  const adminPassword = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      role: 'ADMIN' as Role
    }
  });

  const propertyCount = await prisma.property.count();
  if (propertyCount === 0) {
    const provinces = [
      { province: 'Bangkok', district: 'Watthana', subdistrict: 'Khlong Tan Nuea' },
      { province: 'Chiang Mai', district: 'Mueang Chiang Mai', subdistrict: 'Chang Phueak' },
      { province: 'Phuket', district: 'Mueang Phuket', subdistrict: 'Talat Yai' },
      { province: 'Chon Buri', district: 'Pattaya', subdistrict: 'Nong Prue' },
      { province: 'Khon Kaen', district: 'Mueang Khon Kaen', subdistrict: 'Nai Mueang' }
    ];

    const statusValues: PropertyStatus[] = ['AVAILABLE', 'RESERVED', 'SOLD'];
    const typeValues: PropertyType[] = ['CONDO', 'HOUSE', 'LAND', 'COMMERCIAL'];

    for (let i = 0; i < 50; i++) {
      const locationSeed = provinces[i % provinces.length];
      const location = await prisma.location.create({
        data: {
          province: locationSeed.province,
          district: locationSeed.district,
          subdistrict: locationSeed.subdistrict,
          lat: Number((10 + Math.random() * 10).toFixed(4)),
          lng: Number((100 + Math.random() * 10).toFixed(4))
        }
      });

      const price = randomInt(100_000, 1_000_000_000);
      const beds = Math.random() > 0.2 ? randomInt(1, 5) : null;
      const baths = beds ? Math.max(1, beds - 1) : null;

      await prisma.property.create({
        data: {
          slug: `zomzom-property-${i + 1}`,
          status: statusValues[randomInt(0, statusValues.length - 1)],
          type: typeValues[randomInt(0, typeValues.length - 1)],
          price,
          area: Math.random() > 0.3 ? Number((60 + Math.random() * 240).toFixed(2)) : null,
          beds,
          baths,
          locationId: location.id,
          reservedUntil: Math.random() > 0.8 ? new Date(Date.now() + randomInt(7, 60) * 86_400_000) : null,
          deposit: Math.random() > 0.6,
          i18n: {
            create: [
              {
                locale: 'en',
                title: `Zomzom Residence ${i + 1}`,
                description: `Premium property number ${i + 1} located in ${locationSeed.province}.`,
                amenities: {
                  parking: Math.random() > 0.5,
                  pool: Math.random() > 0.5,
                  security: true
                }
              },
              {
                locale: 'th',
                title: `ทรัพย์สินโซมโซม ${i + 1}`,
                description: `ทรัพย์สินคุณภาพในจังหวัด${locationSeed.province}.`,
                amenities: {
                  parking: Math.random() > 0.5,
                  pool: Math.random() > 0.5,
                  security: true
                }
              }
            ]
          }
        }
      });
    }
  }

  const articleCount = await prisma.article.count();
  if (articleCount === 0) {
    for (let i = 0; i < 5; i++) {
      await prisma.article.create({
        data: {
          slug: `insight-${i + 1}`,
          published: Math.random() > 0.3,
          i18n: {
            create: [
              {
                locale: 'en',
                title: `Market Insight ${i + 1}`,
                body: [
                  { type: 'paragraph', text: 'Latest trends and investment highlights from Zomzom Property.' },
                  { type: 'list', items: ['High demand', 'Rising ROI', 'Secure investments'] }
                ]
              },
              {
                locale: 'th',
                title: `บทวิเคราะห์ตลาด ${i + 1}`,
                body: [
                  { type: 'paragraph', text: 'แนวโน้มและจุดเด่นการลงทุนล่าสุดจากโซมโซม พร็อพเพอร์ตี้' }
                ]
              }
            ]
          }
        }
      });
    }
  }

  await prisma.rate.upsert({
    where: { code: 'THB_USD' },
    update: { value: 0.028 },
    create: { code: 'THB_USD', value: 0.028 }
  });

  console.log('Database migrated and seeded successfully.');
}

seed()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
