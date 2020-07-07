declare module "hypercore";

declare module "duplexify" {
  declare class Duplexify implements NodeJS.ReadWriteStream {
    constructor(
      readStream: NodeJS.ReadableStream,
      writeStream: NodeJS.WritableStream,
      options?: any
    );
  }
  export default Duplexify;
}

declare module "random-access-memory";
declare module "random-access-idb";
