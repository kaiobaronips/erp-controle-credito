import { client } from "@/lib/db";

let credoresStatusReady = false;

async function addColumnIfMissing(statement: string) {
  try {
    await client.execute(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.toLowerCase().includes("duplicate column")) {
      throw error;
    }
  }
}

export async function ensureCredoresStatusColumns() {
  if (credoresStatusReady) return;

  await addColumnIfMissing("ALTER TABLE credores ADD COLUMN status_manual text");
  await addColumnIfMissing("ALTER TABLE credores ADD COLUMN status_observacao text");

  credoresStatusReady = true;
}
