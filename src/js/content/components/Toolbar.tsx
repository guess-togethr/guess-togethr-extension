import React, { useState, useCallback } from "react";
import CurrentLobbyContainer from "../containers/CurrentLobby";
import { Collapse, List, ListItem } from "@material-ui/core";

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
      <List onBlur={onCloseCallback}>
        {currentLobby || <ListItem button>GeoguessTogethr</ListItem>}
        {lobbies.map((l) => (
          <ListItem button key={l.id}>
            {l.name}
          </ListItem>
        ))}
      </List>
    </Collapse>
  );
};

export default Toolbar;
