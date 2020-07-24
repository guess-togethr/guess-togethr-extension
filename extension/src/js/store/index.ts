import {
  configureStore,
  combineReducers,
  getDefaultMiddleware,
} from "@reduxjs/toolkit";
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
  user,
});

export type RootState = ReturnType<typeof reducer>;

const store = configureStore({
  reducer,
});

export { store };
