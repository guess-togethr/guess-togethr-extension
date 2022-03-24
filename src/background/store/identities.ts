import {
  createEntityAdapter,
  createNextState,
  createSlice,
} from "@reduxjs/toolkit";
import type { BackgroundRootState } from ".";
import type { Identity } from "../../content/lobbyManager";

interface IdentityEntity extends Identity {
  id: string;
}

const identityAdapter = createEntityAdapter<IdentityEntity>();

const unsafeIdentitySelectors = identityAdapter.getSelectors(
  (state: BackgroundRootState) => state.identities
);
const identitySelectors = createEntityAdapter<
  Omit<IdentityEntity, "privateKey">
>().getSelectors((state: BackgroundRootState) =>
  createNextState(state.identities, (draft) => {
    Object.values(draft.entities).forEach((v) => delete (v as any)?.privateKey);
  })
);

const identities = createSlice({
  name: "identities",
  initialState: identityAdapter.getInitialState(),
  reducers: {
    addIdentity: identityAdapter.addOne,
  },
});

export { unsafeIdentitySelectors, identitySelectors };
export const { addIdentity } = identities.actions;

export default identities.reducer;
