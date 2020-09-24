import React, { useMemo } from "react";
import {
  Container,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Typography,
  makeStyles,
  Button,
  ListSubheader,
  ListItemProps,
  ContainerProps,
} from "@material-ui/core";
import ThemeProvider from "../containers/ThemeProvider";
import Checkmark from "./Checkmark";
import { XOR } from "../../utils";
import clsx from "clsx";

const useStyles = makeStyles({
  paper: { padding: 8 },
  titleDiv: {
    margin: "8px 0",
  },
  infoDiv: {
    width: "100%",
    display: "flex",
    justifyContent: "space-around",
    margin: "16px 0",
  },
  infoSubdiv: {
    flex: 1,
    minWidth: 0,
    padding: "0 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  button: {
    backgroundColor: "#568209",
    color: "white",
    fontWeight: 700,
    "&:hover": {
      backgroundColor: "#70a80c",
    },
    "&.Mui-disabled": {
      backgroundColor: "transparent",
      color: "rgb(76, 175, 80)",
    },
  },
  readyButton: {
    margin: "0 16px 0 8px",
  },
  listSubheader: {
    textAlign: "end",
    lineHeight: "32px",
    backgroundColor: "white",
  },
});

interface User {
  id: string;
  name: string;
  avatar?: string;
  ready?: boolean;
}

interface UserListItemProps
  extends Omit<User, "id">,
    ListItemProps<"li", { button?: false }> {
  readyButton?: React.ReactNode | null;
}

const UserListItem: React.FunctionComponent<UserListItemProps> = (props) => {
  const { name, avatar, ready, readyButton, ...rest } = props;

  return (
    <ListItem {...rest}>
      <ListItemAvatar>
        <Avatar src={avatar} />
      </ListItemAvatar>
      <ListItemText primary={name} primaryTypographyProps={{ noWrap: true }} />
      {readyButton}
      {ready !== undefined && (
        <ListItemSecondaryAction>
          <Checkmark checked={ready} />
        </ListItemSecondaryAction>
      )}
    </ListItem>
  );
};

type ReadyScreenProps = {
  lobbyName: string;
  currentRound?: { mapName: string; round: number };
  ownerName: string;
  currentUser: User;
  users: User[];
} & XOR<{ onReady: () => void }, { onStart: () => void }> &
  Omit<ContainerProps, "children">;

const ReadyScreen: React.FunctionComponent<ReadyScreenProps> = (props) => {
  const {
    lobbyName,
    ownerName,
    currentRound,
    users,
    currentUser,
    onReady,
    onStart,
    ...rest
  } = props;
  const classes = useStyles();

  const usersReady = users.concat(currentUser).filter((u) => u.ready).length;
  const hasCurrentRound = Boolean(currentRound);

  const readyButton = useMemo(
    () =>
      onReady && hasCurrentRound ? (
        <Button
          variant="contained"
          className={clsx(classes.button, classes.readyButton)}
          onClick={onReady}
          disabled={currentUser.ready}
        >
          Ready!
        </Button>
      ) : null,
    [onReady, hasCurrentRound, classes, currentUser.ready]
  );

  return (
    <ThemeProvider type="light">
      <Container maxWidth="sm" {...rest}>
        <div className={classes.titleDiv}>
          <Typography variant="h1" align="center" noWrap>
            {lobbyName}
          </Typography>
          <Typography variant="subtitle2" align="center">
            Owned by <b>{ownerName}</b>
          </Typography>
        </div>
        <Paper square className={classes.paper}>
          {currentRound && (
            <>
              <div className={classes.infoDiv}>
                <div className={classes.infoSubdiv}>
                  <Typography
                    variant="h6"
                    align="center"
                    noWrap
                    style={{ width: "100%" }}
                  >
                    {currentRound.mapName}
                  </Typography>
                  <Typography variant="caption">Current Map</Typography>
                </div>
                <div className={classes.infoSubdiv}>
                  <Typography
                    variant="h6"
                    align="center"
                  >{`${currentRound.round}/5`}</Typography>
                  <Typography variant="caption" align="center">
                    Current Round
                  </Typography>
                </div>
              </div>
              {onStart && (
                <Button
                  className={classes.button}
                  variant="contained"
                  fullWidth
                  onClick={onStart}
                >
                  Start Game!
                </Button>
              )}
            </>
          )}
          <List
            subheader={
              <ListSubheader
                component="div"
                disableGutters
                className={classes.listSubheader}
              >
                {currentRound && (
                  <div style={{ paddingRight: 8 }}>
                    Ready {usersReady + "/" + (users.length + 1)}
                  </div>
                )}
                <UserListItem
                  style={{ color: "black", fontWeight: 700 }}
                  readyButton={readyButton}
                  {...currentUser}
                />
              </ListSubheader>
            }
          >
            {users.map(({ id, ...user }) => (
              <React.Fragment key={id}>
                <Divider />
                <UserListItem {...user} />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default ReadyScreen;
