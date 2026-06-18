const { PrismaClient } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const prisma = new PrismaClient();

async function ensureColumn(table, name, definition) {
  const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info(${table})`);
  if (!columns.some((column) => column.name === name)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Project (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      nodesJson TEXT NOT NULL DEFAULT '[]',
      edgesJson TEXT NOT NULL DEFAULT '[]',
      settingsJson TEXT NOT NULL DEFAULT '{}',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Asset (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      preview TEXT NOT NULL,
      payloadJson TEXT NOT NULL DEFAULT '{}',
      sourceJobId TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await ensureColumn("Asset", "projectId", "projectId TEXT");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS GenerationJob (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT,
      kind TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL,
      assetsJson TEXT NOT NULL DEFAULT '[]',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completedAt DATETIME
    )
  `);
  await ensureColumn("GenerationJob", "projectId", "projectId TEXT");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ApiLog (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT,
      capability TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      ok BOOLEAN NOT NULL,
      status INTEGER NOT NULL,
      elapsedMs INTEGER NOT NULL,
      requestJson TEXT NOT NULL DEFAULT '{}',
      responseText TEXT NOT NULL DEFAULT '',
      error TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS PromptTemplate (
      id TEXT PRIMARY KEY NOT NULL,
      projectId TEXT,
      scope TEXT NOT NULL DEFAULT 'project',
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ApiCredential (
      provider TEXT PRIMARY KEY NOT NULL,
      apiKey TEXT NOT NULL,
      baseUrl TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await ensureColumn("ApiCredential", "baseUrl", "baseUrl TEXT");

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ModelCredential (
      id TEXT PRIMARY KEY NOT NULL,
      capability TEXT NOT NULL,
      label TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      apiKey TEXT NOT NULL,
      baseUrl TEXT,
      modelsPath TEXT DEFAULT '/models',
      generatePath TEXT,
      statusPath TEXT,
      requestTemplateJson TEXT,
      responseContentPath TEXT,
      responseUrlPath TEXT,
      responseTaskIdPath TEXT,
      responseStatusPath TEXT,
      responseErrorPath TEXT,
      enabled BOOLEAN NOT NULL DEFAULT true,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await ensureColumn("ModelCredential", "modelsPath", "modelsPath TEXT DEFAULT '/models'");
  await ensureColumn("ModelCredential", "generatePath", "generatePath TEXT");
  await ensureColumn("ModelCredential", "statusPath", "statusPath TEXT");
  await ensureColumn("ModelCredential", "requestTemplateJson", "requestTemplateJson TEXT");
  await ensureColumn("ModelCredential", "responseContentPath", "responseContentPath TEXT");
  await ensureColumn("ModelCredential", "responseUrlPath", "responseUrlPath TEXT");
  await ensureColumn("ModelCredential", "responseTaskIdPath", "responseTaskIdPath TEXT");
  await ensureColumn("ModelCredential", "responseStatusPath", "responseStatusPath TEXT");
  await ensureColumn("ModelCredential", "responseErrorPath", "responseErrorPath TEXT");

  console.log("SQLite tables are ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
