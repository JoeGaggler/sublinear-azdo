import { useState } from 'react'
import * as Db from '../api/db.ts';
import * as Azdo from '../api/azdo.ts';

import React from 'react'

import { TitleSize } from "azure-devops-ui/Header";
import { Panel } from "azure-devops-ui/Panel";
import { TextField, TextFieldWidth } from "azure-devops-ui/TextField";
import { Checkbox } from "azure-devops-ui/Checkbox";
import { Dropdown } from "azure-devops-ui/Dropdown";
// import { ArrayItemProvider } from 'azure-devops-ui/Utilities/Provider';
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import type { IListBoxItem } from 'azure-devops-ui/ListBox';

export function EditHuddlePanel(p: EditHuddlePanelProps) {
    const [name, setName] = useState(p.huddle.name)
    const [areaPath, setAreaPath] = useState(p.huddle.workItemQuery?.areaPath || "")
    const [availableWorkItemTypes, setAvailableWorkItemTypes] = useState<Azdo.WorkItemType[]>([])
    const [selectedWorkItemTypes, setSelectedWorkItemTypes] = useState<string[]>(p.huddle.workItemQuery?.workItemTypes || [])
    const [subAreasChecked, setSubAreasChecked] = useState(p.huddle.workItemQuery?.includeSubAreas || false)
    const witSelectionRef = React.useRef<DropdownMultiSelection>(new DropdownMultiSelection())

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        console.log("SELECTED WORK ITEM TYPES", selectedWorkItemTypes)
        let types = await Azdo.getWorkItemTypes(p.session)

        let typeNames = types.value
            .filter((wit): wit is Azdo.WorkItemType => wit !== undefined && wit.name !== undefined)

        typeNames.sort((a, b) => (a.name || "").localeCompare(b.name || ""))

        if (typeNames) {
            setAvailableWorkItemTypes(typeNames)
        }
        else {
            setAvailableWorkItemTypes([])
        }
    }

    async function onCommit() {
        let data: EditHuddlePanelValues = {
            name: name,
            areaPath: areaPath,
            includeSubAreas: subAreasChecked,
            workItemTypes: selectedWorkItemTypes,
        }
        await p.onCommit(data);
    }

    async function onCancel() {
        await p.onCancel();
    }

    let witItems = availableWorkItemTypes.map((wit): IListBoxItem<Azdo.WorkItemType> => {
        let ret: IListBoxItem<Azdo.WorkItemType> = {
            id: wit.name!, // TODO: remove force-unwrap
            text: wit.name!, // TODO: remove force-unwrap
        } // type:ListBoxItemType.Header, groupId:"blah", iconProps, enforceSingleSelect

        let iconUrl = wit.icon?.url
        if (iconUrl) {
            console.log("ICON", wit.icon)
            ret.iconProps = {
                render: () => {
                    return <img src={iconUrl} width={16} height={16} className='padding-right-4' />
                }
            }
        }

        return ret
    })

    let witSelection = witSelectionRef.current
    console.log("PREVIOUS", witSelection.selectedCount)
    // witSelection.clear()
    for (let index = 0; index < selectedWorkItemTypes.length; index++) {
        let index2 = availableWorkItemTypes.findIndex((v) => v.name === selectedWorkItemTypes[index])
        if (index2 !== -1) {
            console.log("RESELECT", index2)
            witSelection.select(index2, 1)
        }
    }

    async function onSelectWorkItemType(all: IListBoxItem[], sel: DropdownMultiSelection) {
        let newWits: string[] = [];

        console.log("WIT SELECTION", sel)
        console.log("WIT ITEMS", all)

        for (let i = 0; i < sel.value.length; i++) {
            let selRange = sel.value[i];
            console.log("SEL RANGE", selRange)
            for (let j = selRange.beginIndex; j <= selRange.endIndex; j++) {
                let item = all[j];
                if (item && item.id) {
                    newWits.push(item.id);
                    console.log("Selected work item type:", item.id);
                }
            }
        }

        setSelectedWorkItemTypes(newWits)
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

                {/* <TextField
                    label={"Work Item Types"}
                    value={workItemTypes}
                    onChange={(e, nextValue) => e && setWorkItemTypes(nextValue)}
                    width={TextFieldWidth.standard}
                /> */}

                <div className="flex-column rhythm-vertical-0">
                    <div>Work Item Types</div>
                    <Dropdown
                        items={witItems}
                        selection={witSelection}
                        showFilterBox={true}
                        onSelect={() => onSelectWorkItemType(witItems, witSelection)}
                    />
                </div>
            </div>
        </Panel>
    )
}

export interface EditHuddlePanelValues {
    name: string
    areaPath: string
    includeSubAreas: boolean
    workItemTypes: string[]
}

export interface EditHuddlePanelProps {
    huddle: Db.HuddleStoredDocument
    session: Azdo.Session
    onCommit: (data: EditHuddlePanelValues) => Promise<void>
    onCancel: () => Promise<void>
}
