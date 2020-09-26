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
declare module "@geut/discovery-swarm-webrtc";
declare module "redux-persist-webextension-storage";
declare module "!schema-loader!*";
declare module "*.svg";
declare module "*.html";
