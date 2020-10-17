declare module "hypercore";

// declare module "duplexify" {
//   class Duplexify implements NodeJS.ReadWriteStream {
//     constructor(
//       readStream: NodeJS.ReadableStream,
//       writeStream: NodeJS.WritableStream,
//       options?: any
//     );
//   }
//   export default Duplexify;
// }

declare module "random-access-memory";
declare module "random-access-idb";
declare module "@geut/discovery-swarm-webrtc*";
declare module "redux-persist-webextension-storage";
declare module "!schema-loader!*";
declare module "*.svg";
declare module "*.html";
declare module "promise-defer" {
  interface Deferred<T, E> {
    resolve(arg?: T): void;
    reject(arg?: E): void;
    promise: PromiseLike<T>;
  }
  const defer: <T, E = void>() => Deferred<T, E>;
  export default defe;
}
