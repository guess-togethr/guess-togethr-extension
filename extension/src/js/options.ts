import { createNetworkFeed } from "./network";

const lobbyId =
  new URL(window.location.href).searchParams.get("lobby") || undefined;

createNetworkFeed(lobbyId).then((f) => {
  window.f = f;
  !lobbyId && window.open(window.location.href + `?lobby=${f.lobbyId}`);
});
