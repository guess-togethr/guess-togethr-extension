import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from ".";

interface User {
  id: string;
  isPro: boolean;
}

const userSlice = createSlice({
  name: "user",
  initialState: null as User | null,
  reducers: {
    setUser: (_, action: PayloadAction<User | null>) => action.payload,
  },
});

export const { setUser } = userSlice.actions;
export const userSelector = (state: RootState) => state.user;
export default userSlice.reducer;
