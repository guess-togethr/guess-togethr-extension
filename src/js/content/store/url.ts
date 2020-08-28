import { Reducer, createAction } from "@reduxjs/toolkit";

export const setUrl = createAction<string>("setUrl");

const urlReducer: Reducer<string, typeof setUrl> = (state, action) => {
  if (!state) {
    return window.location.href;
  }
  if (setUrl.match(action)) {
    return action.payload;
  }
  return state;
};

export default urlReducer;
