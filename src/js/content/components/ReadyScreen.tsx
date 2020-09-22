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
} from "@material-ui/core";
import ThemeProvider from "../containers/ThemeProvider";
import Checkmark from "./Checkmark";

interface ReadyScreenProps {
  lobbyName: string;
  users: { name: string; avatar?: string; ready: boolean }[];
}

const ReadyScreen: React.FunctionComponent<ReadyScreenProps> = (props) => {
  return (
    <ThemeProvider type="light">
      <Container maxWidth="sm">
        <Paper>
          <List>
            {props.users.map(({ name, avatar, ready }, i) => (
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
                {i !== props.users.length - 1 ? <Divider /> : null}
              </>
            ))}
          </List>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default ReadyScreen;
