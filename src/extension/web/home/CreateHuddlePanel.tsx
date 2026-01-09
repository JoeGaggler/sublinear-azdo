import { useState } from 'react'

import { TitleSize } from "azure-devops-ui/Header";
import { Panel } from "azure-devops-ui/Panel";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";

export function CreateHuddlePanel(p: CreateHuddlePanelProps) {
    const [name, setName] = useState("")
    const [team, setTeam] = useState("")

    async function onCreate() {
        let data: CreateHuddlePanelValues = {
            name: name,
            team: team,
        }
        await p.onCommit(data);
    }

    async function onCancel() {
        await p.onCancel();
    }

    return (
        <Panel
            onDismiss={() => p.onCancel()}
            titleProps={
                {
                    text: "New Huddle",
                    iconProps: {
                        iconName: "Add"
                    },
                    size: TitleSize.Medium,
                    className: undefined,
                    id: undefined,
                }
            }
            description={undefined}
            footerButtonProps={[
                { text: "Cancel", onClick: () => onCancel(), primary: false, },
                { text: "Create", onClick: () => onCreate(), primary: true, },
            ]}
        >
            <div className="flex-column">
                <TextField
                    label={"Name"}
                    value={name}
                    onChange={(e, nextValue) => e && setName(nextValue)}
                    width={TextFieldWidth.standard}
                />

                <TextField
                    label={"Team"}
                    value={team}
                    onChange={(e, nextValue) => e && setTeam(nextValue)}
                    width={TextFieldWidth.standard}
                />
            </div>
        </Panel>
    )
}

export interface CreateHuddlePanelValues {
    name: string
    team: string
}

export interface CreateHuddlePanelProps {
    onCommit: (data: CreateHuddlePanelValues) => Promise<void>
    onCancel: () => Promise<void>
}
