import type {Asserts, BaseSchema} from 'yup';
import {object as yupObject} from 'yup';
import {
	type ObjectShape,
	type RequiredObjectSchema,
	type TypeOfShape,
} from 'yup/lib/object.js';
import {type Middleware} from './core.js';

const parse = (body: Record<string, unknown> | string | undefined) => {
	let json;

	if (body == null) {
		json = {};
	} else if (typeof body === 'object') {
		json = body;
	} else {
		json = JSON.parse(body || '{}');
	}

	return json;
};

const parseBodyAsync = async <T extends BaseSchema>(
	body: Record<string, unknown> | string | undefined,
	schema: T,
	strict = false,
) => {
	const config = strict ? {strict: true} : undefined;
	const json = parse(body);

	return schema.validate(json, config) as Promise<Asserts<T>>;
};

/** Parse a Yup Shape into its yup.object(...).required() type. */
type RequiredObject<TShape extends ObjectShape> = RequiredObjectSchema<
TShape,
Record<string, any>,
TypeOfShape<TShape>
>;

type Replace<Object_, Key extends keyof Object_, Value> = Omit<Object_, Key> &
Record<Key, Value>;

export const ParserMid = <
	T extends ObjectShape,
	K extends keyof Parent,
	Parent,
	ParentOutput,
>(
	key: K,
	schemaObject: T,
): Middleware<
Parent,
Replace<Parent, K, Asserts<RequiredObject<T>>>,
ParentOutput,
ParentOutput
> => ({
	async before(event) {
		const schema = yupObject(schemaObject).required();
		const rawValue = event[key] as unknown as string; // FLAW: we assume that the value is a string
		const parsed = await parseBodyAsync(rawValue || '', schema);
		const newEvent: Replace<Parent, typeof key, Asserts<typeof schema>> = {
			...event,
			[key]: parsed,
		};

		return newEvent;
	},
	after: async value => value,
});
