import * as Azdo from '../api/azdo.ts';
import * as Util from '../api/util.ts';
import * as Db from '../api/db.ts';
import type { AppNav } from './app.tsx';
import { CreateHuddlePanel } from './CreateHuddlePanel.tsx';

import React from 'react'

import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";

function HuddlesHomePage(p: HuddlesHomePageProps) {
    const [sessionInfo, _setSessionInfo] = React.useState<Azdo.SessionInfo>(p.sessionInfo);
    const [isAddingHuddle, setIsAddingHuddle] = React.useState<boolean>(false);

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    React.useEffect(() => { init() }, []);
    async function init() {
        console.log("HuddlesHomePage init");

        try {
            let doc = await Azdo.getOrCreateSharedDocument<Db.MainHuddlesStoredDocument>(
                Db.main_collection_id,
                Db.main_huddles_document_id,
                Db.makeEmptyHuddlesStoredDocument(),
                Db.syncHuddles(p.database),
                sessionInfo)
            if (doc) {
                console.log("have doc", doc)
            } else {
                console.error("no doc")
            }
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

    async function onCommitNewHuddle() {
        // Azdo.getSharedDocument(

        // )
        setIsAddingHuddle(false);
    }

    async function onCancelNewHuddle() {
        setIsAddingHuddle(false);
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
                        TODO: list huddles
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
