import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const logs = await prisma.apiLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 120
  });

  return NextResponse.json(logs);
}

export async function DELETE() {
  await prisma.apiLog.deleteMany();
  return NextResponse.json({ deleted: true });
}
