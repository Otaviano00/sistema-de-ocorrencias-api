import {PrismaPg} from '@prisma/adapter-pg';
import 'dotenv-expand/config';
import {Prisma, PrismaClient} from '../src/generated/prisma/client.js';

// Seed idempotente: só popula o banco quando ele está vazio, então pode rodar a
// cada restart do container sem duplicar dados. Use `--force` (ou SEED_FORCE=true)
// para apagar tudo e recriar: `npm run seed -- --force`.

type Db = Prisma.TransactionClient;
type Ref = {id: number};

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'],
});

const prisma = new PrismaClient({adapter});

const force =
  process.argv.includes('--force') || process.env['SEED_FORCE'] === 'true';

async function isDatabaseEmpty(db: Db) {
  const [users, occurrences] = await Promise.all([
    db.user.count(),
    db.occurrence.count(),
  ]);
  return users === 0 && occurrences === 0;
}

async function clearDatabase(db: Db) {
  console.log('Limpando o banco de dados...');
  await db.followUp.deleteMany();
  await db.occurrence.deleteMany();
  await db.category.deleteMany();
  await db.region.deleteMany();
  await db.user.deleteMany();
}

async function seedUsers(db: Db) {
  console.log('Criando usuarios...');

  const defaultPasswordHash =
    '$2b$10$4uQMaoEtvykEFwcu6eMm8uonu09LpWkdp59mkXyYzosuNEWGdC/o6'; //pwd

  const adminUser = await db.user.create({
    data: {
      name: 'Administrador do Sistema',
      email: 'admin@sistema.df.gov.br',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
    },
  });

  const moderatorUser = await db.user.create({
    data: {
      name: 'Moderador de Ocorrencias',
      email: 'moderador@sistema.df.gov.br',
      passwordHash: defaultPasswordHash,
      role: 'MODERATOR',
    },
  });

  const citizenUser = await db.user.create({
    data: {
      name: 'Cidadao Brasiliense',
      email: 'cidadao@exemplo.com',
      passwordHash: defaultPasswordHash,
      role: 'CITIZEN',
    },
  });

  return {adminUser, moderatorUser, citizenUser};
}

async function seedRegions(db: Db) {
  console.log('Criando regioes do DF...');

  const planoPiloto = await db.region.create({
    data: {name: 'Plano Piloto', isActive: true},
  });
  const taguatinga = await db.region.create({
    data: {name: 'Taguatinga', isActive: true},
  });
  const ceilandia = await db.region.create({
    data: {name: 'Ceilandia', isActive: false},
  });

  return {planoPiloto, taguatinga, ceilandia};
}

async function seedCategories(db: Db) {
  console.log('Criando categorias...');

  const pothole = await db.category.create({
    data: {name: 'Buraco na Via', isActive: true},
  });
  const lighting = await db.category.create({
    data: {name: 'Iluminacao Publica', isActive: true},
  });
  const trash = await db.category.create({
    data: {name: 'Acumulo de Lixo', isActive: true},
  });

  return {pothole, lighting, trash};
}

async function seedOccurrences(
  db: Db,
  userId: number,
  regions: Record<string, Ref>,
  categories: Record<string, Ref>,
) {
  console.log('Criando ocorrencias...');

  const firstOccurrence = await db.occurrence.create({
    data: {
      title: 'Buraco grande no Eixo Monumental',
      status: 'PENDING',
      description:
        'Buraco muito grande no Eixo Monumental, causando danos aos veiculos.',
      latitude: -15.7942287,
      longitude: -47.8821658,
      createdBy: userId,
      categoryId: categories.pothole.id,
      regionId: regions.planoPiloto.id,
    },
  });

  const secondOccurrence = await db.occurrence.create({
    data: {
      title: 'Poste apagado na Comercial Norte',
      status: 'CONCLUDED',
      description: 'Poste sem luz na Comercial Norte ha duas semanas.',
      latitude: -15.833537,
      longitude: -48.056637,
      createdBy: userId,
      categoryId: categories.lighting.id,
      regionId: regions.taguatinga.id,
    },
  });

  return { firstOccurrence, secondOccurrence };
}

async function seedFollowUps(
  db: Db,
  users: Record<string, Ref>,
  regions: Record<string, Ref>,
  categories: Record<string, Ref>,
  occurrences: Record<string, Ref>,
) {
  console.log('Criando acompanhamentos e monitoramentos...');

  await db.followUp.create({
    data: {
      userId: users.citizenUser.id,
      regionId: regions.planoPiloto.id,
    },
  });

  await db.followUp.create({
    data: {
      userId: users.citizenUser.id,
      categoryId: categories.pothole.id,
    },
  });

  await db.followUp.create({
    data: {
      userId: users.moderatorUser.id,
      occurrenceId: occurrences.firstOccurrence.id,
    },
  });
}

async function main() {
  console.log('Iniciando Seed do Banco de Dados...');

  // Tudo numa transação: uma falha no meio não deixa dados parciais que fariam
  // as próximas execuções pularem a seed por acharem o banco "populado".
  const seeded = await prisma.$transaction(
    async db => {
      if (force) {
        await clearDatabase(db);
      } else if (!(await isDatabaseEmpty(db))) {
        return false;
      }

      const users = await seedUsers(db);
      const regions = await seedRegions(db);
      const categories = await seedCategories(db);
      const occurrences = await seedOccurrences(
        db,
        users.citizenUser.id,
        regions,
        categories,
      );
      await seedFollowUps(db, users, regions, categories, occurrences);
      return true;
    },
    {timeout: 30_000},
  );

  console.log(
    seeded
      ? 'Seed finalizada com sucesso!'
      : 'Banco ja populado: seed ignorada (use --force para recriar).',
  );
}

main()
  .catch(e => {
    console.error('Erro ao executar a seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
