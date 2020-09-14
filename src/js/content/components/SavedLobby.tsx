import {
  Fade,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
} from "@material-ui/core";
import { Delete, Edit } from "@material-ui/icons";
import React, { useCallback, useEffect, useState } from "react";

interface SavedLobbyProps {
  id: string;
  name?: string;
  showTabIcon?: boolean;
  onClick: (id: string) => void;
  onDelete?: (id: string) => void;
}

const SavedLobby = React.forwardRef<HTMLDivElement, SavedLobbyProps>(
  (props, ref) => {
    const { onDelete, onClick, id, name, showTabIcon, ...rest } = props;
    const deletable = !!onDelete && !showTabIcon;
    const onDeleteMemo = useCallback(
      (event) => !showTabIcon && onDelete?.(id),
      [showTabIcon, onDelete, id]
    );
    const onClickMemo = useCallback(
      (event) => {
        event.stopPropagation();
        !deletable && onClick(id);
      },
      [id, onClick, deletable]
    );
    const [exited, setExited] = useState(true);
    useEffect(() => {
      deletable && setExited(false);
    }, [deletable]);
    return (
      <ListItem
        ref={ref}
        button={exited as any}
        onClick={onClickMemo}
        dense
        {...rest}
      >
        <Fade in={deletable} onExited={() => setExited(true)}>
          <ListItemIcon>
            <IconButton
              onClick={onDeleteMemo}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <Delete />
            </IconButton>
          </ListItemIcon>
        </Fade>
        <ListItemText>{name ?? "Unknown Lobby"}</ListItemText>
      </ListItem>
    );
  }
);

interface SavedLobbyHeaderProps {
  onEditClick: () => void;
}

export const SavedLobbyHeader = React.forwardRef<
  HTMLDivElement,
  SavedLobbyHeaderProps
>(({ onEditClick, ...rest }, ref) => (
  <ListItem ref={ref} dense {...(rest as any)}>
    <ListItemText primaryTypographyProps={{ color: "textSecondary" }}>
      Saved Lobbies
    </ListItemText>
    <ListItemSecondaryAction>
      <IconButton edge="end" size="small" onClick={onEditClick}>
        <Edit />
      </IconButton>
    </ListItemSecondaryAction>
  </ListItem>
));

export default SavedLobby;
