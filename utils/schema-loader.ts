import { ScriptTarget, ModuleKind } from "typescript";
import * as TJS from "typescript-json-schema";
import Ajv from "ajv";
import pack from "ajv-pack";
import { loader } from "webpack";

const loader: loader.Loader = function () {
  const ajv = new Ajv({ sourceCode: true });
  const settings: TJS.PartialArgs = {
    required: true,
    validationKeywords: ["if", "then", "else"],
    defaultNumberType: "integer",
    noExtraProps: true,
  };
  const options = {
    noEmit: true,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    target: ScriptTarget.ES5,
    module: ModuleKind.CommonJS,
    allowUnusedLabels: true,
  };
  const program = TJS.getProgramFromFiles([this.resourcePath], options);
  const generator = TJS.buildGenerator(program, settings);
  if (!generator) {
    throw new Error("typescript-json-schema failed");
  }
  const requires = new Map<string, string>();
  const schemas = generator
    .getSymbols()
    .filter(({ symbol }) =>
      symbol.getJsDocTags().find(({ name }) => name === "validate")
    )
    .map(({ name }) => ({
      name,
      source: pack(
        ajv as any,
        ajv.compile(generator.getSchemaForSymbol(name)) as any
      ),
    }))
    .map(({ name, source }) => {
      let schema = source;
      for (const match of source.matchAll(
        /var (\w+?) = require\((.+?)\);\n/g
      )) {
        if (requires.has(match[1]) && requires.get(match[1]) !== match[2]) {
          throw new Error("ajv-pack using conflicting imports");
        }
        requires.set(match[1], match[2]);
        schema = schema.replace(match[0], "");
      }
      return schema
        .replace(/validate/g, "validate" + name)
        .replace(/module\.exports = (\w+);/, "export { $1 };")
        .replace(/^.+?use strict.+?\n/, "");
    });

  return Array.from(requires.entries())
    .map(([importName, mod]) => `import ${importName} from ${mod};`)
    .concat(schemas)
    .join("\n");
};

export default loader;
