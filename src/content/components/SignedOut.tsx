import { ListItem, ListItemText } from "@material-ui/core";
import React, { useCallback } from "react";

interface SignedOutProps {
  joining?: boolean;
}

const SignedOut: React.FunctionComponent<SignedOutProps> = ({ joining }) => {
  const onClick = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const button = document.querySelector(
      event.currentTarget.id === "ggt-signin"
        ? "a.header__signin"
        : "a.header__signup"
    );
    if (button) {
      const newEvent = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
      });
      button.dispatchEvent(newEvent);
    }
  }, []);
  return (
    <ListItem>
      <ListItemText primaryTypographyProps={{ variant: "subtitle2" }}>
        <a href="/signin" id="ggt-signin" onClick={onClick}>
          Log in
        </a>{" "}
        or{" "}
        <a href="/signup" id="ggt-signup" onClick={onClick}>
          sign up
        </a>{" "}
        to {joining ? "join the lobby" : "play together"}!
      </ListItemText>
    </ListItem>
  );
};

export default SignedOut;
