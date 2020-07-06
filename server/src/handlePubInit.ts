import PubSub from "pubsub-js";
import { CustomWebSocket } from "./handleSignal";
import sendChunk from "./sendChunk";
import sendSignal from "./sendSignal";

export interface PubInitPayload {
  type: "pubInit";
  createdAt: number;
  userId: string;
}

const handlePubInit = (ws: CustomWebSocket, payload: PubInitPayload) => {
  const { context } = ws;
  const { userId, createdAt } = payload;
  if (userId === context.userId) {
    if (context.createdAt < createdAt) {
      // the publishing websocket used an id that was already taken, kick em out
      PubSub.publish(`signal/user/${userId}`, {
        type: "pubKickOut",
        createdAt,
      });
    }
    return;
  }
  const connectionChunk = context.pushQueue.pop();
  if (!connectionChunk) {
    context.pullQueue.push(userId);
  } else {
    sendChunk(ws, connectionChunk, userId);
  }
  // for every successful init, resupply the offer buffer
  sendSignal(ws, { type: "offerRequest" });
};

export default handlePubInit;
