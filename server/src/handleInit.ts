import PubSub from "pubsub-js";
import handleSignal, { CustomWebSocket } from "./handleSignal";

interface InitSignal {
  readonly type: "init";
  readonly userId: string;
  readonly roomId: string | number;
}

// make the closure context as small as possible. there will be dozens of these. DOZENS
const handleMessage = (ws: CustomWebSocket) => (_: string, data: any) => {
  handleSignal(ws, data);
};

const handleInit = (ws: CustomWebSocket, payload: InitSignal) => {
  const { userId, roomId } = payload;

  // exit if a duplicate init payload is sent or not authorized
  if (ws.context.userId) return;
  ws.context.userId = userId;
  PubSub.publish(`signal/room/${roomId}`, {
    type: "pubInit",
    userId,
    createdAt: ws.context.createdAt,
  });

  const channels = [`signal/room/${roomId}`, `signal/user/${userId}`];
  channels.forEach((c) =>
    ws.context.iterators.push(PubSub.subscribe(c, handleMessage(ws)))
  );
};

export default handleInit;
