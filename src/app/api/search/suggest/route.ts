import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { suggestItems } from "@/lib/data";
import type { ItemKind } from "@/generated/prisma/client";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const prefer = searchParams.get("prefer");
  const preferKind: ItemKind | undefined =
    prefer === "EQUIPMENT" || prefer === "CONSUMABLE" ? prefer : undefined;

  const items = await suggestItems(q, { preferKind, limit: 10 });
  return NextResponse.json({ items });
}
