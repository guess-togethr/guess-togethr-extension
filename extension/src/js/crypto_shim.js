module.exports = {
  getRandomBytes: (b) =>
    Buffer.from(window.crypto.getRandomValues(new Uint8Array(b)).buffer),
};
