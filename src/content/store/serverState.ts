import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ServerState } from "../../protocol/schema";
import { leaveLobby } from "./localState";

const serverState = createSlice({
  name: "serverState",
  initialState: null as ServerState | null,
  reducers: {
    setServerState: (state, action: PayloadAction<ServerState>) =>
      action.payload,
    setNewChallenge: (
      state,
      action: PayloadAction<{ id: string; timeLimit: number }>
    ) => {
      state &&
        (state.currentChallenge = {
          ...action.payload,
          round: 1,
          participants: [],
        });
    },
  },
  extraReducers: (builder) => builder.addCase(leaveLobby, () => null),
});

export const { setServerState, setNewChallenge } = serverState.actions;
export default serverState.reducer;
