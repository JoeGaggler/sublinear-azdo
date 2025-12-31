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
    const [huddles, setHuddles] = React.useState<Db.HuddleInfosStoredDocument | null>(null)

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let doc = await Azdo.getSharedDocument<Db.HuddleInfosStoredDocument>(
            Db.main_collection_id,
            Db.main_huddles_document_id,
            p.sessionInfo);
        if (!doc) {
            doc = {
                id: Db.main_huddles_document_id,
                huddleInfos: {
                    items: []
                }
            }
        }
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
        // TODO: spinner
        setIsAddingHuddle(false);

        let huddleInfo: Db.HuddleInfo = {
            id: Util.uuid("huddle"),
            name: data.name,
            isDeleted: false,
        }

        let anyHuddles: any = huddles || {}

        let nextHuddles: Db.HuddleInfosStoredDocument = {
            ...anyHuddles,
            huddleInfos: {
                ...anyHuddles.huddleInfos,
                items: [
                    ...anyHuddles.huddleInfos.items,
                    huddleInfo,
                ]
            },
        }

        let newDoc = await Azdo.upsertSharedDocument(Db.main_collection_id, nextHuddles, p.sessionInfo)
        if (!newDoc) {
            console.error("newHuddle: upsert failed")
            return;
        }

        setHuddles(newDoc);
        p.onChange(newDoc).catch(); // fire-and-forget
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
    onChange: (huddles: Db.HuddleInfosStoredDocument) => Promise<void>;
}

export default HuddlesHomePage
