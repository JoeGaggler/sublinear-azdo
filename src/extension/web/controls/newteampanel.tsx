import { useState } from 'react'
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";
import { Panel } from 'azure-devops-ui/Components/Panel/Panel';

export interface NewTeamPanelProps {
    onCommit: (code: string, name: string) => Promise<void>;
    onDismiss: () => Promise<void>;
    initialCode?: string;
    initialName?: string;
}

function NewTeamPanel(props: NewTeamPanelProps) {
    const [code, setCode] = useState(props.initialCode);
    const [name, setName] = useState(props.initialName);

    async function onDismiss() {
        console.log("Panel dismissed");
        props.onDismiss();
    }

    return (
        <Panel
            escDismiss={true}
            onDismiss={() => onDismiss()}>

            <div className="flex-column">

                <TextField
                    label="Name"
                    value={name}
                    onChange={(_e, v) => setName(v)}
                    width={TextFieldWidth.standard}
                />

                <TextField
                    label="Short Code"
                    value={code}
                    onChange={(_e, v) => setCode(v)}
                    width={TextFieldWidth.standard}
                />

            </div>
        </Panel>
    );
}

export default NewTeamPanel;