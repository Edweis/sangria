import type { BeforeMiddleware } from '@pantone/sangria';
import * as yup from 'yup';

type Replace<Object_, Key extends keyof Object_, Value> = Omit<Object_, Key> &
  Record<Key, Value>;

const parseJson = <Parent, ParentOutput, K extends keyof Parent, T>(
  key: K,
  resolver: (data: any) => Promise<T>,
): BeforeMiddleware<Parent, Replace<Parent, K, T>, ParentOutput> => ({
  async before(event) {
    const parsed = await resolver(event[key]);
    return { ...event, [key]: parsed };
  },
});

export default parseJson;
