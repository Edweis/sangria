import type { Asserts, BaseSchema } from 'yup';

const safeParse = (body: Record<string, unknown> | string | undefined) => {
  if (body == null) return {};
  if (typeof body === 'object') return body;
  return JSON.parse(body);
};
export const yupResolver =
  <T extends BaseSchema>(schema: T) =>
  (data: any) => {
    const json = safeParse(data);
    return schema.validateSync(json) as Asserts<T>;
  };
