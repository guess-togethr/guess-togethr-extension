import { IntersectionOptions, useInView } from "react-intersection-observer";
import { Grow } from "@material-ui/core";
import React, { ReactElement } from "react";

interface GrowableProps extends IntersectionOptions {
  children: ReactElement;
}
const Growable: React.FunctionComponent<GrowableProps> = ({
  children,
  ...rest
}) => {
  const [ref, inView] = useInView(rest);

  return (
    <Grow in={inView} ref={ref}>
      {children}
    </Grow>
  );
};

export default Growable;
