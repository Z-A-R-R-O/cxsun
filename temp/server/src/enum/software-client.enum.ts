export enum SoftwareClient {
  FullOption = "100",
}

export const softwareClientOptions = [
  {
    value: SoftwareClient.FullOption,
    label: "100 - Developer Edition",
    description: "Developer edition with all customise and feature options available.",
  },
] as const;
