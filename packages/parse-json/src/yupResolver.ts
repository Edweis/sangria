import { Asserts, BaseSchema, ValidationError } from 'yup';

const safeParse = (body: Record<string, unknown> | string | undefined) => {
  if (body == null) return {};
  if (typeof body === 'object') return body;
  return JSON.parse(body);
};
export const yupResolver =
  <T extends BaseSchema>(schema: T) =>
  async (data: any) => {
    const json = safeParse(data);
    try {
      return (await schema.validate(json)) as Asserts<T>;
    } catch (err: unknown) {
      if (err instanceof ValidationError) throw err.errors.join(','); // format error message
      throw err;
    }
  };
