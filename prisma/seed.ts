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
import { ClientStatus, DriverStatus, PrismaClient, RouteStatus, UserRole } from "@prisma/client";

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
  phone: string;
  truckNumber: string | null;
  status: DriverStatus;
}

const DRIVERS: DriverSeed[] = [
  { slug: "marcus-johnson", name: "Marcus Johnson", roleType: "Class A Driver", phone: "(651) 555-0127", truckNumber: "Truck 12", status: DriverStatus.ACTIVE },
  { slug: "sam-wilson", name: "Sam Wilson", roleType: "Class A Driver", phone: "(763) 555-0198", truckNumber: "Truck 07", status: DriverStatus.ACTIVE },
  { slug: "elena-ruiz", name: "Elena Ruiz", roleType: "Class B Driver", phone: "(612) 555-0142", truckNumber: "Truck 03", status: DriverStatus.ACTIVE },
  { slug: "tyler-brandt", name: "Tyler Brandt", roleType: "Class A Driver", phone: "(612) 555-0176", truckNumber: "Truck 09", status: DriverStatus.ON_LEAVE },
  { slug: "priya-nair", name: "Priya Nair", roleType: "Class B Driver", phone: "(651) 555-0163", truckNumber: "Truck 15", status: DriverStatus.ACTIVE },
  { slug: "dale-kowalski", name: "Dale Kowalski", roleType: "Class A Driver", phone: "(763) 555-0184", truckNumber: null, status: DriverStatus.INACTIVE },
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

interface ClientSeed {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  status: ClientStatus;
}

const CLIENTS: ClientSeed[] = [
  {
    companyName: "Acme Logistics",
    contactName: "Jamie Lee",
    phone: "(612) 555-0110",
    email: "jamie@acmelogistics.test",
    address: "500 Industrial Blvd, Minneapolis, MN",
    status: ClientStatus.ACTIVE,
  },
  {
    companyName: "Northland Freight Co.",
    contactName: "Pat Rourke",
    phone: "(651) 555-0134",
    email: "pat@northlandfreight.test",
    address: "88 Harbor Ave, St. Paul, MN",
    status: ClientStatus.ACTIVE,
  },
  {
    companyName: "Twin Cities Retailers",
    contactName: "Morgan Ito",
    phone: "(763) 555-0156",
    email: "morgan@tcretailers.test",
    address: "1200 Commerce Dr, Bloomington, MN",
    status: ClientStatus.INACTIVE,
  },
];

async function main() {
  await prisma.route.deleteMany();
  await prisma.client.deleteMany();
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
              phone: driver.phone,
              truckNumber: driver.truckNumber,
              status: driver.status,
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

  const [acme, northland, twinCities] = await Promise.all(
    CLIENTS.map((client) => prisma.client.create({ data: client })),
  );

  const marcusDriverId = await prisma.driver
    .findUniqueOrThrow({ where: { userId: marcus.id } })
    .then((driver) => driver.id);
  const samDriverId = await prisma.driver
    .findUniqueOrThrow({ where: { userId: sam.id } })
    .then((driver) => driver.id);

  await prisma.route.create({
    data: {
      clientId: acme.id,
      pickupAddress: "500 Industrial Blvd, Minneapolis, MN",
      deliveryAddress: "10 Warehouse Way, Eagan, MN",
      pickupAt: addDays(thisWeekStart, 1),
      status: RouteStatus.SCHEDULED,
    },
  });
  await prisma.route.create({
    data: {
      clientId: northland.id,
      driverId: marcusDriverId,
      pickupAddress: "88 Harbor Ave, St. Paul, MN",
      deliveryAddress: "400 Port Rd, Duluth, MN",
      pickupAt: addDays(thisWeekStart, 2),
      deliveryAt: addDays(thisWeekStart, 3),
      referenceNumber: "PO-4821",
      status: RouteStatus.ASSIGNED,
    },
  });
  await prisma.route.create({
    data: {
      clientId: acme.id,
      driverId: samDriverId,
      pickupAddress: "500 Industrial Blvd, Minneapolis, MN",
      deliveryAddress: "22 Depot St, Rochester, MN",
      pickupAt: addDays(thisWeekStart, -2),
      deliveryAt: addDays(thisWeekStart, -1),
      status: RouteStatus.IN_PROGRESS,
    },
  });
  await prisma.route.create({
    data: {
      clientId: twinCities.id,
      driverId: samDriverId,
      pickupAddress: "1200 Commerce Dr, Bloomington, MN",
      deliveryAddress: "77 Market St, Mankato, MN",
      pickupAt: addDays(thisWeekStart, -7),
      deliveryAt: addDays(thisWeekStart, -6),
      status: RouteStatus.COMPLETED,
    },
  });
  await prisma.route.create({
    data: {
      clientId: northland.id,
      pickupAddress: "88 Harbor Ave, St. Paul, MN",
      deliveryAddress: "5 Lakeview Dr, Brainerd, MN",
      pickupAt: addDays(thisWeekStart, -3),
      status: RouteStatus.CANCELLED,
    },
  });

  console.log(
    `Seeded ${DRIVERS.length + 1} users (1 administrator, ${DRIVERS.length} drivers) with timesheet history across 3 weeks, ${CLIENTS.length} clients, and 5 routes.`,
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
