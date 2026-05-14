export abstract class ValueObject<TProps extends Record<string, unknown>> {
  protected constructor(protected readonly props: TProps) {
    Object.freeze(this.props);
  }

  public equals(valueObject?: ValueObject<TProps>): boolean {
    if (!valueObject) return false;
    return JSON.stringify(this.props) === JSON.stringify(valueObject.props);
  }

  public toJSON(): TProps {
    return { ...this.props };
  }
}
