import React, { useState, useCallback, useRef } from "react";
import {
  ListItem,
  ListSubheader,
  InputAdornment,
  ListItemText,
  IconButton,
} from "@material-ui/core";
import TextField from "./TextField";
import { Done } from "@material-ui/icons";

interface CreateNewProps extends React.HTMLAttributes<HTMLDivElement> {
  onCreate: (name: string) => void;
  isPro?: boolean;
}

const CreateNew = React.forwardRef<HTMLDivElement, CreateNewProps>(
  ({ onCreate, isPro, ...rest }, ref) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [input, setInput] = useState<string>("");
    const onChange = useCallback((event) => setInput(event.target.value), []);
    const onSubmit = () => {
      onCreate(input);
      setInput("");
    };
    const onKeyPress = (event: React.KeyboardEvent) => {
      if (event.keyCode === 13) {
        onSubmit();
        inputRef.current?.blur();
      }
    };

    return (
      <div ref={ref} {...rest}>
        <ListSubheader>Create New Lobby</ListSubheader>
        <ListItem>
          {isPro ? (
            <TextField
              fullWidth
              label="Enter Lobby Name"
              variant="filled"
              inputRef={inputRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton disabled={!input} onClick={onSubmit}>
                      <Done />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              onKeyDown={onKeyPress}
              onChange={onChange}
              value={input}
            ></TextField>
          ) : (
            <ListItemText primaryTypographyProps={{ variant: "subtitle2" }}>
              <a href="/pro">Go pro</a> to create lobbies
            </ListItemText>
          )}
        </ListItem>
      </div>
    );
  }
);

export default CreateNew;
