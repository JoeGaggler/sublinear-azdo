// import * as Azdo from '../api/azdo.ts';
// import * as Util from '../api/util.ts';
import * as Db from '../api/db.ts';
import type { AppNav } from './app.tsx';
// import React from 'react'

import { ScrollableList, ListItem } from "azure-devops-ui/List";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";

import { Header, TitleSize } from 'azure-devops-ui/Header';
// import { Card } from 'azure-devops-ui/Card';

function HuddleSessionList(p: HuddleSessionListProps) {

    async function onSelectSession(item: Db.HuddleSessionListItem) {
        console.log("onSelectSession:", item)
        p.appNav.navTo({
            view: "huddle_session",
            data: item.id,
            back: p.appNav.current,
            title: `huddle_session: ${item.id}`
        });
    }

    async function onDeleteSession(item: Db.HuddleSessionListItem) {
        console.error("TODO: onDeleteSession:", item)
    }

    return (
        <ScrollableList
            itemProvider={new ArrayItemProvider<Db.HuddleSessionListItem>(p.list || [])}
            selection={undefined}
            onSelect={(_event, data) => onSelectSession(data.data)}
            selectRowOnClick={true}
            onActivate={() => console.log("activate")}
            renderRow={
                (idx, session, details) => {
                    return <ListItem key={`list-item-${idx}`} index={idx} details={details}>
                        <Header
                            title={session.id}
                            titleSize={TitleSize.Small}
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
    appNav: AppNav;
    list: Db.HuddleSessionListItem[]
}
