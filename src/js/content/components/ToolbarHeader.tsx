import React from "react";
import { ListItem, ListItemText, makeStyles, Paper } from "@material-ui/core";
import LogoIcon from "./LogoIcon";

const useStyles = makeStyles({
  multiline: {
    marginTop: 4,
    marginBottom: 0,
  },
});

interface ToolbarHeader {
  primary: string;
  secondary?: string;
  iconColor?: string;
  onClick: () => void;
  className?: string;
}
const ToolbarHeader: React.FunctionComponent<ToolbarHeader> = (props) => {
  const { primary, secondary, className, iconColor, onClick, children } = props;
  const classes = useStyles();

  return (
    <Paper>
      <ListItem button onClick={onClick} className={className}>
        <LogoIcon />
        <ListItemText
          classes={classes}
          primaryTypographyProps={{
            variant: "h6",
            style: { lineHeight: 1.2 },
            noWrap: true,
          }}
          secondary={secondary}
          secondaryTypographyProps={{ variant: "caption" }}
        >
          {primary}
        </ListItemText>
      </ListItem>
      {children}
    </Paper>
  );
};

export default ToolbarHeader;
