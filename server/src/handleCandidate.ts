import PubSub from "pubsub-js";
import CandidateSignal from "./CandidateSignal";
import { CustomWebSocket } from "./handleSignal";

interface CandidatePayloadToServer {
  type: "candidate";
  id: string;
  candidate: object | null;
}

const handleCandidate = (
  ws: CustomWebSocket,
  payload: CandidatePayloadToServer
) => {
  const { candidate, id } = payload;
  const { context } = ws;
  // if (!candidate) return
  const to = context.connectedPeers[id];
  if (to) {
    // the receiver is known
    PubSub.publish(`signal/user/${to}`, {
      type: "pubToClient",
      payload: { type: "candidate", id, candidate },
    });
    return;
  }
  const existingChunk = context.pushQueue.find(
    (connectionChunk) => connectionChunk.id === id
  );
  if (existingChunk) {
    existingChunk.signals.push(new CandidateSignal(candidate));
  }
};

export default handleCandidate;
