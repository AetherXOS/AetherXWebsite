// Modern Netlify Functions v2 API with Prisma Client Integration
import { PrismaClient } from "@prisma/client";
import path from "path";

// Convert relative SQLite path to absolute path for serverless compatibility
const dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.startsWith("file:")) {
  const rawPath = dbUrl.replace("file:", "");
  if (!path.isAbsolute(rawPath)) {
    process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), rawPath)}`;
  }
} else if (!dbUrl) {
  process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), "prisma", "prisma", "dev.db")}`;
}

// Prevent multiple prisma instances in serverless environments
let prisma;
if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export default async (req, context) => {
  const dbUrl = process.env.DATABASE_URL || "Not Set";
  let dbStatus = "unknown";
  let counts = {};
  let errorMsg = null;

  try {
    // Attempt a lightweight query to test connection
    const postCount = await prisma.post.count().catch((err) => {
      errorMsg = "Post count failed: " + err.message;
      return null;
    });
    
    const userCount = await prisma.user.count().catch((err) => {
      errorMsg = "User count failed: " + err.message;
      return null;
    });
    
    if (postCount !== null && userCount !== null) {
      dbStatus = "connected";
      counts = {
        posts: postCount,
        users: userCount
      };
    } else {
      dbStatus = "degraded";
    }
  } catch (err) {
    dbStatus = "error";
    errorMsg = err.message;
  }

  const isSqlite = dbUrl.startsWith("file:") || dbUrl.includes(".db");

  const responsePayload = {
    status: "online",
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      databaseUrlConfigured: dbUrl !== "Not Set" && dbUrl.length > 0
    },
    database: {
      connection: dbStatus,
      counts: counts,
      error: errorMsg,
      provider: "sqlite",
      recommendation: isSqlite
        ? "SQLite is a local file-based database. Since Netlify's serverless runtime is ephemeral and read-only, local database changes will be lost between requests. For a production Netlify deploy, migrate your prisma schema datasource provider to PostgreSQL (e.g. Supabase, Neon) or MySQL, and add your production DATABASE_URL under Site Settings > Environment Variables in the Netlify Dashboard."
        : "Database is configured to a non-file network database."
    }
  };

  return new Response(JSON.stringify(responsePayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }
  });
};
