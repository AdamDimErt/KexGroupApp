import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.POSTGRES_URL ?? 'postgresql://root:root@127.0.0.1:5434/dashboard';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding database with REAL iiko structure...\n');

  // ═══════════════════════════════════════════════════
  // 1. ТЕНАНТ
  // ═══════════════════════════════════════════════════

  const kexTenant = await prisma.tenant.upsert({
    where: { slug: 'kex-group' },
    update: {},
    create: {
      name: 'KEX GROUP',
      slug: 'kex-group',
      isActive: true,
    },
  });
  console.log(`✅ Tenant: ${kexTenant.name} (${kexTenant.id})`);

  // ═══════════════════════════════════════════════════
  // 2. ПОЛЬЗОВАТЕЛИ (3 роли + админ)
  // ═══════════════════════════════════════════════════

  const admin = await prisma.user.upsert({
    where: { phone: '+77074408018' },
    update: { role: 'ADMIN', name: 'Admin', tenantId: kexTenant.id },
    create: {
      phone: '+77074408018',
      name: 'Admin',
      role: 'ADMIN',
      tenantId: kexTenant.id,
      isActive: true,
    },
  });
  console.log(`✅ Admin: ${admin.phone}`);

  const owner = await prisma.user.upsert({
    where: { phone: '+77000000001' },
    update: {},
    create: {
      phone: '+77000000001',
      name: 'Бакаева Э.Б.',
      role: 'OWNER',
      tenantId: kexTenant.id,
      isActive: true,
    },
  });
  console.log(`✅ Owner: ${owner.phone}`);

  const finDirector = await prisma.user.upsert({
    where: { phone: '+77000000002' },
    update: {},
    create: {
      phone: '+77000000002',
      name: 'Фин. директор (тест)',
      role: 'FINANCE_DIRECTOR',
      tenantId: kexTenant.id,
      isActive: true,
    },
  });
  console.log(`✅ Fin Director: ${finDirector.phone}`);

  const opsDirector = await prisma.user.upsert({
    where: { phone: '+77000000003' },
    update: {},
    create: {
      phone: '+77000000003',
      name: 'Опер. директор (тест)',
      role: 'OPERATIONS_DIRECTOR',
      tenantId: kexTenant.id,
      isActive: true,
    },
  });
  console.log(`✅ Ops Director: ${opsDirector.phone}`);

  // ═══════════════════════════════════════════════════
  // 3. КОМПАНИИ (юрлица)
  // ═══════════════════════════════════════════════════

  const companyBNA = await prisma.company.upsert({
    where: { id: 'company-bna' },
    update: {},
    create: {
      id: 'company-bna',
      tenantId: kexTenant.id,
      name: 'ТОО "Burger na Abaya"',
    },
  });

  const companyDNA = await prisma.company.upsert({
    where: { id: 'company-dna' },
    update: {},
    create: {
      id: 'company-dna',
      tenantId: kexTenant.id,
      name: 'ТОО "A Doner"',
    },
  });

  const companySB = await prisma.company.upsert({
    where: { id: 'company-sb' },
    update: {},
    create: {
      id: 'company-sb',
      tenantId: kexTenant.id,
      name: 'ТОО "Salam Bro"',
    },
  });

  const companyJD = await prisma.company.upsert({
    where: { id: 'company-jd' },
    update: {},
    create: {
      id: 'company-jd',
      tenantId: kexTenant.id,
      name: 'ТОО "Just Doner"',
    },
  });

  const companyKexBrands = await prisma.company.upsert({
    where: { id: 'company-kex-brands' },
    update: {},
    create: {
      id: 'company-kex-brands',
      tenantId: kexTenant.id,
      name: 'ТОО "KexBrands"',
    },
  });

  console.log(`✅ Companies: 5 юрлиц создано/обновлено`);

  // ═══════════════════════════════════════════════════
  // 4. БРЕНДЫ (структурные подразделения из iiko)
  // ═══════════════════════════════════════════════════

  const brands = [
    { slug: 'bna', name: 'Burger na Abaya', company: companyBNA, iikoGroupId: 'f3864940-8072-4dde-9c03-d1fec8d661c4', order: 1 },
    { slug: 'dna', name: 'Doner na Abaya', company: companyDNA, iikoGroupId: 'f401ea70-f72c-408b-b3a3-935e779c8043', order: 2 },
    { slug: 'jd', name: 'Just Doner', company: companyJD, iikoGroupId: '8a98ad9f-2f5c-4a24-a158-27710db0b1ca', order: 3 },
    { slug: 'sb', name: 'Salam Bro', company: companySB, iikoGroupId: '68339e2f-89c7-495a-b4a4-393dc9c190c4', order: 4 },
    { slug: 'kex-brands', name: 'КексБрэндс', company: companyKexBrands, iikoGroupId: 'aaf28c64-40bf-4cf0-b66a-d17a3a223819', order: 5 },
    { slug: 'kitchen', name: 'Цех', company: companyKexBrands, iikoGroupId: '63b60161-8d0c-4e98-a5d8-e870152fd792', order: 6 },
  ];

  const brandMap: Record<string, any> = {};
  for (const brand of brands) {
    const created = await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: { iikoGroupId: brand.iikoGroupId },
      create: {
        companyId: brand.company.id,
        name: brand.name,
        slug: brand.slug,
        iikoGroupId: brand.iikoGroupId,
        sortOrder: brand.order,
        isActive: true,
      },
    });
    brandMap[brand.slug] = created;
  }
  console.log(`✅ Brands: 6 брендов создано/обновлено`);

  // ═══════════════════════════════════════════════════
  // 5. РЕСТОРАНЫ (торговые предприятия из iiko)
  // ═══════════════════════════════════════════════════

  const restaurants = [
    // BNA - 8 point
    { name: 'BNA Бесагаш', brand: 'bna', iikoId: '582acdbd-dd7d-4848-977a-a3cda41a57ef' },
    { name: 'BNA Жангельдина', brand: 'bna', iikoId: 'b46503f3-0dca-4618-a019-995d1a3a0c0d' },
    { name: 'BNA Жетысу', brand: 'bna', iikoId: 'dc8c7d3b-cff5-4b0c-b45a-76f6768dc58c' },
    { name: 'BNA Сейфуллина', brand: 'bna', iikoId: '988f6699-1291-4992-b2a6-bee0a5556666' },
    { name: 'BNA Стадион', brand: 'bna', iikoId: 'e145cb49-c165-49e0-8afe-6aea6399fe4f' },
    { name: 'BNA Тастак', brand: 'bna', iikoId: 'c3a09b1d-8538-484b-b67a-756df5549591' },
    { name: 'BNA Шугыла', brand: 'bna', iikoId: 'e70cc072-e459-449a-87c0-7e3f4bf78863' },
    { name: 'BNA Эверест', brand: 'bna', iikoId: '5c72810d-03d2-49ad-ab83-0a4d72a359fe' },
    // DNA - 28 points
    { name: 'DNA Абая 15', brand: 'dna', iikoId: 'a1951eb4-231a-4899-9371-85b240295611' },
    { name: 'DNA Абая-Правды', brand: 'dna', iikoId: '5f233786-da04-4323-9246-38e81f78e8c6' },
    { name: 'DNA Айманова', brand: 'dna', iikoId: '742873fe-abd1-4087-84f7-16cc8393c70a' },
    { name: 'DNA Айнабулак', brand: 'dna', iikoId: '1e000a26-7cfd-4ad1-84ee-e6bdb1aeae5a' },
    { name: 'DNA Аксай', brand: 'dna', iikoId: '033477d7-4a16-408f-ab7e-e6cbd52cc85a' },
    { name: 'DNA Апорт Ташкентский', brand: 'dna', iikoId: 'ed55cb8a-0325-4f67-bab2-dc59c7a73979' },
    { name: 'DNA Арбат', brand: 'dna', iikoId: '1b952e26-4590-4154-afc4-691f544d91da' },
    { name: 'DNA Арена Сити', brand: 'dna', iikoId: 'e64a4c23-0948-4c9a-8eeb-341aa825d245' },
    { name: 'DNA Асыл Арман', brand: 'dna', iikoId: '6c9a2422-4b7e-4136-9f7d-4caf1fe74509' },
    { name: 'DNA Атакент', brand: 'dna', iikoId: '6913c10b-d503-460d-b1cb-ee5a37c2fdfc' },
    { name: 'DNA Бесагаш', brand: 'dna', iikoId: 'eed278fd-24d8-4b57-9c3e-08670054a4d8' },
    { name: 'DNA Гагарина', brand: 'dna', iikoId: 'c5ed2797-7e9c-47e5-aacc-401a2061229f' },
    { name: 'DNA Жангельдина', brand: 'dna', iikoId: 'd28adb71-e297-42c7-bf39-9c3eab7275a0' },
    { name: 'DNA Жетысу', brand: 'dna', iikoId: 'd7c6c2be-8038-4b72-8594-cca2f5576b6b' },
    { name: 'DNA Калкаман', brand: 'dna', iikoId: 'b5de4a88-6d2c-4d9d-a920-b23cc7926329' },
    { name: 'DNA Кокжиек', brand: 'dna', iikoId: '6476822d-e789-44ef-a44c-9b11eef501f5' },
    { name: 'DNA Кристалл', brand: 'dna', iikoId: '9ce2a2bc-1a40-46e6-8c78-9eb17f8a6f14' },
    { name: 'DNA Кульджинка', brand: 'dna', iikoId: '7a8f128d-6842-4efe-90ce-e9377302ed90' },
    { name: 'DNA Максима', brand: 'dna', iikoId: '84461baf-7990-4559-9559-dce9012d6634' },
    { name: 'DNA Мега Центр', brand: 'dna', iikoId: 'dc3d1855-8708-4c65-96c2-2cf1dbe2b591' },
    { name: 'DNA Мега парк', brand: 'dna', iikoId: '31accc11-56eb-42a4-b5b0-40aa7662a6fe' },
    { name: 'DNA Пушкина', brand: 'dna', iikoId: '9bff2ebc-25d7-4f49-8cf0-4eb1bb4bb84c' },
    { name: 'DNA Ритц', brand: 'dna', iikoId: 'e450382a-d59f-44f2-973a-b368a8e81ba7' },
    { name: 'DNA Стадион', brand: 'dna', iikoId: '94b432da-545c-4bf2-809e-e3b000685eed' },
    { name: 'DNA Талгар', brand: 'dna', iikoId: 'd8216c56-57ae-4ae8-966d-08a13944dddc' },
    { name: 'DNA Тастак', brand: 'dna', iikoId: '8b9bbb1c-3e19-4860-b71e-ab07a2804f15' },
    { name: 'DNA Толе би-Сейфуллина', brand: 'dna', iikoId: '15a54d71-a68c-4e27-8ec4-9e3eedf51943' },
    { name: 'DNA Шолохова', brand: 'dna', iikoId: 'aebb5df4-b049-442e-8bba-29d7a8e697d6' },
    { name: 'DNA Эверест', brand: 'dna', iikoId: '63dbb488-a355-4eb0-94f0-3bd6fcc43964' },
    // JD - 2 points
    { name: 'JD Гагарина', brand: 'jd', iikoId: 'faa6fb61-4000-4960-bd58-18716aa2fabe' },
    { name: 'JD Тастак', brand: 'jd', iikoId: '271f9575-fee8-4cf4-a82d-bd2afb88a9e0' },
    // SB - 35 points
    { name: 'SB OBI', brand: 'sb', iikoId: 'dcf8a910-434f-484a-8209-925c3266ac30' },
    { name: 'SB Абая-Правды', brand: 'sb', iikoId: 'c48e75f6-4e4d-4392-addf-c45424362081' },
    { name: 'SB Айнабулак', brand: 'sb', iikoId: 'b4558502-3b3d-4507-becb-c4aebdeb143d' },
    { name: 'SB Аксай', brand: 'sb', iikoId: '60f3eeaf-9b60-4e2c-bf77-76cc499477f7' },
    { name: 'SB Апорт Ташкентский', brand: 'sb', iikoId: '3f2b881a-23c7-45eb-8e2e-43b9a4723515' },
    { name: 'SB Арена сити', brand: 'sb', iikoId: '4469dd4e-c7b7-42d5-a258-d210c2803483' },
    { name: 'SB Асыл Арман', brand: 'sb', iikoId: '9f7586d5-a487-4e2e-b15f-e5eb23a8d8e0' },
    { name: 'SB Атакент', brand: 'sb', iikoId: 'b20fd42e-0579-415c-8178-282f58c69de3' },
    { name: 'SB Бесагаш', brand: 'sb', iikoId: 'a42d9d00-25f0-4952-860f-2f0f4579487b' },
    { name: 'SB ГРЭС', brand: 'sb', iikoId: 'e06f82e2-f255-40c2-8d95-febf8f1bd0c2' },
    { name: 'SB Гагарина', brand: 'sb', iikoId: '82f8c88c-75f9-4f5b-8595-ec42fe5c510a' },
    { name: 'SB Гранд Парк', brand: 'sb', iikoId: '3f477b50-67b4-4d8f-9a84-30d74d8b5759' },
    { name: 'SB Думан', brand: 'sb', iikoId: '9b45e822-858f-477c-aaaa-4bb28f0ebd4a' },
    { name: 'SB Жангельдина', brand: 'sb', iikoId: 'cec04ffe-8c9e-4d65-9dde-91dab7a8f5f5' },
    { name: 'SB Жетысу', brand: 'sb', iikoId: 'b515cf61-2b3e-4b67-9ef0-9dcc4af919b3' },
    { name: 'SB Жибек Жолы', brand: 'sb', iikoId: '2bb19f78-c043-4823-9927-0791a0a1ea2d' },
    { name: 'SB Иссык', brand: 'sb', iikoId: '6480417d-b80b-4cc2-afe7-ab6bfe18f137' },
    { name: 'SB Кокжиек', brand: 'sb', iikoId: '37d4ecd6-f3fd-4711-95a7-717522e87882' },
    { name: 'SB Кристалл', brand: 'sb', iikoId: '198c48fa-5539-44d3-b936-a38e791925a9' },
    { name: 'SB Кульджинка', brand: 'sb', iikoId: 'bfebbd3d-5b44-425d-88a3-f81ee1b63b32' },
    { name: 'SB Максима', brand: 'sb', iikoId: '76249c57-8ba9-4493-bdfc-df2613c53535' },
    { name: 'SB Масанчи', brand: 'sb', iikoId: '253d8417-121d-4546-9333-5b2cf39de175' },
    { name: 'SB Мега Парк', brand: 'sb', iikoId: 'b19b7063-d067-4b9b-ac70-0b4870c5e769' },
    { name: 'SB Мега Центр', brand: 'sb', iikoId: 'cdc679c5-3534-4371-af90-ecdbe6a276d4' },
    { name: 'SB Орбита', brand: 'sb', iikoId: '32e4cb52-7629-43f8-8ccc-e02357cfcf79' },
    { name: 'SB Панфилова', brand: 'sb', iikoId: '34487a66-9202-4c84-8c80-6a512ab67243' },
    { name: 'SB Ритц Палас', brand: 'sb', iikoId: '59f79fc3-ab7e-4258-b828-0669275613b3' },
    { name: 'SB Сайран', brand: 'sb', iikoId: '0f5a9557-51bb-49b3-8487-3669d4b8d961' },
    { name: 'SB Стадион', brand: 'sb', iikoId: '1320eaee-fcef-4214-83de-0d4e34984de0' },
    { name: 'SB Талгар', brand: 'sb', iikoId: 'c7e66516-40a3-43dc-94d3-743970404cf3' },
    { name: 'SB Тастак', brand: 'sb', iikoId: '57a39989-3405-4978-aa6c-89e95b39c2f8' },
    { name: 'SB Толе би-Ауэзова', brand: 'sb', iikoId: '656d84d6-1935-4885-acf2-478ff571e0d9' },
    { name: 'SB Толе би-Сейфуллина', brand: 'sb', iikoId: '4eb8e1b5-fc73-49c8-9ce6-3d820c964ba9' },
    { name: 'SB Шугыла', brand: 'sb', iikoId: '6d7c81b9-9862-4e32-872d-da3db70ce758' },
    // КексБрэндс - 1 point
    { name: 'KexBrands', brand: 'kex-brands', iikoId: '426ad630-24e0-4fdc-b32c-02907efccad8' },
    // Цех kitchens - 9 points
    { name: 'Мясной цех', brand: 'kitchen', iikoId: '6a25eb7e-6a0d-4c3b-b92e-81c77a1f0689' },
    { name: 'Обвалочный цех', brand: 'kitchen', iikoId: 'd82788a3-95e4-42de-8c8b-ce60beacb0d2' },
    { name: 'Пекарня', brand: 'kitchen', iikoId: '935e91c7-0b3e-4cf3-8785-ca4e503feaa7' },
    { name: 'Рабочая столовая', brand: 'kitchen', iikoId: '496848b1-2526-431c-9725-0953cf62bb3e' },
    { name: 'Соус нано', brand: 'kitchen', iikoId: '67980251-90d5-4b67-b75a-0ce15f28c748' },
    { name: 'Соус цех', brand: 'kitchen', iikoId: '91df09d4-7554-4999-a98a-b260eea860ad' },
    { name: 'Хоз.склад', brand: 'kitchen', iikoId: '4b90d834-c1a1-4e83-84ef-b9542348bbe6' },
    { name: 'Цех Wonder Burger', brand: 'kitchen', iikoId: '8f828044-fb84-4ab9-975b-159752e23539' },
    { name: 'Цех фри', brand: 'kitchen', iikoId: '48169915-27e6-4814-b21f-d296847f162f' },
  ];

  const restaurantMap: Record<string, any> = {};
  for (const rest of restaurants) {
    const created = await prisma.restaurant.upsert({
      where: { iikoId: rest.iikoId },
      update: {},
      create: {
        brandId: brandMap[rest.brand].id,
        name: rest.name,
        iikoId: rest.iikoId,
        isActive: true,
      },
    });
    restaurantMap[rest.iikoId] = created;
  }
  console.log(`✅ Restaurants: ${restaurants.length} торговых точек создано/обновлено`);
  console.log(`   BNA: 8, DNA: 28, JD: 2, SB: 35, КексБрэндс: 1, Цех: 9`);

  // ═══════════════════════════════════════════════════
  // 6. ГРУППЫ СТАТЕЙ ДДС (из iiko)
  // ═══════════════════════════════════════════════════

  const articleGroups = [
    { code: 'FOOD', name: 'Продукты питания', sortOrder: 1 },
    { code: 'RENT', name: 'Аренда помещений', sortOrder: 2 },
    { code: 'SALARY', name: 'Заработная плата', sortOrder: 3 },
    { code: 'UTILITIES', name: 'Коммунальные услуги', sortOrder: 4 },
    { code: 'MARKETING', name: 'Маркетинг и реклама', sortOrder: 5 },
    { code: 'IT', name: 'IT и связь', sortOrder: 6 },
    { code: 'TRANSPORT', name: 'Транспорт и доставка', sortOrder: 7 },
    { code: 'EQUIPMENT', name: 'Оборудование и ремонт', sortOrder: 8 },
    { code: 'TAXES', name: 'Налоги и сборы', sortOrder: 9 },
    { code: 'OTHER', name: 'Прочие расходы', sortOrder: 10 },
    { code: 'BANK_FEE', name: 'Комиссии банков', sortOrder: 11 },
    { code: 'KITCHEN', name: 'Цех (производство)', sortOrder: 12 },
  ];

  for (const group of articleGroups) {
    await prisma.ddsArticleGroup.upsert({
      where: { tenantId_code: { tenantId: kexTenant.id, code: group.code } },
      update: {},
      create: {
        tenantId: kexTenant.id,
        name: group.name,
        code: group.code,
        sortOrder: group.sortOrder,
      },
    });
  }
  console.log(`✅ DDS Article Groups: ${articleGroups.length} групп создано/обновлено`);

  // ═══════════════════════════════════════════════════
  // 7. SAMPLE FINANCIAL SNAPSHOTS (sample data for testing)
  // ═══════════════════════════════════════════════════

  // Generate financial snapshots for ALL restaurants (realistic ranges per brand)
  const allRests = Object.values(restaurantMap);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Revenue ranges by brand (daily per restaurant, in tenge)
  const brandRevenueRange: Record<string, [number, number]> = {
    'bna': [800_000, 2_500_000],    // BNA: крупные точки
    'dna': [300_000, 1_200_000],    // DNA: средние точки
    'jd':  [200_000, 800_000],      // JD: маленькие точки
    'sb':  [150_000, 600_000],      // SB: самые маленькие
    'kex-brands': [50_000, 200_000], // КексБрэндс: офис
    'kitchen': [100_000, 500_000],  // Цеха: производство
  };

  let snapshotCount = 0;
  for (const rest of allRests) {
    // Find brand slug for this restaurant
    const brandSlug = Object.entries(brandMap).find(([_, b]) => b.id === rest.brandId)?.[0] || 'sb';
    const [minRev, maxRev] = brandRevenueRange[brandSlug] || [100_000, 500_000];

    for (let i = 0; i < 3; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const totalRev = Math.floor(Math.random() * (maxRev - minRev)) + minRev;
      const cashRev = Math.floor(totalRev * (0.15 + Math.random() * 0.2));   // 15-35% cash
      const kaspiRev = Math.floor(totalRev * (0.25 + Math.random() * 0.15)); // 25-40% Kaspi
      const halyqRev = Math.floor(totalRev * (0.05 + Math.random() * 0.1));  // 5-15% Halyk
      const yandexRev = Math.floor(totalRev * (0.03 + Math.random() * 0.07)); // 3-10% Yandex

      await prisma.financialSnapshot.upsert({
        where: {
          restaurantId_date: {
            restaurantId: rest.id,
            date: date,
          },
        },
        update: {
          revenue: totalRev,
          revenueCash: cashRev,
          revenueKaspi: kaspiRev,
          revenueHalyk: halyqRev,
          revenueYandex: yandexRev,
          directExpenses: Math.floor(totalRev * (0.25 + Math.random() * 0.15)),
        },
        create: {
          restaurantId: rest.id,
          date: date,
          revenue: totalRev,
          revenueCash: cashRev,
          revenueKaspi: kaspiRev,
          revenueHalyk: halyqRev,
          revenueYandex: yandexRev,
          directExpenses: Math.floor(totalRev * (0.25 + Math.random() * 0.15)),
        },
      });
      snapshotCount++;
    }
  }
  console.log(`✅ Sample FinancialSnapshots: ${snapshotCount} записей (${allRests.length} ресторанов x 3 дня)`);

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════

  console.log('\n🎉 Seed completed!\n');
  console.log('📋 Структура данных iiko (реальные UUID):');
  console.log('  6 брендов (ORGDEVELOPMENT): BNA, DNA, JD, SB, КексБрэндс, Цех');
  console.log('  83 торговые точки: 8 BNA + 28 DNA + 2 JD + 35 SB + 1 КексБрэндс + 9 Цех');
  console.log('  5 юридических лиц: BNA, DNA, Salam Bro, Just Doner, KexBrands');
  console.log('\n👤 Тестовые аккаунты:');
  console.log('  +77074408018 → ADMIN (суперадмин)');
  console.log('  +77000000001 → OWNER (полный доступ)');
  console.log('  +77000000002 → FINANCE_DIRECTOR (уровни 1-3)');
  console.log('  +77000000003 → OPERATIONS_DIRECTOR (уровни 1-2)');
  console.log('\n📊 DDS Article Groups: 12 групп статей');
  console.log('📈 Sample data: 9 финансовых снимков (3 дня x 3 ресторана)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
