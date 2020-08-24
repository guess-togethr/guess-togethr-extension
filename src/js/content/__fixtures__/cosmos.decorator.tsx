import React from "react";
import { ThemeProvider, createMuiTheme, CssBaseline } from "@material-ui/core";

const darkTheme = createMuiTheme({
  palette: { type: "dark" },
  typography: {
    fontFamily: "Open Sans, helvetica",
    h6: {
      fontFamily: "Roboto Slab, serif",
      fontSize: 18,
      fontWeight: 700,
    },
  },
});

export default ({ children }: any) => (
  <ThemeProvider theme={darkTheme}>
    <>
      <CssBaseline />
      {children}
    </>
  </ThemeProvider>
);
