import Ajv, { JTDDataType, JTDSchemaType } from 'ajv/dist/jtd';

const ajv = new Ajv();
const ajvResolver = <T>(schema: JTDSchemaType<T>) => {
  const parse = ajv.compileParser(schema);
  return async (data: any) => {
    const parsedData = parse(data);
    if (parsedData == null) throw parse.message;
    return parsedData as JTDDataType<T>;
  };
};

export default ajvResolver;
