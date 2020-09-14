import React, { FunctionComponent, useCallback } from "react";
import { TextFieldProps, TextField as MuiTextField } from "@material-ui/core";

const TextField = React.forwardRef<any, TextFieldProps>((props, ref) => {
  const { InputProps, ...rest } = props;
  const { onClick, onMouseDown } = InputProps || {
    onClick: undefined,
    onMouseDown: undefined,
  };

  const onClickMemo = useCallback(
    (event) => {
      event.stopPropagation();
      onClick?.(event);
    },
    [onClick]
  );
  const onMouseDownMemo = useCallback(
    (event) => {
      event.stopPropagation();
      onMouseDown?.(event);
    },
    [onMouseDown]
  );
  return (
    <MuiTextField
      ref={ref}
      InputProps={{
        ...InputProps,
        onClick: onClickMemo,
        onMouseDown: onMouseDownMemo,
      }}
      {...rest}
    />
  );
});

export default TextField;
