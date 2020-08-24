import { User } from "../../protocol/schema";
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { LobbyClient, LobbyServer, LobbyOpts } from "./lobbyManager";
import { SavedLobby } from "../../background/store";
import { RemoteBackgroundEndpoint } from "../containers/BackgroundEndpointProvider";

interface LocalState {
  id: string;
  isServer: boolean;
  name?: string;
  error?: string;
  onlineUsers: string[];
  joinRequests: User[];
}

export const createLobby = createAsyncThunk<
  { lobby: LobbyServer | LobbyClient; saveState: SavedLobby },
  LobbyOpts | SavedLobby,
  { state: any; extra: RemoteBackgroundEndpoint }
>("lobby/createLobby", async (opts, store) => {
  let lobby;

  if (opts.isServer) {
    lobby = new LobbyServer(store.extra, store, opts as any);
  } else {
    lobby = new LobbyClient(store.extra, store, opts as any);
  }
  await lobby.init();
  if (!store.getState().user) {
    lobby.destroy();
    throw new Error("User logged out!");
  }
  const ret: SavedLobby = {
    id: lobby.id,
    identity: lobby.identity,
    isServer: lobby instanceof LobbyServer,
    name: "name" in opts ? opts.name : undefined,
  };

  store.dispatch(joinLobby(ret));
  await lobby.connect();
  return { lobby, saveState: ret };
});

const localState = createSlice({
  name: "localState",
  initialState: null as LocalState | null,
  reducers: {
    joinLobby: (
      state,
      action: PayloadAction<{
        id: string;
        isServer: boolean;
        name?: string;
      }>
    ) => ({
      id: action.payload.id,
      isServer: action.payload.isServer,
      name: action.payload.name,
      onlineUsers: [],
      joinRequests: [],
    }),
    userConnected: (state, action: PayloadAction<string>) => {
      state?.onlineUsers.push(action.payload);
    },
    userDisconnected: (state, action: PayloadAction<string>) => {
      state?.onlineUsers.filter((u) => u !== action.payload);
    },
    leaveLobby: () => null,
  },
  extraReducers: (builder) =>
    builder.addCase(createLobby.rejected, (state, action) => {
      state && (state.error = action.error.message);
    }),
});

export const {
  joinLobby,
  userConnected,
  userDisconnected,
  leaveLobby,
} = localState.actions;

export default localState.reducer;
