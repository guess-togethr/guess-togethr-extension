import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SharedState } from "../../protocol/schema";
import { applyPatches, Patch } from "immer";
import { trackPatches } from "../../utils";

const sharedState = createSlice({
  name: "sharedState",
  initialState: null as SharedState | null,
  reducers: {
    applySharedStatePatches: (state, action: PayloadAction<Patch[]>) => {
      state && applyPatches(state, action.payload);
    },
    setInitialSharedState: (state, action: PayloadAction<SharedState>) =>
      action.payload,
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
export default sharedStateReducer;
