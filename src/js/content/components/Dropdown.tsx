import React, { useCallback, PropsWithChildren } from "react";
import { Collapse, List, ClickAwayListener } from "@material-ui/core";
import Growable from "./Growable";
import { TransitionGroup } from "react-transition-group";

interface DropdownProps {
  open: boolean;
  onClose?: () => void;
  collapsedHeight: number;
}

const Dropdown = React.forwardRef<
  HTMLDivElement,
  PropsWithChildren<DropdownProps>
>((props, ref) => {
  const { onClose, open, children, collapsedHeight } = props;

  const onClickAway = useCallback(() => {
    if (open) {
      onClose?.();
    }
  }, [open, onClose]);

  const childrenArray = React.Children.toArray(children);
  const mainChild = childrenArray[0];
  const otherChildren = childrenArray.slice(1);

  return (
    <ClickAwayListener onClickAway={onClickAway}>
      <Collapse
        style={{ width: 256, margin: "2px 0" }}
        collapsedHeight={collapsedHeight}
        in={open}
        ref={ref}
      >
        <List style={{ padding: 0 }}>
          {mainChild}
          <TransitionGroup component={null}>
            {otherChildren.map((child) =>
              React.isValidElement(child) ? (
                <Growable
                  intersectionProps={{
                    root: ref && "current" in ref ? ref.current : null,
                    threshold: 0.9,
                  }}
                  key={child.key ?? undefined}
                  exitTransition={Collapse}
                >
                  {child}
                </Growable>
              ) : (
                child
              )
            )}
          </TransitionGroup>
        </List>
      </Collapse>
    </ClickAwayListener>
  );
});

export default Dropdown;
