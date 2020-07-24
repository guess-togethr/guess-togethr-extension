import { getTestLobby, createNetworkFeed } from "./network";

localStorage.debug = "hypercore-protocol network-feed";

const url = new URL(window.location.href);
const role = url.searchParams.get("role");
const lobbyId = url.searchParams.get("lobby") || undefined;

(role
  ? getTestLobby(role === "server")
  : lobbyId
  ? createNetworkFeed({ isServer: false, lobbyId })
  : createNetworkFeed({ isServer: true })
).then((f) => {
  (window as any).f = f;
  !lobbyId &&
    !role &&
    window.open(window.location.href + `?lobby=${f.lobbyId}`);
});
