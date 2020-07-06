export function bufferToBase64(buffer) {
  var binary = "";
  var bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\//g, "_").replace(/\+/g, "-");
}

export function base64ToBuffer(base64) {
  return Uint8Array.from(
    atob(base64.replace(/\-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
}
