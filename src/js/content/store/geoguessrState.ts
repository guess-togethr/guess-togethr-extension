import {
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
  createSlice,
  EntityState,
  Middleware,
  PayloadAction,
} from "@reduxjs/toolkit";
import { RootState, leaveLobby } from ".";

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
  redirect?: string;
}

const userCacheAdapter = createEntityAdapter<GeoguessrUser | { id: string }>();

export const userCacheSelectors = userCacheAdapter.getSelectors(
  (state: { geoguessr: GeoguessrState }) => state.geoguessr.userQueryCache
);

const parseUserResponse = (json: any) => ({
  id: json.id,
  name: json.nick,
  isPro: json.isProUser,
  avatar: json.pin?.url
    ? `/images/auto/48/48/ce/0/plain/${json.pin.url}`
    : undefined,
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

export const queryUsers = createAsyncThunk<
  GeoguessrUser[],
  string[],
  { state: { geoguessr: GeoguessrState } }
>(
  "geoguessr/queryUsers",
  async (ids, { getState }) =>
    (
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
    ).filter(Boolean) as GeoguessrUser[]
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
    redirect: (state, action: PayloadAction<string>) => {
      state.redirect = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder
      .addCase(checkCurrentUser.fulfilled, (state, action) => {
        state.currentUser = action.payload;
        action.payload &&
          userCacheAdapter.upsertOne(state.userQueryCache, action.payload);
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

export const geoguessrMiddleware: Middleware = (store) => (next) => (
  action
) => {
  if (redirect.match(action)) {
    next(action);
    if (window.location.href !== action.payload) {
      window.location.href = action.payload;
    }
    return;
  }
  // Swallow actions if we're redirecting
  if (!selectRedirect(store.getState())) return next(action);
};

export const selectUser = createSelector(
  (state: any) => state.geoguessr,
  (state) => state.currentUser as GeoguessrState["currentUser"]
);

export const selectUrl = createSelector(
  (state: RootState) => state.geoguessr,
  (state) => state.url
);

export const selectRedirect = (state: RootState) => state.geoguessr.redirect;

export const { setUrl, redirect } = geoguessrSlice.actions;
export default geoguessrSlice.reducer;
