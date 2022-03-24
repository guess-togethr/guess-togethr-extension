import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
  Action,
} from "@reduxjs/toolkit";
import type { XOR } from "../../utils";
import type { BackgroundRootState } from ".";

// export interface FullSavedLobby {
//   id: string;
//   // identity: { publicKey: string; privateKey: string };
//   isServer: boolean;
//   user?: string;
//   name?: string;
//   tabId?: number;
// }
export type FullSavedLobby = { id: string; tabId?: number } & XOR<
  { isServer: true; user: string; name: string },
  { isServer: false; user?: string; name?: string }
>;
export interface ErroredLobby {
  id: string;
  error: string;
  tabId: number;
}
export type SavedLobby = XOR<FullSavedLobby, ErroredLobby>;

export function isFullLobby(lobby?: SavedLobby): lobby is FullSavedLobby {
  return !!lobby && "isServer" in lobby;
}
export function isErroredLobby(lobby?: SavedLobby): lobby is ErroredLobby {
  return !!lobby && "error" in lobby;
}

const savedLobbyAdapter = createEntityAdapter<SavedLobby>();
const savedLobbySelectors = savedLobbyAdapter.getSelectors<BackgroundRootState>(
  (state) => state.allLobbies
);
const savedLobbyLocalSelector = savedLobbyAdapter.getSelectors();

const savedLobbies = createSlice({
  name: "savedLobbies",
  initialState: savedLobbyAdapter.getInitialState(),
  reducers: {
    saveLobby: savedLobbyAdapter.addOne,
    removeSavedLobby: savedLobbyAdapter.removeOne,
    claimSavedLobby: (state, action: PayloadAction<string>) => {
      const allLobbies = savedLobbyLocalSelector.selectAll(state);
      const existingClaimedLobby = allLobbies.find(
        (lobby) => lobby.tabId === (action as any).meta.tabId
      );

      // If this tab previously claimed a lobby, either release it if it was a
      // normal lobby or delete it if it was an errored lobby
      if (existingClaimedLobby && existingClaimedLobby.id !== action.payload) {
        if (!isFullLobby(existingClaimedLobby)) {
          savedLobbyAdapter.removeOne(state, existingClaimedLobby.id);
        } else {
          delete existingClaimedLobby.tabId;
        }
      }

      savedLobbyAdapter.updateOne(state, {
        id: action.payload,
        changes: { tabId: (action as any).meta.tabId },
      });

      // Move the lobby to the top of the list
      const allLobbyIds = savedLobbyLocalSelector.selectIds(state);
      const newClaimedLobbyIndex = allLobbyIds.indexOf(action.payload);
      if (newClaimedLobbyIndex > 0) {
        allLobbyIds.unshift(...allLobbyIds.splice(newClaimedLobbyIndex, 1));
      }
    },
    releaseSavedLobby: (state, action: Action) => {
      const existingLobby = savedLobbyLocalSelector
        .selectAll(state)
        .find((lobby) => lobby.tabId === (action as any).meta.tabId);
      if (existingLobby) {
        if (!isFullLobby(existingLobby)) {
          savedLobbyAdapter.removeOne(state, existingLobby.id);
        } else {
          delete existingLobby.tabId;
        }
      }
    },
    updateSavedLobby: savedLobbyAdapter.updateOne,
  },
});

export const {
  saveLobby,
  removeSavedLobby,
  // setMostRecentSavedLobby,
  claimSavedLobby,
  releaseSavedLobby,
  updateSavedLobby,
} = savedLobbies.actions;
export { savedLobbySelectors, savedLobbyLocalSelector, savedLobbyAdapter };
export default savedLobbies.reducer;
