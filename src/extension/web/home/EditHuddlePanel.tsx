import { useState } from 'react'
import * as Db from '../api/db.ts';

import { TitleSize } from "azure-devops-ui/Header";
import { Panel } from "azure-devops-ui/Panel";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";
import { Checkbox } from "azure-devops-ui/Checkbox";

export function EditHuddlePanel(p: EditHuddlePanelProps) {
    const [name, setName] = useState(p.huddle.name)
    const [areaPath, setAreaPath] = useState(p.huddle.workItemQuery?.areaPath || "")
    const [workItemTypes, setWorkItemTypes] = useState(p.huddle.workItemQuery?.workItemTypes || "")
    const [subAreasChecked, setSubAreasChecked] = useState(p.huddle.workItemQuery?.includeSubAreas || false)

    async function onCommit() {
        let data: EditHuddlePanelValues = {
            name: name,
            areaPath: areaPath,
            includeSubAreas: subAreasChecked,
            workItemTypes: workItemTypes,
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
                    text: "Edit Huddle",
                    iconProps: {
                        iconName: "Edit"
                    },
                    size: TitleSize.Medium,
                    className: undefined,
                    id: undefined,
                }
            }
            description={undefined}
            footerButtonProps={[
                { text: "Cancel", onClick: () => onCancel(), primary: false, },
                { text: "Save", onClick: () => onCommit(), primary: true, },
            ]}
        >
            <div className="flex-column rhythm-vertical-8">
                <TextField
                    label={"Name"}
                    value={name}
                    onChange={(e, nextValue) => e && setName(nextValue)}
                    width={TextFieldWidth.standard}
                />

                <TextField
                    label={"Area Path"}
                    value={areaPath}
                    onChange={(e, nextValue) => e && setAreaPath(nextValue)}
                    width={TextFieldWidth.standard}
                />

                <Checkbox
                    onChange={(_event, checked) => (setSubAreasChecked(checked))}
                    checked={subAreasChecked}
                    label="Include sub-areas"
                />

                <TextField
                    label={"Work Item Types"}
                    value={workItemTypes}
                    onChange={(e, nextValue) => e && setWorkItemTypes(nextValue)}
                    width={TextFieldWidth.standard}
                />
            </div>
        </Panel>
    )
}

export interface EditHuddlePanelValues {
    name: string
    areaPath: string
    includeSubAreas: boolean
    workItemTypes: string
}

export interface EditHuddlePanelProps {
    huddle: Db.HuddleStoredDocument
    onCommit: (data: EditHuddlePanelValues) => Promise<void>
    onCancel: () => Promise<void>
}
