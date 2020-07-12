import { NetworkFeed } from "./network";

class LobbyBase {
  constructor(protected readonly feed: NetworkFeed) {}

  public get id() {
    return this.feed.lobbyId;
  }
}

export class LobbyServer extends LobbyBase {}
