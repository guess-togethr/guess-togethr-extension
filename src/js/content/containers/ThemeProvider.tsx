import React, { useMemo } from "react";
import ScopedCssBaseline from "@material-ui/core/ScopedCssBaseline";
import {
  ThemeProvider as MuiThemeProvider,
  createMuiTheme,
} from "@material-ui/core";

interface ThemeProviderProps {
  type: "light" | "dark";
}

const ThemeProvider: React.FunctionComponent<ThemeProviderProps> = ({
  type,
  children,
}: any) => {
  const theme = useMemo(
    () =>
      createMuiTheme({
        palette: { type },
        typography: {
          fontFamily: "Open Sans, helvetica",
          h6: {
            fontFamily: "Roboto Slab, serif",
            fontSize: 18,
            fontWeight: 700,
          },
        },
      }),
    [type]
  );
  return (
    <MuiThemeProvider theme={theme}>
      <ScopedCssBaseline>{children}</ScopedCssBaseline>
    </MuiThemeProvider>
  );
};

export default ThemeProvider;
