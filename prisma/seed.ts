import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { splitEqually } from "@/lib/split";

async function main() {
  const [alice, bob, carol, dave] = await Promise.all([
    prisma.user.create({ data: { name: "Alice", email: "alice@example.com" } }),
    prisma.user.create({ data: { name: "Bob", email: "bob@example.com" } }),
    prisma.user.create({ data: { name: "Carol", email: "carol@example.com" } }),
    prisma.user.create({ data: { name: "Dave", email: "dave@example.com" } }),
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
