import { useState } from 'react'
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";

function MyTextField() {
    const [value, setValue] = useState("initial value");

    return (
        <TextField
            value={value}
            onChange={(_e, v) => setValue(v)}
            width={TextFieldWidth.standard}
        />
    );
}

export default MyTextField;