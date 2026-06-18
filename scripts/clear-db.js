const { PrismaClient } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const prisma = new PrismaClient();

async function main() {
  await prisma.asset.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.project.deleteMany();
  await prisma.apiCredential.deleteMany();
  await prisma.modelCredential.deleteMany();
  console.log("Local project, jobs, and assets cleared.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
