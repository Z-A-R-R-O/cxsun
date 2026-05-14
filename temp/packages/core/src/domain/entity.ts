export abstract class Entity<TId extends string = string> {
  protected constructor(public readonly id: TId) {}

  public equals(entity?: Entity<TId>): boolean {
    if (!entity) return false;
    return this.id === entity.id;
  }
}
