/**
 * Development seed: a realistic driver roster and a few weeks of timesheet
 * history covering all three submission statuses. Deliberately self-contained
 * (no import from src/features/timesheets/lib/calculations.ts) since this
 * script is authored and run before that module exists in the task order.
 *
 * Seeded users get placeholder `clerkUserId` values (`seed_<slug>`) — they
 * don't have real Clerk accounts in a dev environment (research.md #2, #8).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function hoursBetween(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return Math.round((minutes / 60) * 100) / 100;
}

const thisWeekStart = mondayOf(new Date());
const lastWeekStart = addDays(thisWeekStart, -7);
const twoWeeksAgoStart = addDays(thisWeekStart, -14);

interface DriverSeed {
  slug: string;
  name: string;
  roleType: string;
  truckNumber: string;
}

const DRIVERS: DriverSeed[] = [
  { slug: "marcus-johnson", name: "Marcus Johnson", roleType: "Class A Driver", truckNumber: "Truck 12" },
  { slug: "sam-wilson", name: "Sam Wilson", roleType: "Class A Driver", truckNumber: "Truck 07" },
  { slug: "elena-ruiz", name: "Elena Ruiz", roleType: "Class B Driver", truckNumber: "Truck 03" },
  { slug: "tyler-brandt", name: "Tyler Brandt", roleType: "Class A Driver", truckNumber: "Truck 09" },
  { slug: "priya-nair", name: "Priya Nair", roleType: "Class B Driver", truckNumber: "Truck 15" },
  { slug: "dale-kowalski", name: "Dale Kowalski", roleType: "Class A Driver", truckNumber: "Truck 21" },
];

interface DailyEntrySeed {
  dayOffset: number; // 0 = Monday .. 6 = Sunday
  startTime: string;
  endTime: string;
}

const FULL_WEEK: DailyEntrySeed[] = [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => ({
  dayOffset,
  startTime: "07:00",
  endTime: dayOffset < 5 ? "16:00" : "12:00",
}));

async function seedTimesheet(userId: string, weekStart: Date, entries: DailyEntrySeed[]) {
  if (entries.length === 0) {
    return;
  }

  const timesheet = await prisma.timesheet.create({
    data: { userId, weekStart },
  });

  for (const entry of entries) {
    await prisma.timesheetEntry.create({
      data: {
        timesheetId: timesheet.id,
        date: addDays(weekStart, entry.dayOffset),
        startTime: entry.startTime,
        endTime: entry.endTime,
        hours: hoursBetween(entry.startTime, entry.endTime),
      },
    });
  }
}

async function main() {
  await prisma.timesheetEntry.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      clerkUserId: "seed_jordan-davis",
      name: "Jordan Davis",
      email: "jordan.davis@mntrucking.test",
      role: UserRole.ADMINISTRATOR,
    },
  });

  await seedTimesheet(admin.id, thisWeekStart, FULL_WEEK);
  await seedTimesheet(admin.id, lastWeekStart, FULL_WEEK);

  const [marcus, sam, elena, tyler, priya, dale] = await Promise.all(
    DRIVERS.map((driver) =>
      prisma.user
        .create({
          data: {
            clerkUserId: `seed_${driver.slug}`,
            name: driver.name,
            email: `${driver.slug}@mntrucking.test`,
            role: UserRole.DRIVER,
          },
        })
        .then((user) =>
          prisma.driver.create({
            data: {
              userId: user.id,
              roleType: driver.roleType,
              truckNumber: driver.truckNumber,
            },
          }).then(() => user),
        ),
    ),
  );

  // This week: Submitted, Submitted, Draft, Draft, Not Submitted, Not Submitted.
  await seedTimesheet(marcus.id, thisWeekStart, FULL_WEEK);
  await seedTimesheet(sam.id, thisWeekStart, FULL_WEEK);
  await seedTimesheet(elena.id, thisWeekStart, FULL_WEEK.slice(0, 3));
  await seedTimesheet(tyler.id, thisWeekStart, FULL_WEEK.slice(0, 5));
  // priya and dale intentionally have no timesheet for the current week.

  // Last week: a mix, to exercise the week filter.
  await seedTimesheet(marcus.id, lastWeekStart, FULL_WEEK);
  await seedTimesheet(sam.id, lastWeekStart, FULL_WEEK);
  await seedTimesheet(elena.id, lastWeekStart, FULL_WEEK);
  await seedTimesheet(priya.id, lastWeekStart, FULL_WEEK.slice(0, 2));

  // Two weeks ago: minimal history.
  await seedTimesheet(marcus.id, twoWeeksAgoStart, FULL_WEEK);
  await seedTimesheet(dale.id, twoWeeksAgoStart, FULL_WEEK.slice(0, 4));

  console.log(
    `Seeded ${DRIVERS.length + 1} users (1 administrator, ${DRIVERS.length} drivers) with timesheet history across 3 weeks.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
