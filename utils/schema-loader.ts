import * as ts from "typescript";
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
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.CommonJS,
    allowUnusedLabels: true,
  };
  // const host = ts.createCompilerHost(options);
  // function shim(f: (this: any, ...args: any[]) => any) {
  //   return (...args: [string, ...any[]]) => {
  //     if (args[0] === "DUMMY.ts") {
  //       const sourceFile = ts.createSourceFile(args[0], source, options.target);
  //       return sourceFile;
  //     }
  //     return f(...args);
  //   };
  // }

  // host.getSourceFile = shim(host.getSourceFile.bind(host));
  // host.getSourceFileByPath =
  //   host.getSourceFileByPath && shim(host.getSourceFileByPath.bind(host));
  // const program = ts.createProgram(["DUMMY"], {}, host);
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
