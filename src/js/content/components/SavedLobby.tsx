import {
  Fade,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Tooltip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Delete, Edit, Check, Tab } from "@material-ui/icons";
import React, { useCallback } from "react";
import { TransitionGroup } from "react-transition-group";

interface SavedLobbyProps {
  id: string;
  name?: string;
  showTabIcon?: boolean;
  onClick?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const useStyles = makeStyles({
  disabled: {
    "&&": {
      opacity: 1,
    },
    "&:hover": {
      backgroundColor: "inherit",
    },
  },
  listItem: {
    paddingLeft: 4,
  },
  iconButton: {
    pointerEvents: "initial",
  },
  listItemIcon: {
    position: "relative",
    height: 48,
    width: 56,
    "& > *": {
      position: "absolute",
    },
  },
  tabIcon: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    margin: "auto auto auto 0",
    boxSizing: "content-box",
  },
});

const SavedLobby = React.forwardRef<HTMLDivElement, SavedLobbyProps>(
  (props, ref) => {
    const { onDelete, onClick, id, name, showTabIcon, ...rest } = props;
    const deletable = !!onDelete && !showTabIcon;
    const onDeleteMemo = useCallback(() => onDelete?.(id), [onDelete, id]);
    const onClickMemo = useCallback(
      (event) => {
        event.stopPropagation();
        if (!deletable) {
          onClick?.(id);
        }
      },
      [id, onClick, deletable]
    );
    // const [exited, setExited] = useState(true);
    const classes = useStyles();
    // useEffect(() => {
    //   deletable && setExited(false);
    // }, [deletable]);
    return (
      <ListItem
        ref={ref}
        button
        disabled={!onClick}
        onClick={onClickMemo}
        classes={{ root: classes.listItem, disabled: classes.disabled }}
        dense
        {...rest}
      >
        <ListItemIcon className={classes.listItemIcon}>
          <TransitionGroup component={null}>
            {deletable ? (
              <Fade key="delete">
                <div>
                  <IconButton
                    onClick={onDeleteMemo}
                    onMouseDown={(event) => event.stopPropagation()}
                    className={classes.iconButton}
                  >
                    <Delete />
                  </IconButton>
                </div>
              </Fade>
            ) : showTabIcon ? (
              <Fade key="tab">
                <Tooltip title="Switch tab">
                  <div>
                    {/* Just a naked Tab doesn't work here? 
                        The onMouseOver handler never fires */}
                    <Tab className={classes.tabIcon} />
                  </div>
                </Tooltip>
              </Fade>
            ) : null}
          </TransitionGroup>
        </ListItemIcon>
        <ListItemText>{name ?? "Unknown Lobby"}</ListItemText>
      </ListItem>
    );
  }
);

interface SavedLobbyHeaderProps {
  onEditClick: () => void;
  iconButton: "edit" | "check";
}

const useHeaderStyles = makeStyles({
  label: {
    width: "1.5rem",
    height: "1.5rem",
    "& > *": {
      position: "absolute",
    },
  },
});

export const SavedLobbyHeader = React.forwardRef<
  HTMLDivElement,
  SavedLobbyHeaderProps
>(({ onEditClick, iconButton, ...rest }, ref) => {
  const classes = useHeaderStyles();
  return (
    <ListItem ref={ref} dense {...(rest as any)}>
      <ListItemText primaryTypographyProps={{ color: "textSecondary" }}>
        Saved Lobbies
      </ListItemText>
      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          size="small"
          onClick={onEditClick}
          classes={classes}
        >
          <TransitionGroup component={null}>
            {iconButton === "edit" ? (
              <Fade key="edit">
                <Edit />
              </Fade>
            ) : (
              <Fade key="check">
                <Check />
              </Fade>
            )}
          </TransitionGroup>
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
});

export default SavedLobby;
