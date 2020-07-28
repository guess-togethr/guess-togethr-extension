import { User } from "../protocol/schema";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { createLobby } from "./lobby";

interface LocalState {
  id: string;
  isServer: boolean;
  name?: string;
  error?: string;
  onlineUsers: string[];
  joinRequests: User[];
}

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
