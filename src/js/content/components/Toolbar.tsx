import React, { useState, useCallback } from "react";
import CurrentLobbyContainer from "../containers/CurrentLobby";
import {
  Collapse,
  List,
  ListItem,
  ListItemText,
  SvgIcon,
  ListItemIcon,
} from "@material-ui/core";
import Logo from "../logo.svg";

interface Props {
  currentLobby?: typeof CurrentLobbyContainer;
  lobbies: { id: string; name?: string }[];
  onOpen?: () => void;
  onClose?: () => void;
}

const Toolbar = (props: Props) => {
  const { currentLobby, lobbies, onOpen, onClose } = props;
  const [open, setOpen] = useState(false);

  const onOpenCallback = useCallback(() => {
    setOpen((isOpen) => (!isOpen && onOpen?.(), true));
  }, [onOpen]);

  const onCloseCallback = useCallback(() => {
    setOpen((isOpen) => isOpen && (onClose?.(), false));
  }, [onClose]);

  return (
    <Collapse collapsedHeight={40} in={open}>
      <List
        style={{
          backgroundColor: "rgb(40,40,40)",
          color: "#ddd",
          maxWidth: 300,
        }}
        onBlur={onCloseCallback}
      >
        {currentLobby || (
          <ListItem button>
            <ListItemIcon>
              <SvgIcon>
                <Logo color="white" />
              </SvgIcon>
            </ListItemIcon>
            <ListItemText>GeoguessTogethr</ListItemText>
          </ListItem>
        )}
        {lobbies.map((l) => (
          <ListItem button key={l.id}>
            <ListItemText>{l.name}</ListItemText>
          </ListItem>
        ))}
      </List>
    </Collapse>
  );
};

export default Toolbar;
