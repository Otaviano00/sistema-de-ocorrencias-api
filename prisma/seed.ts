import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
    connectionString: process.env["DATABASE_URL"],
});

const prisma = new PrismaClient({ adapter });

async function clearDatabase() {
    console.log("Limpando o banco de dados...");
    await prisma.followUp.deleteMany();
    await prisma.occurrence.deleteMany();
    await prisma.category.deleteMany();
    await prisma.region.deleteMany();
    await prisma.user.deleteMany();
}

async function seedUsers() {
    console.log("Criando usuarios...");
    
    const defaultPasswordHash = "$scrypt$ln=17,r=8,p=1$iIdYpVzpl+g0OgZq0tDKTw$vwRKyr9NmIOx4y12lSuLy0mAa4R7Hl/C2iGyFOZ8axU"; //pwd 

    const adminUser = await prisma.user.create({
        data: {
            name: "Administrador do Sistema",
            email: "admin@sistema.df.gov.br",
            passwordHash: defaultPasswordHash,
            role: "ADMIN",
        },
    });

    const moderatorUser = await prisma.user.create({
        data: {
            name: "Moderador de Ocorrencias",
            email: "moderador@sistema.df.gov.br",
            passwordHash: defaultPasswordHash,
            role: "MODERATOR",
        },
    });

    const citizenUser = await prisma.user.create({
        data: {
            name: "Cidadao Brasiliense",
            email: "cidadao@exemplo.com",
            passwordHash: defaultPasswordHash,
            role: "CITIZEN",
        },
    });

    return { adminUser, moderatorUser, citizenUser };
}

async function seedRegions() {
    console.log("Criando regioes do DF...");
    
    const planoPiloto = await prisma.region.create({ 
        data: { name: "Plano Piloto", isActive: true } 
    });
    const taguatinga = await prisma.region.create({ 
        data: { name: "Taguatinga", isActive: true } 
    });
    const ceilandia = await prisma.region.create({ 
        data: { name: "Ceilandia", isActive: false } 
    });

    return { planoPiloto, taguatinga, ceilandia };
}

async function seedCategories() {
    console.log("Criando categorias...");
    
    const pothole = await prisma.category.create({ 
        data: { name: "Buraco na Via", isActive: true } 
    });
    const lighting = await prisma.category.create({ 
        data: { name: "Iluminacao Publica", isActive: true } 
    });
    const trash = await prisma.category.create({ 
        data: { name: "Acumulo de Lixo", isActive: true } 
    });

    return { pothole, lighting, trash };
}

async function seedOccurrences(userId: number, regions: Record<string, {id: number}>, categories: Record<string, {id: number}>) {
    console.log("Criando ocorrencias...");
    
    const firstOccurrence = await prisma.occurrence.create({
        data: {
            status: "PENDING",
            description: "Buraco muito grande no Eixo Monumental, causando danos aos veiculos.",
            latitude: -15.7942287,
            longitude: -47.8821658,
            createdBy: userId,
            categoryId: categories.pothole.id,
            regionId: regions.planoPiloto.id,
        },
    });

    const secondOccurrence = await prisma.occurrence.create({
        data: {
            status: "CONCLUDED",
            description: "Poste sem luz na Comercial Norte ha duas semanas.",
            latitude: -15.833537,
            longitude: -48.056637,
            createdBy: userId,
            categoryId: categories.lighting.id,
            regionId: regions.taguatinga.id,
        },
    });

    return { firstOccurrence, secondOccurrence };
}

async function seedFollowUps(users: Record<string, {id: number}>, regions: Record<string, {id: number}>, categories: Record<string, {id: number}>, occurrences: Record<string, {id: number}>) {
    console.log("Criando acompanhamentos e monitoramentos...");

    await prisma.followUp.create({
        data: {
            userId: users.citizenUser.id,
            regionId: regions.planoPiloto.id,
        }
    });

    await prisma.followUp.create({
        data: {
            userId: users.citizenUser.id,
            categoryId: categories.pothole.id,
        }
    });

    await prisma.followUp.create({
        data: {
            userId: users.moderatorUser.id,
            occurrenceId: occurrences.firstOccurrence.id,
        }
    });
}

async function main() {
    console.log("Iniciando Seed do Banco de Dados...");

    await clearDatabase();

    const users = await seedUsers();
    const regions = await seedRegions();
    const categories = await seedCategories();
    const occurrences = await seedOccurrences(users.citizenUser.id, regions, categories);
    await seedFollowUps(users, regions, categories, occurrences);

    console.log("Seed finalizada com sucesso!");
}

main()
    .catch(e => {
        console.error("Erro ao executar a seed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });