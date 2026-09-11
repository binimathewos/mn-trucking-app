/**
 * Development seed: a realistic MN Trucking roster — 5 drivers, 7 routes, and
 * this week's timesheets for every active driver. Deliberately self-contained
 * (no import from src/features/timesheets/lib/calculations.ts) so this script
 * never depends on app code shifting under it.
 *
 * Seeded users get placeholder `clerkUserId` values (`seed_<slug>`) — they
 * don't have real Clerk accounts in a dev environment. Emails use Clerk's
 * `+clerk_test` convention so they can be paired with real Clerk test users
 * later without colliding with production addresses.
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

function atTime(date: Date, time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
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
// dayOffset: 0 = Monday .. 6 = Sunday.
const MON = 0;
const TUE = 1;
const WED = 2;
const THU = 3;
const FRI = 4;
const SAT = 5;

interface DriverSeed {
  slug: string;
  firstName: string;
  name: string;
  roleType: string;
  phone: string;
  truckNumber: string;
  status: DriverStatus;
}

const DRIVERS: DriverSeed[] = [
  {
    slug: "james-anderson",
    firstName: "james",
    name: "James Anderson",
    roleType: "Class A Driver",
    phone: "(612) 555-0142",
    truckNumber: "MN-101",
    status: DriverStatus.ACTIVE,
  },
  {
    slug: "robert-mitchell",
    firstName: "robert",
    name: "Robert Mitchell",
    roleType: "Class A Driver",
    phone: "(651) 555-0187",
    truckNumber: "MN-102",
    status: DriverStatus.ACTIVE,
  },
  {
    slug: "carlos-ramirez",
    firstName: "carlos",
    name: "Carlos Ramirez",
    roleType: "Class B Driver",
    phone: "(763) 555-0129",
    truckNumber: "MN-103",
    status: DriverStatus.ACTIVE,
  },
  {
    slug: "william-carter",
    firstName: "william",
    name: "William Carter",
    roleType: "Class A Driver",
    phone: "(612) 555-0198",
    truckNumber: "MN-104",
    status: DriverStatus.ON_LEAVE,
  },
  {
    slug: "kevin-sullivan",
    firstName: "kevin",
    name: "Kevin Sullivan",
    roleType: "Class B Driver",
    phone: "(651) 555-0165",
    truckNumber: "MN-105",
    status: DriverStatus.ON_LEAVE,
  },
];

interface ClientSeed {
  key: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  status: ClientStatus;
}

const CLIENTS: ClientSeed[] = [
  {
    key: "acme",
    companyName: "Acme Logistics",
    contactName: "Jamie Lee",
    phone: "(612) 555-0110",
    email: "jamie.lee@acmelogistics.com",
    address: "500 Industrial Blvd, Minneapolis, MN",
    status: ClientStatus.ACTIVE,
  },
  {
    key: "northland",
    companyName: "Northland Freight Co.",
    contactName: "Pat Rourke",
    phone: "(651) 555-0134",
    email: "pat.rourke@northlandfreight.com",
    address: "88 Harbor Ave, St. Paul, MN",
    status: ClientStatus.ACTIVE,
  },
  {
    key: "heartland",
    companyName: "Heartland Produce Co.",
    contactName: "Morgan Ito",
    phone: "(507) 555-0156",
    email: "morgan.ito@heartlandproduce.com",
    address: "410 Med Center Dr, Rochester, MN",
    status: ClientStatus.ACTIVE,
  },
  {
    key: "msvalley",
    companyName: "Mississippi Valley Supply",
    contactName: "Casey Nguyen",
    phone: "(507) 555-0172",
    email: "casey.nguyen@msvalleysupply.com",
    address: "250 Riverside Dr, Winona, MN",
    status: ClientStatus.ACTIVE,
  },
  {
    key: "greatplains",
    companyName: "Great Plains Distribution",
    contactName: "Drew Halvorsen",
    phone: "(701) 555-0119",
    email: "drew.halvorsen@greatplainsdist.com",
    address: "1500 Prairie Pkwy, Fargo, ND",
    status: ClientStatus.ACTIVE,
  },
];

interface RouteSeed {
  key: string;
  clientKey: string;
  driverSlug: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupDayOffset: number;
  pickupTime: string;
  deliveryDayOffset: number | null;
  deliveryTime: string | null;
  referenceNumber: string;
  status: RouteStatus;
  hourlyRate: number;
}

const ROUTES: RouteSeed[] = [
  {
    key: "james-1",
    clientKey: "acme",
    driverSlug: "james-anderson",
    pickupAddress: "500 Industrial Blvd, Minneapolis, MN",
    deliveryAddress: "310 Port Ave, Duluth, MN",
    pickupDayOffset: MON,
    pickupTime: "07:00",
    deliveryDayOffset: TUE,
    deliveryTime: "12:00",
    referenceNumber: "PO-58210",
    status: RouteStatus.COMPLETED,
    hourlyRate: 42.0,
  },
  {
    key: "james-2",
    clientKey: "northland",
    driverSlug: "james-anderson",
    pickupAddress: "88 Harbor Ave, St. Paul, MN",
    deliveryAddress: "410 Med Center Dr, Rochester, MN",
    pickupDayOffset: WED,
    pickupTime: "07:30",
    deliveryDayOffset: THU,
    deliveryTime: "14:00",
    referenceNumber: "PO-58244",
    status: RouteStatus.COMPLETED,
    hourlyRate: 45.5,
  },
  {
    key: "james-3",
    clientKey: "greatplains",
    driverSlug: "james-anderson",
    pickupAddress: "500 Industrial Blvd, Minneapolis, MN",
    deliveryAddress: "1500 Prairie Pkwy, Fargo, ND",
    pickupDayOffset: FRI,
    pickupTime: "07:00",
    deliveryDayOffset: null,
    deliveryTime: null,
    referenceNumber: "PO-58299",
    status: RouteStatus.SCHEDULED,
    hourlyRate: 39.75,
  },
  {
    key: "robert-1",
    clientKey: "heartland",
    driverSlug: "robert-mitchell",
    pickupAddress: "410 Med Center Dr, Rochester, MN",
    deliveryAddress: "88 Harbor Ave, St. Paul, MN",
    pickupDayOffset: MON,
    pickupTime: "06:30",
    deliveryDayOffset: TUE,
    deliveryTime: "13:00",
    referenceNumber: "PO-58223",
    status: RouteStatus.COMPLETED,
    hourlyRate: 50.0,
  },
  {
    key: "robert-2",
    clientKey: "msvalley",
    driverSlug: "robert-mitchell",
    pickupAddress: "250 Riverside Dr, Winona, MN",
    deliveryAddress: "500 Industrial Blvd, Minneapolis, MN",
    pickupDayOffset: THU,
    pickupTime: "07:00",
    deliveryDayOffset: THU,
    deliveryTime: "16:00",
    referenceNumber: "PO-58267",
    status: RouteStatus.COMPLETED,
    hourlyRate: 37.25,
  },
  {
    key: "carlos-1",
    clientKey: "acme",
    driverSlug: "carlos-ramirez",
    pickupAddress: "500 Industrial Blvd, Minneapolis, MN",
    deliveryAddress: "9800 Lyndale Ave, Bloomington, MN",
    pickupDayOffset: MON,
    pickupTime: "08:00",
    deliveryDayOffset: WED,
    deliveryTime: "12:00",
    referenceNumber: "PO-58201",
    status: RouteStatus.COMPLETED,
    hourlyRate: 38.0,
  },
  {
    key: "carlos-2",
    clientKey: "northland",
    driverSlug: "carlos-ramirez",
    pickupAddress: "88 Harbor Ave, St. Paul, MN",
    deliveryAddress: "310 Port Ave, Duluth, MN",
    pickupDayOffset: SAT,
    pickupTime: "07:00",
    deliveryDayOffset: null,
    deliveryTime: null,
    referenceNumber: "PO-58310",
    status: RouteStatus.SCHEDULED,
    hourlyRate: 55.0,
  },
];

interface TimesheetEntrySeed {
  dayOffset: number;
  startTime: string;
  endTime: string;
  routeKey: string;
}

const TIMESHEETS: Record<string, TimesheetEntrySeed[]> = {
  "james-anderson": [
    { dayOffset: MON, startTime: "07:00", endTime: "16:00", routeKey: "james-1" },
    { dayOffset: TUE, startTime: "07:00", endTime: "13:00", routeKey: "james-1" },
    { dayOffset: WED, startTime: "07:30", endTime: "16:00", routeKey: "james-2" },
    { dayOffset: THU, startTime: "07:00", endTime: "15:00", routeKey: "james-2" },
    { dayOffset: FRI, startTime: "07:00", endTime: "13:00", routeKey: "james-3" },
  ],
  "robert-mitchell": [
    { dayOffset: MON, startTime: "06:30", endTime: "15:00", routeKey: "robert-1" },
    { dayOffset: TUE, startTime: "07:00", endTime: "13:00", routeKey: "robert-1" },
    { dayOffset: THU, startTime: "07:00", endTime: "16:00", routeKey: "robert-2" },
  ],
  "carlos-ramirez": [
    { dayOffset: MON, startTime: "08:00", endTime: "16:30", routeKey: "carlos-1" },
    { dayOffset: TUE, startTime: "08:00", endTime: "16:00", routeKey: "carlos-1" },
    { dayOffset: WED, startTime: "08:00", endTime: "12:30", routeKey: "carlos-1" },
  ],
};

async function main() {
  // Dependency-safe delete order: children before parents.
  await prisma.timesheetEntry.deleteMany();
  await prisma.timesheet.deleteMany();
  await prisma.route.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();

  await prisma.user.create({
    data: {
      clerkUserId: "seed_admin-jordan-davis",
      name: "Jordan Davis",
      email: "admin_+clerk_test@mnllc.com",
      role: UserRole.ADMINISTRATOR,
    },
  });

  const driverUsersBySlug = new Map<string, { id: string; driverId: string }>();
  for (const driver of DRIVERS) {
    const user = await prisma.user.create({
      data: {
        clerkUserId: `seed_${driver.slug}`,
        name: driver.name,
        email: `${driver.firstName}_+clerk_test@mnllc.com`,
        role: UserRole.DRIVER,
      },
    });
    const driverProfile = await prisma.driver.create({
      data: {
        userId: user.id,
        roleType: driver.roleType,
        phone: driver.phone,
        truckNumber: driver.truckNumber,
        status: driver.status,
      },
    });
    driverUsersBySlug.set(driver.slug, { id: user.id, driverId: driverProfile.id });
  }

  const clientsByKey = new Map<string, { id: string }>();
  for (const client of CLIENTS) {
    const created = await prisma.client.create({
      data: {
        companyName: client.companyName,
        contactName: client.contactName,
        phone: client.phone,
        email: client.email,
        address: client.address,
        status: client.status,
      },
    });
    clientsByKey.set(client.key, created);
  }

  const routesByKey = new Map<string, { id: string }>();
  for (const route of ROUTES) {
    const client = clientsByKey.get(route.clientKey);
    const driver = driverUsersBySlug.get(route.driverSlug);
    if (!client || !driver) {
      throw new Error(`Missing client/driver reference for route ${route.key}`);
    }

    const created = await prisma.route.create({
      data: {
        clientId: client.id,
        driverId: driver.driverId,
        pickupAddress: route.pickupAddress,
        deliveryAddress: route.deliveryAddress,
        pickupAt: atTime(addDays(thisWeekStart, route.pickupDayOffset), route.pickupTime),
        deliveryAt:
          route.deliveryDayOffset !== null && route.deliveryTime !== null
            ? atTime(addDays(thisWeekStart, route.deliveryDayOffset), route.deliveryTime)
            : null,
        referenceNumber: route.referenceNumber,
        status: route.status,
        hourlyRate: route.hourlyRate,
      },
    });
    routesByKey.set(route.key, created);
  }

  for (const [slug, entries] of Object.entries(TIMESHEETS)) {
    const driver = driverUsersBySlug.get(slug);
    if (!driver) {
      throw new Error(`Missing driver for timesheet ${slug}`);
    }

    const timesheet = await prisma.timesheet.create({
      data: { userId: driver.id, weekStart: thisWeekStart },
    });

    for (const entry of entries) {
      const route = routesByKey.get(entry.routeKey);
      if (!route) {
        throw new Error(`Missing route reference for timesheet entry ${entry.routeKey}`);
      }

      await prisma.timesheetEntry.create({
        data: {
          timesheetId: timesheet.id,
          date: addDays(thisWeekStart, entry.dayOffset),
          startTime: entry.startTime,
          endTime: entry.endTime,
          hours: hoursBetween(entry.startTime, entry.endTime),
          routeId: route.id,
        },
      });
    }
  }

  const activeDriverCount = DRIVERS.filter((driver) => driver.status === DriverStatus.ACTIVE).length;
  const onLeaveDriverCount = DRIVERS.filter((driver) => driver.status === DriverStatus.ON_LEAVE).length;

  console.log(
    `Seeded 1 administrator, ${DRIVERS.length} drivers (${activeDriverCount} active, ${onLeaveDriverCount} on leave), ${CLIENTS.length} clients, ${ROUTES.length} routes, and this week's timesheets for every active driver.`,
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
