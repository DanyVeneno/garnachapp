import { MongoClient } from "mongodb";
import mongoose from "mongoose";

const cache = globalThis.__garnachappDatabase ??= { native: null, mongoose: null };
function uri() {
  if (!process.env.MONGO_URL) throw new Error("Missing MONGO_URL");
  return process.env.MONGO_URL;
}
export function getMongoClient() {
  if (!cache.native) {
    const client = new MongoClient(uri(), { serverSelectionTimeoutMS: 5000 });
    cache.native = client.connect().catch(async (error) => {
      cache.native = null;
      await client.close();
      throw error;
    });
  }
  return cache.native;
}
export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!cache.mongoose) {
    cache.mongoose = mongoose.connect(uri(), { serverSelectionTimeoutMS: 5000 })
      .catch((error) => { cache.mongoose = null; throw error; });
  }
  const connection = await cache.mongoose;
  cache.mongoose = null;
  return connection;
}
