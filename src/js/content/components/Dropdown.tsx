import React, { useRef, useCallback } from "react";
import { Collapse, List, Grow, ClickAwayListener } from "@material-ui/core";
import { InView } from "react-intersection-observer";
import Growable from "../containers/Growable";

interface DropdownProps {
  mainChild: React.ReactElement;
  open: boolean;
  children: React.ReactElement[];
  onClose?: () => void;
  collapsedHeight: number;
}

const Dropdown: React.FunctionComponent<DropdownProps> = (props) => {
  const { onClose, mainChild, open, children, collapsedHeight } = props;

  const collapseRef = useRef<Element>();

  const onClickAway = useCallback(() => {
    open && onClose?.();
  }, [open, onClose]);

  return (
    <ClickAwayListener onClickAway={onClickAway}>
      <Collapse
        style={{ maxWidth: 300 }}
        collapsedHeight={collapsedHeight}
        in={open}
        ref={collapseRef}
      >
        <List style={{ padding: 0 }}>
          {mainChild}
          {React.Children.map(children, (child) =>
            React.isValidElement(child) ? (
              <Growable root={collapseRef.current} threshold={0.9}>
                {child}
              </Growable>
            ) : (
              child
            )
          )}
        </List>
      </Collapse>
    </ClickAwayListener>
  );
};

export default Dropdown;
