import { commonDefinition, defaultRow, rowsWithDefault } from "./common-master-definitions";
import { createCommonMasterSeeder } from "./common-master-seeder";

export const othersCommonSeeders = [
  createCommonMasterSeeder(
    commonDefinition("currencies"),
    90,
    rowsWithDefault([{ code: "INR", name: "Indian Rupee", symbol: "INR", decimal_places: 2 }], {
      symbol: "-",
      decimal_places: 0,
    }),
  ),
  createCommonMasterSeeder(commonDefinition("paymentTerms"), 91, [
    defaultRow({ due_days: 0 }),
    { code: "NET30", name: "Net 30", description: "Payment due in 30 days", due_days: 30 },
  ]),
  createCommonMasterSeeder(commonDefinition("months"), 92, buildMonthRows(2026)),
] as const;

function buildMonthRows(year: number) {
  return Array.from({ length: 12 }, (_, monthIndex) => {
    const date = new Date(Date.UTC(year, monthIndex, 1));
    const monthName = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(
      date,
    );
    return {
      code: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
      name: `${monthName} -${year}`,
      start_date: `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`,
      end_date: `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(
        new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate(),
      ).padStart(2, "0")}`,
      description: `${monthName} ${year} GST period`,
    };
  });
}
