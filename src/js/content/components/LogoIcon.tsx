import React from "react";
import { ListItemIcon, SvgIcon, makeStyles } from "@material-ui/core";
import Logo from "../logo.svg";

const useStyles = makeStyles({
  "@global": {
    "*": {
      "--stop-color-1": "#ffffff",
      "--stop-color-2": "#ffffff",
    },
  },
});

const LogoIcon: React.FunctionComponent = () => {
  useStyles();
  return (
    <ListItemIcon>
      <SvgIcon>
        <Logo />
      </SvgIcon>
    </ListItemIcon>
  );
};

export default LogoIcon;
