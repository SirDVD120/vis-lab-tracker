import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ItemKind, type UserRole } from "../src/generated/prisma/client";

type SeedUser = {
  name: string;
  role: UserRole;
  canSignOut: boolean;
  canManageUsers: boolean;
};

type SeedItem = {
  sku: string;
  barcode: string;
  name: string;
  unit: string;
  packageAmount: number | null;
  restockThreshold: number;
  notes: string;
  location: string;
  quantity: number;
  sdsFilename: string | null;
  imageUrl: string | null;
};

type SeedData = {
  locations: string[];
  users: SeedUser[];
  equipment: SeedItem[];
  consumables: SeedItem[];
};

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL must be set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function upsertItem(kind: ItemKind, item: SeedItem, locationIdByName: Map<string, string>) {
  const locationId = item.location ? locationIdByName.get(item.location) ?? null : null;

  await prisma.item.upsert({
    where: { sku: item.sku },
    create: {
      kind,
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      packageAmount: item.packageAmount,
      restockThreshold: item.restockThreshold,
      notes: item.notes,
      sdsFilename: item.sdsFilename,
      imageUrl: item.imageUrl,
      locationId,
    },
    update: {
      kind,
      barcode: item.barcode,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      packageAmount: item.packageAmount,
      restockThreshold: item.restockThreshold,
      notes: item.notes,
      sdsFilename: item.sdsFilename,
      imageUrl: item.imageUrl,
      locationId,
    },
  });
}

async function main() {
  const raw = readFileSync(join(__dirname, "seed-data.json"), "utf8");
  const data = JSON.parse(raw) as SeedData;

  console.log("Seeding users...");
  for (const user of data.users) {
    await prisma.user.upsert({
      where: { name: user.name },
      create: user,
      update: {
        role: user.role,
        canSignOut: user.canSignOut,
        canManageUsers: user.canManageUsers,
      },
    });
  }

  console.log("Seeding locations...");
  const locationIdByName = new Map<string, string>();
  for (const name of data.locations) {
    const loc = await prisma.location.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    locationIdByName.set(name, loc.id);
  }

  // Locations referenced in items but missing from Backend sheet
  const allItemLocations = new Set(
    [...data.equipment, ...data.consumables]
      .map((i) => i.location)
      .filter(Boolean),
  );
  for (const name of allItemLocations) {
    if (!locationIdByName.has(name)) {
      const loc = await prisma.location.upsert({
        where: { name },
        create: { name },
        update: {},
      });
      locationIdByName.set(name, loc.id);
    }
  }

  console.log(`Seeding ${data.equipment.length} equipment items...`);
  for (const item of data.equipment) {
    await upsertItem("EQUIPMENT", item, locationIdByName);
  }

  console.log(`Seeding ${data.consumables.length} consumables...`);
  for (const item of data.consumables) {
    await upsertItem("CONSUMABLE", item, locationIdByName);
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
