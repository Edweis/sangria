import type { Asserts, BaseSchema } from 'yup';
import { object as yupObject } from 'yup';
import {
  ObjectShape,
  RequiredObjectSchema,
  TypeOfShape,
} from 'yup/lib/object.js';
import { Middleware } from './core.js';

const parse = (body: Record<string, unknown> | string | null) => {
  let json;

  if (body == null) json = {};
  else if (typeof body === 'object') json = body;
  else json = JSON.parse(body || '{}');

  return json;
};
const parseBodyAsync = async <T extends BaseSchema>(
  body: Record<string, unknown> | string | null,
  schema: T,
  strict = false,
) => {
  const config = strict ? { strict: true } : undefined;
  const json = parse(body);

  return schema.validate(json, config) as Promise<Asserts<T>>;
};

/** Parse a Yup Shape into its yup.object(...).required() type. */
type RequiredObj<TShape extends ObjectShape> = RequiredObjectSchema<
  TShape,
  Record<string, any>,
  TypeOfShape<TShape>
>;

type Replace<Obj, Key extends keyof Obj, Value> = Omit<Obj, Key> &
  Record<Key, Value>;

export const ParserMid = <
  T extends ObjectShape,
  K extends keyof Parent,
  Parent,
  ParentOutput,
>(
  key: K,
  schemaObj: T,
): Middleware<
  Parent,
  Replace<Parent, K, Asserts<RequiredObj<T>>>,
  ParentOutput,
  ParentOutput
> => ({
  before: async (event) => {
    const schema = yupObject(schemaObj).required();
    const rawValue = event[key] as unknown as string; // FLAW: we assume that the value is a string
    const parsed = await parseBodyAsync(rawValue || '', schema);
    const newEvent: Replace<Parent, typeof key, Asserts<typeof schema>> = {
      ...event,
      [key]: parsed,
    };

    return newEvent;
  },
  after: async (value) => value,
});
