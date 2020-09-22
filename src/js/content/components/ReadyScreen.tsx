import React, { useState } from "react";
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
} from "@material-ui/core";
import ThemeProvider from "../containers/ThemeProvider";
import Checkmark from "./Checkmark";

interface ReadyScreenProps {
  lobbyName: string;
  mapName: string;
  round: number;
  ownerName: string;
  users: { name: string; avatar?: string; ready: boolean }[];
}

const ReadyScreen: React.FunctionComponent<ReadyScreenProps> = (props) => {
  const { lobbyName, ownerName, mapName, round, users } = props;
  return (
    <ThemeProvider type="light">
      <Container maxWidth="sm">
        <Paper square>
          <Typography variant="h3" align="center">
            {lobbyName}
          </Typography>
          <Typography variant="subtitle2" align="center">
            Owned by <b>{ownerName}</b>
          </Typography>
          <List>
            {users.map(({ name, avatar, ready }, i) => (
              <>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar src={avatar} alt={name} />
                  </ListItemAvatar>
                  <ListItemText primary={name} />
                  <ListItemSecondaryAction>
                    <Checkmark checked={ready} />
                  </ListItemSecondaryAction>
                </ListItem>
                {i !== users.length - 1 ? <Divider /> : null}
              </>
            ))}
          </List>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default ReadyScreen;
