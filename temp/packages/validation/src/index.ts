import { z } from "zod";

export { z };

export type InferSchema<TSchema extends z.ZodTypeAny> = z.infer<TSchema>;

export const idSchema = z.string().min(1);
export const isoDateSchema = z.string().datetime();

export function composeSchemas<TBase extends z.ZodObject, TExtension extends z.ZodObject>(
  base: TBase,
  extension: TExtension,
) {
  return base.merge(extension);
}
