import {
  createSlice,
  PayloadAction,
  ActionCreator,
  ThunkAction,
} from "@reduxjs/toolkit";
import { SharedState } from "../../protocol/schema";
import { applyPatches, Patch } from "immer";
import { trackPatches } from "../../utils";
import { RootState } from ".";
import { queryUsers } from "./geoguessrState";

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

export const setInitialSharedState: ActionCreator<ThunkAction<
  void,
  RootState,
  any,
  PayloadAction<SharedState>
>> = (initialState: SharedState) => (dispatch) => {
  dispatch(sharedState.actions.setInitialSharedState(initialState));
  dispatch(queryUsers(initialState.users.map(({ ggId }) => ggId)));
};

export const { applySharedStatePatches } = sharedState.actions;
export default sharedStateReducer;
