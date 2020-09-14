import React from "react";
import { CSSProperties } from "react";
import { ListItem, Avatar, Typography, makeStyles } from "@material-ui/core";
import { AvatarGroup } from "@material-ui/lab";

const useStyles = makeStyles({
  listItem: {
    display: "flex",
    alignItems: "center",
    marginTop: 8,
  },
  emptyListItem: {
    justifyContent: "center",
  },
});

export interface OnlineUsersProps {
  onlineUsers: { id: string; name: string; avatar?: string }[];
  style?: CSSProperties;
}

const OnlineUsers = React.forwardRef<HTMLDivElement, OnlineUsersProps>(
  ({ onlineUsers, style }, ref) => {
    const classes = useStyles();
    return (
      <ListItem
        className={
          classes.listItem +
          (onlineUsers.length ? "" : ` ${classes.emptyListItem}`)
        }
        button={(onlineUsers.length > 0) as any}
        ref={ref}
        style={style}
      >
        {onlineUsers.length ? (
          <AvatarGroup max={3} style={{ marginRight: 8 }}>
            {onlineUsers.map((u) => (
              <Avatar key={u.id} src={u.avatar}>
                {u.name[0]}
              </Avatar>
            ))}
          </AvatarGroup>
        ) : undefined}
        <Typography variant="overline">{`${onlineUsers.length} user${
          onlineUsers.length !== 1 ? "s" : ""
        } online`}</Typography>
      </ListItem>
    );
  }
);

export default React.memo(OnlineUsers);
