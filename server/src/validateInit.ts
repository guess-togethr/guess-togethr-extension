import closeWRTC from "./closeWRTC";
import { CustomWebSocket } from "./handleSignal";
import sendSignal from "./sendSignal";
import WebSocketContext from "./WebSocketContext";

const validateInit = (
  ws: CustomWebSocket,
  payload: { type: string; [key: string]: any }
) => {
  if (payload.type === "init") {
    if (ws.context) {
      closeWRTC(ws);
    }
    ws.context = new WebSocketContext(payload.roomId);
  } else if (!ws.context) {
    sendSignal(ws, {
      type: "signal_error",
      message: "Payload sent before init",
    });
    return false;
  }
  return true;
};

export default validateInit;
