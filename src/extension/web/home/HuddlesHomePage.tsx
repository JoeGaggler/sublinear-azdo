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
    const [huddleInfos, setHuddleInfos] = React.useState<Db.HuddleInfo[] | null>(null)

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    React.useEffect(() => { init() }, []);
    async function init() {
        console.log("HuddlesHomePage init");

        try {
            let huddles = await Db.getMainHuddlesStoredDocument(p.sessionInfo);
            if (!huddles) {
                console.error("HuddlesHomePage: no huddle info doc")
                return
            }

            let huddleInfos = huddles.huddleInfos
            if (!huddleInfos) {
                console.error("HuddlesHomePage: no huddle infos")
                return
            }
            setHuddleInfos(huddleInfos.items || [])
        }
        catch {
            console.error("error doc")
        }

        const interval_id = setInterval(() => { setPollHack(Math.random()); }, 1000);
        return () => { clearInterval(interval_id); };
    }

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
        await Db.newHuddleInfo(huddleInfo, p.sessionInfo)

        let nextHuddleInfos = [
            ...(huddleInfos || []),
            huddleInfo
        ]
        setHuddleInfos(nextHuddleInfos);
    }

    async function onCancelNewHuddle() {
        setIsAddingHuddle(false);
    }

    async function onDeleteHuddle(huddle: Db.HuddleInfo) {
        await Db.deleteHuddle(huddle, p.sessionInfo);
    }

    async function onSelectHuddle(huddle: Db.HuddleInfo) {
        console.log("onSelectHuddle:", huddle)

        p.appNav.navTo({
            view: `huddle`,
            data: huddle,
            title: `huddle-${huddle.id}`,
            back: p.appNav.current,
        })
    }

    function listHuddles(): JSX.Element {
        let dbHuddles = huddleInfos
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
