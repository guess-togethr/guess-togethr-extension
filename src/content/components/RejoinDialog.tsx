import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@material-ui/core";

interface RejoinDialogProps {
  open: boolean;
  name: string;
  onRejoin: () => void;
  onLeave: () => void;
}

const RejoinDialog: React.FunctionComponent<RejoinDialogProps> = ({
  open,
  name,
  onRejoin,
  onLeave,
}) => {
  return (
    <Dialog open={open}>
      <DialogTitle>Rejoin {name}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You are currently joined to {name}. Would you like to go there now?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onLeave} color="secondary">
          Leave lobby
        </Button>
        <Button onClick={onRejoin} color="primary">
          Rejoin lobby
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RejoinDialog;
