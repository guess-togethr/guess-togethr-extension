import React, { useState } from "react";
import { ListItem, TextField } from "@material-ui/core";

interface CreateNewProps {
  onCreate: (name: string) => void;
}

const CreateNew: React.FunctionComponent<CreateNewProps> = ({ onCreate }) => {
  const [input, setInput] = useState<string | null>(null);

  return (
    <ListItem>
      <TextField></TextField>
    </ListItem>
  );
};

export default CreateNew;
