import { getTestLobby, createNewFeed, loadExistingFeed } from "./network";

localStorage.debug = "hypercore-protocol network-feed";

const url = new URL(window.location.href);
const role = url.searchParams.get("role");
const lobbyId = url.searchParams.get("lobby") || undefined;

(lobbyId
  ? loadExistingFeed(lobbyId, false)
  : role
  ? getTestLobby(role === "server")
  : createNewFeed()
).then((f) => {
  (window as any).f = f;
  !lobbyId &&
    !role &&
    window.open(window.location.href + `?lobby=${f.lobbyId}`);
});
