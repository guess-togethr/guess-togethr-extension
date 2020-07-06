import PubSub from "pubsub-js";
import { CustomWebSocket } from "./handleSignal";

const closeWRTC = (ws: CustomWebSocket) => {
  if (!ws.context) return;
  const { userId, roomId, iterators } = ws.context;
  iterators.forEach(PubSub.unsubscribe);
  // i wonder if setting length = 0 is a cause of the V8 mem leak?
  ws.context.iterators = [];
  if (userId) {
    PubSub.publish(`signal/room/${roomId}`, { type: "leaveSwarm", userId });
  }
  delete ws.context;
};

export default closeWRTC;
