import React from "react";
import { createMuiTheme, CssBaseline } from "@material-ui/core";
import ThemeProvider from "../containers/ThemeProvider";

export default ({ children }: any) => (
  <ThemeProvider type="dark">
    <>
      <CssBaseline />
      {children}
    </>
  </ThemeProvider>
);
