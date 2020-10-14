import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  TextField,
  InputAdornment,
  Tooltip,
  IconButton,
  FilledTextFieldProps,
} from "@material-ui/core";
import { Assignment } from "@material-ui/icons";

type ShareTextFieldProps = Omit<FilledTextFieldProps, "variant"> & {
  inviteUrl: string;
  disableTooltip?: boolean;
};

const ShareTextField = React.forwardRef<HTMLInputElement, ShareTextFieldProps>(
  ({ inviteUrl, disableTooltip, ...rest }, ref) => {
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const onClipboardClick = useCallback(() => {
      inputRef.current?.select();
      document.execCommand("copy");
      setTooltipOpen(true);
    }, []);

    useEffect(() => {
      if (tooltipOpen && !disableTooltip) {
        let timer: any = setTimeout(() => {
          setTooltipOpen(false);
          timer = null;
        }, 2000);
        return () => {
          if (timer) {
            setTooltipOpen(false);
            clearTimeout(timer);
          }
        };
      }
    }, [tooltipOpen, disableTooltip]);
    return (
      <TextField
        ref={ref}
        fullWidth
        inputRef={inputRef}
        InputProps={{
          readOnly: true,
          onFocus: (event) => event.currentTarget.select(),
          onBlur: (event) => event.currentTarget.blur(),
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Link copied!" open={tooltipOpen}>
                <IconButton onClick={onClipboardClick}>
                  <Assignment />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
          style: { paddingRight: 4 },
        }}
        variant="filled"
        size="small"
        label="Invite Link"
        defaultValue={inviteUrl}
        {...rest}
      />
    );
  }
);

export default ShareTextField;
