import {
  createSlice,
  PayloadAction,
  createAsyncThunk,
  createSelector,
  EntityState,
  createEntityAdapter,
} from "@reduxjs/toolkit";
import { RootState } from ".";
import { leaveLobby } from "./localState";

interface GeoguessrUser {
  id: string;
  name: string;
  isPro: boolean;
  avatar?: string;
}

interface GeoguessrState {
  url: string;
  currentUser: GeoguessrUser | false | null;
  userQueryCache: EntityState<GeoguessrUser | { id: string }>;
}

const userCacheAdapter = createEntityAdapter<GeoguessrUser | { id: string }>();

export const userCacheSelectors = userCacheAdapter.getSelectors(
  (state: RootState) => state.geoguessr.userQueryCache
);

const parseUserResponse = (json: any) => ({
  id: json.id,
  name: json.nick,
  isPro: json.isProUser,
  avatar: json.pin?.url || undefined,
});

export const checkCurrentUser = createAsyncThunk(
  "geoguessr/setUser",
  async (_, { dispatch }) => {
    const response = await fetch("/api/v3/profiles/");
    if (response.ok) {
      const { user } = await response.json();
      return parseUserResponse(user);
    }

    dispatch(leaveLobby());
    return false;
  }
);

export const queryUsers = createAsyncThunk(
  "geoguessr/queryUsers",
  async (ids: string[]) => {
    return (
      await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(`/api/v3/users/${id}`);
          if (response.ok) {
            const body = await response.json();
            return parseUserResponse(body);
          }
          return false;
        })
      )
    ).filter(Boolean) as GeoguessrUser[];
  }
);

const geoguessrSlice = createSlice({
  name: "geoguessr",
  initialState: {
    url: window.location.href,
    currentUser: null,
    userQueryCache: userCacheAdapter.getInitialState(),
  } as GeoguessrState,
  reducers: {
    setUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(checkCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
      })
      .addCase(queryUsers.pending, (state, action) => {
        userCacheAdapter.addMany(
          state.userQueryCache,
          action.meta.arg.map((id) => ({ id }))
        );
      })
      .addCase(queryUsers.fulfilled, (state, action) => {
        userCacheAdapter.upsertMany(state.userQueryCache, action.payload);
      }),
});

export const selectUser = createSelector(
  (state: RootState) => state.geoguessr,
  (state) => state.currentUser
);

export const selectUrl = createSelector(
  (state: RootState) => state.geoguessr,
  (state) => state.url
);

export const { setUrl } = geoguessrSlice.actions;
export default geoguessrSlice.reducer;
