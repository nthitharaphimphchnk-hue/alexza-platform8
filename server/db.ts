import { MongoClient, type Db } from "mongodb";
import dotenv from "dotenv";
import path from "path";

// Load local env for server runtime in development.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

function getDbConfig() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!dbName) throw new Error("Missing MONGODB_DB");

  return { uri, dbName };
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const { uri, dbName } = getDbConfig();

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, { maxPoolSize: 10 });
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db(dbName);
  return cachedDb;
}

export async function pingDb(): Promise<boolean> {
  const db = await getDb();
  await db.command({ ping: 1 });
  return true;
}
