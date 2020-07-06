import { Server } from "ws";
import handleInit from "./handleInit";
import handleSignal, { CustomWebSocket } from "./handleSignal";
import validateInit from "./validateInit";
import closeWRTC from "./closeWRTC";

const server = new Server({ port: 8080 });
server.on("connection", (ws) => {
  ws.on("message", (message: any) => {
    console.log(message);
    const payload = JSON.parse(message);
    if (validateInit(ws, payload)) {
      handleSignal(ws, payload);
    }
  });
  ws.on("close", closeWRTC);
});
