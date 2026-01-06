import * as Db from '../api/db.ts';
import * as Util from '../api/util.ts';
// import React from 'react'

import { ScrollableList, ListItem } from "azure-devops-ui/List";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";
import { Header, TitleSize } from 'azure-devops-ui/Header';
import { IconSize } from 'azure-devops-ui/Icon';
import { Ago } from "azure-devops-ui/Ago";
import { AgoFormat } from "azure-devops-ui/Utilities/Date";

function HuddleSessionList(p: HuddleSessionListProps) {
    async function onSelectSession(item: Db.HuddleSessionListItem) {
        console.log("onSelectSession:", item)
        p.onSelect?.(item);
    }

    async function onDeleteSession(item: Db.HuddleSessionListItem) {
        console.error("TODO: onDeleteSession:", item)
        p.onDelete?.(item);
    }

    function renderHeaderTitle(session: Db.HuddleSessionListItem): JSX.Element {
        return (
            <div className='flex-row rhythm-horizontal-8 title-xs'>
                <div>{Util.msecToDate(session.created).toLocaleDateString()}</div>
                <div className='flex-row'>(<Ago date={Util.msecToDate(session.created)} format={AgoFormat.Compact} />)</div>
            </div>
        )
    }

    return (
        <ScrollableList
            className='full-width'
            itemProvider={new ArrayItemProvider<Db.HuddleSessionListItem>(p.list || [])}
            selection={undefined}
            onSelect={(_event, data) => onSelectSession(data.data)}
            selectRowOnClick={true}
            onActivate={() => console.log("activate")}
            renderRow={
                (idx, session, details) => {
                    return <ListItem key={`list-item-${idx}`} index={idx} details={details}>
                        <Header className='full-width'
                            title={renderHeaderTitle(session)}
                            titleSize={TitleSize.Small}
                            titleIconProps={{
                                iconName: "ProFootball",
                                size: IconSize.medium,
                            }}
                            commandBarItems={[
                                {
                                    id: "deleteSession",
                                    text: "Delete",
                                    iconProps: { iconName: "Delete" },
                                    onActivate: () => { onDeleteSession(session); },
                                    isPrimary: true,
                                    important: false,
                                },
                            ]}
                        />
                    </ListItem>
                }
            }
        >
        </ScrollableList>
    )
}

export default HuddleSessionList;

export interface HuddleSessionListProps {
    huddleId: string;
    list: Db.HuddleSessionListItem[];
    onSelect?: (item: Db.HuddleSessionListItem) => Promise<void>;
    onDelete?: (item: Db.HuddleSessionListItem) => Promise<void>;
}
