import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.POSTGRES_URL ?? 'postgresql://root:root@127.0.0.1:5434/dashboard';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding database...\n');

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
    update: { role: 'ADMIN', name: 'Admin' },
    create: {
      phone: '+77074408018',
      name: 'Admin',
      role: 'ADMIN',
      tenantId: null,
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
  console.log(`✅ Owner: ${owner.phone} (👑 Владелец)`);

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
  console.log(`✅ Fin Director: ${finDirector.phone} (📊 Фин. директор)`);

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
  console.log(`✅ Ops Director: ${opsDirector.phone} (⚙️ Опер. директор)`);

  // ═══════════════════════════════════════════════════
  // 3. КОМПАНИИ (юрлица)
  // ═══════════════════════════════════════════════════

  const companyBurger = await prisma.company.upsert({
    where: { id: 'company-burger-na-abaya' },
    update: {},
    create: {
      id: 'company-burger-na-abaya',
      tenantId: kexTenant.id,
      name: 'ТОО "Burger na Abaya"',
    },
  });

  const companyDoner = await prisma.company.upsert({
    where: { id: 'company-a-doner' },
    update: {},
    create: {
      id: 'company-a-doner',
      tenantId: kexTenant.id,
      name: 'ТОО "A Doner"',
    },
  });
  console.log(`✅ Companies: ${companyBurger.name}, ${companyDoner.name}`);

  // ═══════════════════════════════════════════════════
  // 4. БРЕНДЫ (структурные подразделения из iiko)
  // ═══════════════════════════════════════════════════

  const brandBNA = await prisma.brand.upsert({
    where: { slug: 'burger-na-abaya' },
    update: {},
    create: {
      companyId: companyBurger.id,
      name: 'Burger na Abaya',
      slug: 'burger-na-abaya',
      sortOrder: 1,
    },
  });

  const brandDNA = await prisma.brand.upsert({
    where: { slug: 'doner-na-abaya' },
    update: {},
    create: {
      companyId: companyDoner.id,
      name: 'Doner na Abaya',
      slug: 'doner-na-abaya',
      sortOrder: 2,
    },
  });
  console.log(`✅ Brands: ${brandBNA.name}, ${brandDNA.name}`);

  // ═══════════════════════════════════════════════════
  // 5. РЕСТОРАНЫ (торговые предприятия из iiko)
  // ═══════════════════════════════════════════════════

  const bnaRestaurants = [
    'BNA Бесагаш',
    'BNA Жангельдина',
    'BNA Жетысу',
    'BNA Сейфуллина',
    'BNA Стадион',
    'BNA Тастак',
    'BNA Шугыла',
    'BNA Эверест',
  ];

  for (const name of bnaRestaurants) {
    await prisma.restaurant.upsert({
      where: { id: `rest-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `rest-${name.toLowerCase().replace(/\s+/g, '-')}`,
        brandId: brandBNA.id,
        name,
        isActive: true,
      },
    });
  }
  console.log(`✅ BNA Restaurants: ${bnaRestaurants.length} точек`);

  const dnaRestaurants = [
    'DNA Абая-Правды',
    'DNA Айманова',
    'DNA Айнабулак',
    'DNA Аксай',
    'DNA Апорт Ташкентский',
  ];

  for (const name of dnaRestaurants) {
    await prisma.restaurant.upsert({
      where: { id: `rest-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `rest-${name.toLowerCase().replace(/\s+/g, '-')}`,
        brandId: brandDNA.id,
        name,
        isActive: true,
      },
    });
  }
  console.log(`✅ DNA Restaurants: ${dnaRestaurants.length} точек`);

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
  console.log(`✅ DDS Article Groups: ${articleGroups.length} групп`);

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════

  console.log('\n🎉 Seed completed!\n');
  console.log('Тестовые аккаунты:');
  console.log('  +77074408018 → ADMIN (суперадмин)');
  console.log('  +77000000001 → OWNER (👑 Владелец)');
  console.log('  +77000000002 → FINANCE_DIRECTOR (📊 Фин. директор)');
  console.log('  +77000000003 → OPERATIONS_DIRECTOR (⚙️ Опер. директор)');
  console.log(`\nОрганизации:`);
  console.log(`  Burger na Abaya → ${bnaRestaurants.length} точек`);
  console.log(`  Doner na Abaya → ${dnaRestaurants.length} точек`);
  console.log(`  Статей ДДС: ${articleGroups.length} групп`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
