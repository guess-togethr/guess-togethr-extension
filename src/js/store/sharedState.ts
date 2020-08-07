import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { LobbyState } from "../protocol/schema";
import { applyPatches, Patch } from "immer";
import { trackPatches } from "../utils";

const sharedState = createSlice({
  name: "sharedState",
  initialState: null as LobbyState | null,
  reducers: {
    applySharedStatePatches: (state, action: PayloadAction<Patch[]>) => {
      state && applyPatches(state, action.payload);
    },
    setInitialSharedState: (state, action: PayloadAction<LobbyState>) =>
      action.payload,
    // createNewLobby: (
    //   state,
    //   action: PayloadAction<{
    //     lobbyId: string;
    //     ownerPublicKey: string;
    //     ownerGGId: string;
    //     name: string;
    //   }>
    // ) => {
    //   return {
    //     ownerPublicKey: action.payload.ownerPublicKey,
    //     name: action.payload.name,
    //     users: [
    //       {
    //         publicKey: action.payload.ownerPublicKey,
    //         ggId: action.payload.ownerGGId,
    //       },
    //     ],
    //   };
    // },
    // addUser: (
    //   state,
    //   action: PayloadAction<{ publicKey: string; ggId: string }>
    // ) => {
    //   state &&
    //     state.users.findIndex(
    //       ({ publicKey, ggId }) =>
    //         publicKey === action.payload.publicKey ||
    //         ggId === action.payload.ggId
    //     ) === -1 &&
    //     state.users.push(action.payload);
    // },
  },
});

const [sharedStateReducer, trackSharedStatePatches] = trackPatches(
  sharedState.reducer
);

export { trackSharedStatePatches };

export const {
  setInitialSharedState,
  applySharedStatePatches,
} = sharedState.actions;
export default sharedStateReducer as typeof sharedState.reducer;
