import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
} from "@reduxjs/toolkit";

interface Lobby {
  id: string;
  name: string;
  isOwner: boolean;
  identity: { publicKey: string; privateKey: string };
}

const lobbyAdapter = createEntityAdapter<Lobby>();
const lobbySelector = lobbyAdapter.getSelectors();

const allLobbies = createSlice({
  name: "all-lobbies",
  initialState: lobbyAdapter.getInitialState(),
  reducers: {
    addLobby: lobbyAdapter.addOne,
    removeLobby: lobbyAdapter.removeOne,
    setMostRecent: (state, action: PayloadAction<string>) => {
      const all = lobbyAdapter.getSelectors().selectAll(state);
      const target = all.findIndex((e) => e.id === action.payload);
      if (target > 0) {
        all.splice(0, 0, ...all.splice(target, 1));
        lobbyAdapter.setAll(state, all);
      }
    },
  },
});

export const { addLobby, removeLobby, setMostRecent } = allLobbies.actions;
export { lobbySelector };
export default allLobbies.reducer;
