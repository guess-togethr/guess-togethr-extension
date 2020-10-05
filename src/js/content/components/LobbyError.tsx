import React from "react";
import { ListItem } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

interface LobbyErrorProps {
  message: string;
}

const useStyles = makeStyles({
  root: {
    color: "#cc302e",
    fontWeight: 700,
  },
});

const LobbyError: React.FunctionComponent<LobbyErrorProps> = ({ message }) => {
  const classes = useStyles();
  return <ListItem className={classes.root}>{message}</ListItem>;
};

export default LobbyError;
