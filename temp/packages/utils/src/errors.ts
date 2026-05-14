export class CxnextError extends Error {
  public constructor(
    message: string,
    public readonly code: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
