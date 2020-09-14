import { User } from "../../protocol/schema";
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { LobbyClient, LobbyServer, LobbyOpts, Identity } from "../lobbyManager";
import { SavedLobby } from "../../background/store";
import { RemoteBackgroundEndpoint } from "../containers/BackgroundEndpointProvider";
import { RootState } from ".";
import { selectUser } from "./geoguessrState";

interface LocalState {
  id: string;
  isServer: boolean;
  name?: string;
  error?: string;
  onlineUsers: string[];
  joinRequests: User[];
}

export interface BreakCycleRootState extends RootState {}

export const createLobby = createAsyncThunk<
  { lobby: LobbyServer | LobbyClient; saveState: SavedLobby },
  LobbyOpts | SavedLobby,
  { state: BreakCycleRootState; extra: RemoteBackgroundEndpoint }
>("lobby/createLobby", async (opts, store) => {
  let lobby;

  if (opts.isServer) {
    lobby = new LobbyServer(store.extra, store, opts as any);
  } else {
    lobby = new LobbyClient(store.extra, store, opts as any);
  }
  await lobby.init();
  const user = selectUser(store.getState());
  if (!user) {
    lobby.destroy();
    throw new Error("User logged out!");
  }
  const ret: SavedLobby = {
    id: lobby.id,
    user: user.id,
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
        identity: Identity;
      }>
    ) => ({
      id: action.payload.id,
      isServer: action.payload.isServer,
      name: action.payload.name,
      onlineUsers: [action.payload.identity.publicKey],
      joinRequests: [],
    }),
    userConnected: (state, action: PayloadAction<string>) => {
      state?.onlineUsers.push(action.payload);
    },
    userDisconnected: (state, action: PayloadAction<string>) => {
      if (state?.onlineUsers) {
        state.onlineUsers = state.onlineUsers.filter(
          (u) => u !== action.payload
        );
      }
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
