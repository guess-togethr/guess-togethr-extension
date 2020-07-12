import {
  configureStore,
  combineReducers,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
import allLobbies from "./allLobbies";
import user from "./user";
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { syncStorage } from "redux-persist-webextension-storage";

const reducer = combineReducers({
  allLobbies: persistReducer(
    { key: "ggt-lobbies", storage: syncStorage },
    allLobbies
  ),
  user,
});

export type RootState = ReturnType<typeof reducer>;

const store = configureStore({
  reducer: reducer,
  middleware: getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
    },
  }),
});

persistStore(store);

export { store };
