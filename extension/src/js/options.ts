import { getTestLobby, createFeed } from "./network";

localStorage.debug = "hypercore-protocol network-feed";

const url = new URL(window.location.href);
const role = url.searchParams.get("role");
const lobbyId = url.searchParams.get("lobby") || undefined;

(role
  ? getTestLobby(role === "server")
  : lobbyId
  ? createFeed({ isServer: false, lobbyId })
  : createFeed({ isServer: true })
).then((f) => {
  (window as any).f = f;
  !lobbyId &&
    !role &&
    window.open(window.location.href + `?lobby=${f.lobbyId}`);
});
