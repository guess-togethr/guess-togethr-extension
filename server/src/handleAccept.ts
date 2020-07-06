import { SwarmAccept } from "@mattkrick/fast-rtc-swarm";
import { CustomWebSocket } from "./handleSignal";
import sendSignal from "./sendSignal";

const handleAccept = (ws: CustomWebSocket, payload: SwarmAccept) => {
  ws.context.connectedPeers[payload.id] = payload.userId;
  sendSignal(ws, payload);
};

export default handleAccept;
