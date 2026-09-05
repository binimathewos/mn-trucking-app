import type {
  ContainerInventoryRecord,
  DashboardInventoryPreview,
} from "@/features/dashboard/types";

const PREVIEW_SIZE = 5;

const ALL_INVENTORY_RECORDS: ContainerInventoryRecord[] = [
  {
    id: "1",
    containerNumber: "MNKU-123456",
    customerName: "Northstar Logistics",
    location: "Bay 04",
    receivedDate: "2026-08-20",
    checkedOutDate: null,
    status: "in_warehouse",
  },
  {
    id: "2",
    containerNumber: "MSCU-882190",
    customerName: "Prairie Freight Co.",
    location: "Bay 02",
    receivedDate: "2026-08-15",
    checkedOutDate: "2026-08-30",
    status: "checked_out",
  },
  {
    id: "3",
    containerNumber: "TGHU-789012",
    customerName: "Great Lakes Supply",
    location: "Bay 07",
    receivedDate: "2026-08-25",
    checkedOutDate: null,
    status: "in_warehouse",
  },
  {
    id: "4",
    containerNumber: "HLXU-556781",
    customerName: "Twin Cities Produce Distributors & Cold Storage LLC",
    location: "Bay 11",
    receivedDate: "2026-07-30",
    checkedOutDate: null,
    status: "in_warehouse",
  },
  {
    id: "5",
    containerNumber: "CMAU-334455",
    customerName: "Iron Range Mining Supply",
    location: "Bay 09",
    receivedDate: "2026-08-28",
    checkedOutDate: "2026-09-01",
    status: "checked_out",
  },
  {
    id: "6",
    containerNumber: "OOLU-771234",
    customerName: "Northern Lakes Trucking",
    location: "Bay 03",
    receivedDate: "2026-08-22",
    checkedOutDate: null,
    status: "in_warehouse",
  },
  {
    id: "7",
    containerNumber: "TRHU-908213",
    customerName: "Superior Distribution Group",
    location: "Bay 06",
    receivedDate: "2026-08-10",
    checkedOutDate: "2026-08-19",
    status: "checked_out",
  },
  {
    id: "8",
    containerNumber: "FSCU-445566",
    customerName: "Mississippi River Logistics",
    location: "Bay 12",
    receivedDate: "2026-08-30",
    checkedOutDate: null,
    status: "in_warehouse",
  },
];

const FULL_INVENTORY_COUNT = 38;

export function getContainerInventoryPreview(
  searchText?: string,
): DashboardInventoryPreview {
  const trimmedSearch = searchText?.trim().toLowerCase();

  if (!trimmedSearch) {
    return {
      records: ALL_INVENTORY_RECORDS.slice(0, PREVIEW_SIZE),
      totalCount: FULL_INVENTORY_COUNT,
    };
  }

  const records = ALL_INVENTORY_RECORDS.filter(
    (record) =>
      record.containerNumber.toLowerCase().includes(trimmedSearch) ||
      record.customerName.toLowerCase().includes(trimmedSearch),
  );

  return { records, totalCount: FULL_INVENTORY_COUNT };
}

/** Edge-case variant: no containers at all, for validating the inventory empty state. */
export function getEmptyContainerInventoryPreview(): DashboardInventoryPreview {
  return { records: [], totalCount: 0 };
}
