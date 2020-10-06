import { IntersectionOptions, useInView } from "react-intersection-observer";
import { Grow } from "@material-ui/core";
import React, { ReactElement, useState, useCallback, useEffect } from "react";
import type { TransitionProps } from "@material-ui/core/transitions";

interface GrowableProps extends TransitionProps {
  children: ReactElement;
  exitTransition?: React.ComponentType<TransitionProps>;
  intersectionProps?: IntersectionOptions;
}
const Growable: React.FunctionComponent<GrowableProps> = ({
  children,
  exitTransition,
  intersectionProps,
  ...rest
}) => {
  const [ref, inView] = useInView(intersectionProps);
  const { in: inProp, onEntered, ...transitionProps } = rest;

  const [entered, setEntered] = useState(false);
  const onEnteredMemo = useCallback<NonNullable<typeof onEntered>>(
    (...args) => {
      setEntered(true);
      onEntered?.(...args);
    },
    [onEntered]
  );

  useEffect(() => {
    !inView && setEntered(false);
  }, [inView]);

  const TransitionComponent =
    exitTransition && (entered || inProp === false) ? exitTransition : Grow;

  return (
    <TransitionComponent
      in={inProp === undefined ? inView : inProp && inView}
      ref={ref}
      onEntered={onEnteredMemo}
      {...transitionProps}
      enter={TransitionComponent !== exitTransition}
    >
      {children}
    </TransitionComponent>
  );
};

export default Growable;
