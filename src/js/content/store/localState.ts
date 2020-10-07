import { User } from "../../protocol/schema";
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { LobbyClient, LobbyServer, LobbyOpts, Identity } from "../lobbyManager";
import type { FullSavedLobby } from "../../background/store";
import type { RemoteBackgroundEndpoint } from "../containers/BackgroundEndpointProvider";
import { RootState } from ".";
import { selectUser } from "./geoguessrState";

interface LocalState {
  id: string;
  isServer: boolean;
  error?: string;
  onlineUsers: string[];
  joinRequests: User[];
}

export interface BreakCycleRootState extends RootState {}

export const createLobby = createAsyncThunk<
  { lobby: LobbyServer | LobbyClient; saveState: FullSavedLobby },
  LobbyOpts | FullSavedLobby,
  { state: BreakCycleRootState; extra: RemoteBackgroundEndpoint }
>("lobby/createLobby", async (opts, store) => {
  let lobby;

  if (opts.isServer) {
    lobby = new LobbyServer(opts.name!, store.extra, store, opts as any);
  } else {
    lobby = new LobbyClient(store.extra, store, opts as any);
  }
  await lobby.init();
  const user = selectUser(store.getState());
  if (!user) {
    lobby.destroy();
    throw new Error("User logged out!");
  }
  const ret = {
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
        identity: Identity;
        user: string;
      }>
    ) => ({
      id: action.payload.id,
      isServer: action.payload.isServer,
      onlineUsers: [action.payload.identity.publicKey],
      joinRequests: [],
    }),
    userConnected: (state, action: PayloadAction<string>) => {
      if (!state?.onlineUsers.includes(action.payload)) {
        state?.onlineUsers.push(action.payload);
      }
    },
    userDisconnected: (state, action: PayloadAction<string>) => {
      if (state?.onlineUsers) {
        state.onlineUsers = state.onlineUsers.filter(
          (u) => u !== action.payload
        );
      }
    },
    errorLobby: (state, action: PayloadAction<string>) => {
      state && (state.error = action.payload);
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
  errorLobby,
} = localState.actions;

export default localState.reducer;
