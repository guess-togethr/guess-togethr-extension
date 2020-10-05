import { createSlice, createEntityAdapter } from "@reduxjs/toolkit";
import { ClientState } from "../../protocol/schema";
import { leaveLobby, joinLobby } from "./localState";
import { RootState } from ".";

const clientStateEntity = createEntityAdapter<ClientState>();
const clientStateSelectors = clientStateEntity.getSelectors(
  (state: RootState) => state.lobby.clientStates
);

const clientStates = createSlice({
  name: "clientStates",
  initialState: clientStateEntity.getInitialState(),
  reducers: {
    setClientState: clientStateEntity.upsertOne,
  },
  extraReducers: (builder) =>
    builder.addCase(leaveLobby, () => clientStateEntity.getInitialState()),
});

const localClientStateSelector = (state: RootState) =>
  state.lobby.localClientState;

const localClientState = createSlice({
  name: "localClientState",
  initialState: null as ClientState | null,
  reducers: {},
  extraReducers: (builder) =>
    builder
      .addCase(joinLobby, (state, { payload: { identity, user } }) => ({
        id: identity.publicKey,
        ggId: user,
      }))
      .addCase(leaveLobby, () => null),
});

export const { setClientState } = clientStates.actions;
const clientStatesReducer = clientStates.reducer;
const localClientStateReducer = localClientState.reducer;
export {
  clientStatesReducer as clientStates,
  localClientStateReducer as localClientState,
  clientStateSelectors,
  localClientStateSelector,
};
