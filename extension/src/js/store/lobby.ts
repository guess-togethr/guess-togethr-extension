import {
  createSlice,
  PayloadAction,
  combineReducers,
  createAsyncThunk,
  Middleware,
} from "@reduxjs/toolkit";
import { Patch, applyPatches } from "immer";
import { LobbyState } from "../protocol/schema";
import { trackPatches } from "../utils";
import reduceReducers from "reduce-reducers";
import { LobbyClient, LobbyServer } from "../content/lobby";
import { SavedLobby } from "./backgroundStore";
import { RemoteBackgroundEndpoint } from "../content/content";

interface Member {
  id: string;
  ggId: string;
}

interface CurrentLobby {
  id: string;
  isServer: boolean;
  sharedState: LobbyState | null;
}

const sharedState = createSlice({
  name: "sharedState",
  initialState: null as LobbyState | null,
  reducers: {
    applySharedStatePatches: (state, action: PayloadAction<Patch[]>) => {
      state && applyPatches(state, action.payload);
    },
    setInitialSharedState: (state, action: PayloadAction<LobbyState>) =>
      action.payload,
    createLobby: (
      state,
      action: PayloadAction<{
        lobbyId: string;
        ownerPublicKey: string;
        ownerGGId: string;
        name: string;
      }>
    ) => {
      return {
        ownerPublicKey: action.payload.ownerPublicKey,
        name: action.payload.name,
        users: [
          {
            publicKey: action.payload.ownerPublicKey,
            ggId: action.payload.ownerGGId,
          },
        ],
      };
    },
    addUser: (
      state,
      action: PayloadAction<{ publicKey: string; ggId: string }>
    ) => {
      state &&
        state.users.findIndex(
          ({ publicKey }) => publicKey === action.payload.publicKey
        ) === -1 &&
        state.users.push(action.payload);
    },
  },
});

const lobby = createSlice({
  name: "lobby",
  initialState: null as CurrentLobby | null,
  reducers: {},
  extraReducers: (builder) =>
    builder.addCase(sharedState.actions.createLobby, (state, action) => {
      return (
        state || {
          id: action.payload.lobbyId,
          isServer: true,
          sharedState: null,
        }
      );
    }),
});

const [sharedStateReducer, registerSharedStatePatchListener] = trackPatches(
  sharedState.reducer
);

const combinedSSReducer: typeof lobby["reducer"] = (state, action) =>
  state === null
    ? null
    : combineReducers({
        id: (s: any) => s,
        isServer: (s: any) => s,
        sharedState: sharedStateReducer,
      })(state, action);

const joinExistingLobby = createAsyncThunk<
  LobbyServer | LobbyClient,
  SavedLobby,
  { extra: RemoteBackgroundEndpoint }
>("lobby/joinExistingLobby", async (lobby, store) => {
  let ret;
  if (lobby.isServer) {
    ret = new LobbyServer(store.extra, store, lobby);
  } else {
    ret = new LobbyClient(store.extra, store, lobby);
  }

  await ret.init();
  return ret;
});

const createNewLobby = createAsyncThunk<
  LobbyServer | LobbyClient,
  string | undefined,
  { extra: RemoteBackgroundEndpoint }
>("lobby/createNewLobby", async (lobbyId, store) => {
  const ret = lobbyId
    ? new LobbyClient(store.extra, store, { id: lobbyId })
    : new LobbyServer(store.extra, store);
  await ret.init();
  return ret;
});

const lobbyMiddleware: Middleware = (store) => {
  let lobby: LobbyServer | LobbyClient | null = null;
  return (next) => (action) => {
    if (joinExistingLobby.fulfilled.match(action)) {
      lobby = action.payload;
    } else if (createNewLobby.fulfilled.match(action)) {
      lobby = action.payload;
      next(action);
      return {
        id: lobby.id,
        isServer: lobby instanceof LobbyServer,
        identity: lobby.identity,
      };
    }

    return next(action);
  };
};

const lobbyReducer = reduceReducers(lobby.reducer, combinedSSReducer);

export const {
  applySharedStatePatches,
  setInitialSharedState,
  createLobby,
  addUser,
} = sharedState.actions;

export {
  registerSharedStatePatchListener,
  joinExistingLobby,
  createNewLobby,
  lobbyMiddleware,
};

export default lobbyReducer;
