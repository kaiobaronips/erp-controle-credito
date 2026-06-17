import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";
import path from "path";

async function main() {
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  console.log("Migrations done!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
