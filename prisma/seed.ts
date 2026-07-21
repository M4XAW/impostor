import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

const WORD_CATALOG_MIGRATION_PATH = resolve(
  process.cwd(),
  "prisma/migrations/20260722120000_expand_word_pair_catalog/migration.sql",
);

async function seedWordPairs() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the word catalog.");
  }

  const catalogSql = await readFile(WORD_CATALOG_MIGRATION_PATH, "utf8");
  const client = new Client({ connectionString });

  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(catalogSql);

    const result = await client.query<{ activePairCount: string }>(
      'SELECT count(*) AS "activePairCount" FROM "WordPair" WHERE "isActive" = true',
    );
    const activePairCount = Number(result.rows[0]?.activePairCount ?? 0);

    if (activePairCount < 5000) {
      throw new Error(`Expected at least 5000 active word pairs, found ${activePairCount}.`);
    }

    await client.query("COMMIT");
    console.info(`Word catalog ready: ${activePairCount} active pairs.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

seedWordPairs().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
