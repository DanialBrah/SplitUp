import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  parsePercentageToBasisPoints,
  splitByExactAmounts,
  splitByPercentages,
  splitEqually,
} from "@/lib/split";

const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [alice, bob, carol, dave] = await Promise.all([
    prisma.user.create({
      data: { name: "Alice", email: "alice@example.com", passwordHash },
    }),
    prisma.user.create({
      data: { name: "Bob", email: "bob@example.com", passwordHash },
    }),
    prisma.user.create({
      data: { name: "Carol", email: "carol@example.com", passwordHash },
    }),
    prisma.user.create({
      data: { name: "Dave", email: "dave@example.com", passwordHash },
    }),
  ]);

  const flatmates = await prisma.group.create({
    data: {
      name: "Flatmates",
      description: "Shared household expenses",
      members: {
        create: [alice, bob, carol].map((u) => ({ userId: u.id })),
      },
    },
  });

  const baliTrip = await prisma.group.create({
    data: {
      name: "Bali Trip",
      description: "August 2026 holiday",
      members: {
        create: [alice, bob, dave].map((u) => ({ userId: u.id })),
      },
    },
  });

  const groceriesSplits = splitEqually(4500, [alice.id, bob.id, carol.id]);
  await prisma.expense.create({
    data: {
      groupId: flatmates.id,
      description: "Groceries",
      amountCents: 4500,
      payerId: alice.id,
      date: new Date("2026-08-01"),
      category: "FOOD",
      splits: { create: groceriesSplits },
    },
  });

  // Deliberate uneven-division case: $10.00 split 3 ways -> 334 / 333 / 333.
  const internetSplits = splitEqually(1000, [alice.id, bob.id, carol.id]);
  await prisma.expense.create({
    data: {
      groupId: flatmates.id,
      description: "Internet Bill",
      amountCents: 1000,
      payerId: bob.id,
      date: new Date("2026-08-05"),
      category: "UTILITIES",
      splits: { create: internetSplits },
    },
  });

  const hotelSplits = splitEqually(30000, [alice.id, bob.id, dave.id]);
  await prisma.expense.create({
    data: {
      groupId: baliTrip.id,
      description: "Hotel",
      amountCents: 30000,
      payerId: dave.id,
      date: new Date("2026-07-20"),
      category: "ACCOMMODATION",
      splits: { create: hotelSplits },
    },
  });

  // Unequal split by exact amount: $30.00 as 15/10/5.
  const taxiSplits = splitByExactAmounts([
    { userId: alice.id, amountCents: 1500 },
    { userId: bob.id, amountCents: 1000 },
    { userId: carol.id, amountCents: 500 },
  ]);
  await prisma.expense.create({
    data: {
      groupId: flatmates.id,
      description: "Taxi to airport",
      amountCents: 3000,
      payerId: alice.id,
      date: new Date("2026-08-10"),
      category: "TRANSPORT",
      splitType: "EXACT",
      splits: { create: taxiSplits },
    },
  });

  // Unequal split by percentage: $45.00 at 50/30/20%.
  const cleaningSplits = splitByPercentages(4500, [
    { userId: alice.id, percentageBps: parsePercentageToBasisPoints("50") },
    { userId: bob.id, percentageBps: parsePercentageToBasisPoints("30") },
    { userId: carol.id, percentageBps: parsePercentageToBasisPoints("20") },
  ]);
  await prisma.expense.create({
    data: {
      groupId: flatmates.id,
      description: "Cleaning service",
      amountCents: 4500,
      payerId: carol.id,
      date: new Date("2026-08-12"),
      category: "OTHER",
      splitType: "PERCENTAGE",
      splits: {
        create: cleaningSplits.map((s) => ({
          userId: s.userId,
          shareCents: s.shareCents,
          percentage: (s.percentageBps / 100).toFixed(2),
        })),
      },
    },
  });

  // Settle-up example: Bob pays Alice back part of what he owes.
  await prisma.settlement.create({
    data: {
      groupId: flatmates.id,
      fromUserId: bob.id,
      toUserId: alice.id,
      amountCents: 500,
      date: new Date("2026-08-15"),
      note: "Partial settle-up",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
