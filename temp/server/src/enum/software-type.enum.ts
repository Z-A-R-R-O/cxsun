export enum SoftwareType {
  Garments = "100",
  GarmentsEcommerce = "200",
  OffsetPrinting = "300",
  Upvc = "400",
  Computer = "500",
  ComputerEcommerce = "600",
  AuditorOffice = "700",
}

export const softwareTypeOptions = [
  {
    value: SoftwareType.Garments,
    label: "100 - Garments",
    description: "Garments industry billing surface with colour and size sales fields.",
  },
  {
    value: SoftwareType.GarmentsEcommerce,
    label: "200 - Garments - Ecommerce",
    description: "Garments ecommerce surface with colour and size sales fields.",
  },
  {
    value: SoftwareType.OffsetPrinting,
    label: "300 - Offset Printing",
    description: "Offset Printing industry billing surface with PO and DC sales fields.",
  },
  {
    value: SoftwareType.Upvc,
    label: "400 - Upvc",
    description: "UPVC industry billing surface with area based sales fields.",
  },
  {
    value: SoftwareType.Computer,
    label: "500 - Computer",
    description: "Computer industry billing surface for standard commerce flows.",
  },
  {
    value: SoftwareType.ComputerEcommerce,
    label: "600 - Computer - Ecommerce",
    description: "Computer ecommerce industry billing surface for commerce flows.",
  },
  {
    value: SoftwareType.AuditorOffice,
    label: "700 - Auditor office",
    description: "Auditor office industry surface for service workflows.",
  },
] as const;
