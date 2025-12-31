import * as Azdo from '../api/azdo.ts';
import * as Util from '../api/util.ts';
import * as Db from '../api/db.ts';
import type { AppNav } from './app.tsx';
import { CreateHuddlePanel, type CreateHuddlePanelValues } from './CreateHuddlePanel.tsx';

import React from 'react'

import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { ScrollableList, ListItem } from "azure-devops-ui/List";
import { ArrayItemProvider } from "azure-devops-ui/Utilities/Provider";

function HuddlesHomePage(p: HuddlesHomePageProps) {
    const [isAddingHuddle, setIsAddingHuddle] = React.useState<boolean>(false);
    const [huddles, setHuddles] = React.useState<Db.HuddleListStoredDocument | null>(null)

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let doc = await Db.requireHuddleListStoredDocument(p.sessionInfo)
        setHuddles(doc);
    }

    React.useEffect(() => {
        const interval_id = setInterval(() => { poll(); }, 1000);
        return () => { clearInterval(interval_id); };
    }, []);

    async function poll() {
        console.log("HuddlesHomePage poll");
    }

    async function showCreateHuddlePanel() {
        setIsAddingHuddle(true);
    }

    async function onCommitNewHuddle(data: CreateHuddlePanelValues) {
        try {
            const id = Util.uuid("huddle");

            let nextHuddle: Db.HuddleStoredDocument = {
                id: id,
                name: data.name,
            }
            let [savedHuddle, savedHuddles] = await Db.upsertHuddle(nextHuddle, p.sessionInfo)

            setHuddles(savedHuddles);

            if (savedHuddle) {
                p.appNav.navTo({
                    view: "huddle",
                    data: savedHuddle.id,
                    back: p.appNav.current,
                })
            }
        }
        finally {
            setIsAddingHuddle(false);
        }
    }

    async function onCancelNewHuddle() {
        setIsAddingHuddle(false);
    }

    async function onDeleteHuddle(huddle: Db.HuddleInfo) {
        await Db.deleteHuddle(huddle, p.sessionInfo);
    }

    async function onSelectHuddle(huddleInfo: Db.HuddleInfo) {
        console.log("onSelectHuddle:", huddleInfo)

        p.appNav.navTo({
            view: `huddle`,
            data: huddleInfo.id,
            title: `huddle-${huddleInfo.id}`,
            back: p.appNav.current,
        })
    }

    function listHuddles(): JSX.Element {
        let dbHuddles = huddles?.huddleInfos?.items
        if (!dbHuddles) {
            // TODO: loading spinner?
            return <></>
        }

        dbHuddles = dbHuddles.filter(h => !h.isDeleted)
        dbHuddles.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        // let selection = new ListSelection(true);
        return <ScrollableList
            itemProvider={new ArrayItemProvider<Db.HuddleInfo>(dbHuddles)}
            selection={undefined}
            onSelect={(_event, data) => onSelectHuddle(data.data)}
            selectRowOnClick={true}
            onActivate={() => console.log("activate")}
            renderRow={
                (idx, huddle, details) => {
                    return <ListItem key={`list-item-${idx}`} index={idx} details={details}>
                        <Header
                            title={`Huddle: ${huddle.name}`}
                            titleSize={TitleSize.Small}
                            commandBarItems={[
                                {
                                    id: "deleteHuddle",
                                    text: "Delete",
                                    iconProps: { iconName: "Delete" },
                                    onActivate: () => { onDeleteHuddle(huddle); },
                                    isPrimary: true,
                                    important: false,
                                },
                            ]}
                        />
                    </ListItem>
                }
            }
        />
    }

    return (
        <Page>
            <Header
                title={"Huddles"}
                titleSize={TitleSize.Large}
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
                commandBarItems={[
                    {
                        id: "addHuddle",
                        text: "Add Huddle",
                        iconProps: { iconName: "Add" },
                        onActivate: () => { showCreateHuddlePanel(); },
                        isPrimary: true,
                        important: true,
                    },
                ]}
            />
            <div className="page-content page-content-top">
                <Card>
                    <div className="flex-column">
                        {listHuddles()}
                    </div>
                </Card>
            </div>
            {
                isAddingHuddle &&
                <CreateHuddlePanel
                    onCommit={onCommitNewHuddle}
                    onCancel={onCancelNewHuddle}
                />
            }
        </Page>
    )
}

export interface HuddlesHomePageProps {
    appNav: AppNav;
    database: Db.Database;
    sessionInfo: Azdo.SessionInfo;
}

export default HuddlesHomePage
