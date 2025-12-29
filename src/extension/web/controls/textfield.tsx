import { useState } from 'react'
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";

export interface MyTextFieldProps {
    initialValue?: string;
    onChange?: (value: string) => void;
}

function MyTextField(props: MyTextFieldProps) {
    const [value, setValue] = useState(props.initialValue);

    function onChangeValue(v: string) {
        setValue(v);
        if (props.onChange) {
            props.onChange(v);
        }
    }

    return (
        <TextField
            value={value}
            onChange={(_e, v) => onChangeValue(v)}
            width={TextFieldWidth.standard}
        />
    );
}

export default MyTextField;