import WebSocket from "ws";

const sendSignal = (socket: WebSocket, signal: object) => {
  if (socket.readyState !== WebSocket.OPEN) return;
  console.log(signal);
  socket.send(JSON.stringify(signal));
};

export default sendSignal;
