import PubSub from "pubsub-js";
import { CustomWebSocket } from "./handleSignal";

interface AnswerPayload {
  type: "answer";
  sdp: string;
  id: string;
}

const handleAnswer = (ws: CustomWebSocket, payload: AnswerPayload) => {
  const to = ws.context.connectedPeers[payload.id];
  PubSub.publish(`signal/user/${to}`, {
    type: "pubToClient",
    payload,
  });
};

export default handleAnswer;
