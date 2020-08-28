import {
  createSlice,
  PayloadAction,
  createAsyncThunk,
  Middleware,
  createSelector,
} from "@reduxjs/toolkit";
import { RootState } from ".";
import { RemoteBackgroundEndpoint } from "../containers/BackgroundEndpointProvider";
import { leaveLobby } from "./localState";

interface GeoguessrUser {
  id: string;
  isPro: boolean;
}

interface GeoguessrState {
  url: string;
  user: GeoguessrUser | false | null;
}

const geoguessrSlice = createSlice({
  name: "geoguessr",
  initialState: { url: window.location.href, user: null } as GeoguessrState,
  reducers: {
    setUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
    },
  },
  extraReducers: (builder) =>
    builder.addCase(checkUser.fulfilled, (state, action) => {
      state.user = action.payload;
    }),
});

const checkUser = createAsyncThunk(
  "geoguessr/setUser",
  async (_, { dispatch }) => {
    const response = await fetch("/api/v3/profiles/");
    if (response.ok) {
      const { user } = await response.json();
      return { id: user.id, isPro: user.isPro };
    }

    dispatch(leaveLobby());
    return false;
  }
);

export const getGeoguessrMiddleware: (
  backgroundEndpoint: RemoteBackgroundEndpoint
) => Middleware<{}, RootState, any> = (backgroundEndpoint) => (store) => {
  backgroundEndpoint.onUrlChange((url) => store.dispatch(setUrl(url)));
  return (next) => (action) => {
    if (
      setUrl.match(action) &&
      store.getState().geoguessr.url !== action.payload
    ) {
      store.dispatch(checkUser());
    }
    return next(action);
  };
};

export const selectUser = createSelector(
  (state: RootState) => state.geoguessr,
  (state) => state.user
);

export const selectUrl = createSelector(
  (state: RootState) => state.geoguessr,
  (state) => state.url
);

export const { setUrl } = geoguessrSlice.actions;
export default geoguessrSlice.reducer;
