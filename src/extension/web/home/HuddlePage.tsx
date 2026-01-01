import { Page } from 'azure-devops-ui/Page';
import * as Azdo from '../api/azdo.ts';
// import * as Util from '../api/util.ts';
import * as Db from '../api/db.ts';
import type { AppNav } from './app.tsx';
import { Header, TitleSize } from 'azure-devops-ui/Header';
import * as Util from '../api/util.ts';
import { Card } from 'azure-devops-ui/Card';

import React from 'react'
import { EditHuddlePanel, type EditHuddlePanelValues } from './EditHuddlePanel.tsx';
import type { IHeaderCommandBarItem } from 'azure-devops-ui/HeaderCommandBar';


function HuddlePage(p: HuddlePageProps) {
    const [huddle, setHuddle] = React.useState<Db.HuddleStoredDocument | null>(null)
    const [isEditingHuddle, setIsEditingHuddle] = React.useState<boolean>(false);

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let doc = await Azdo.getSharedDocument<Db.HuddleStoredDocument>(
            Db.huddle_collection_id,
            p.id,
            p.session);
        if (!doc) {
            console.warn("getHuddle: does not exist")

            // TODO: nav back?
            doc = null
        }
        setHuddle(doc);
    }

    React.useEffect(() => {
        const interval_id = setInterval(() => { poll(); }, 1000);
        return () => { clearInterval(interval_id); };
    }, []);

    async function poll() {
        console.log("HuddlePage poll");
    }

    async function onCommitEditHuddle(data: EditHuddlePanelValues) {
        try {
            if (!huddle) { return } // TODO: assert

            let nextHuddle: Db.HuddleStoredDocument = { ...huddle }
            nextHuddle.name = data.name
            nextHuddle.workItemQuery = {
                areaPath: data.areaPath
            }

            let upsertResult = await Db.upsertHuddle(nextHuddle, p.session)
            if (!upsertResult) {
                console.warn("onCommitEditHuddle: upsert failed")
                return
            }

            setHuddle(upsertResult.item);
        }
        finally {
            setIsEditingHuddle(false);
        }
    }

    async function onCancelEditHuddle() {
        setIsEditingHuddle(false);
    }

    function showEditHuddlePanel() {
        setIsEditingHuddle(true)
    }

    async function startSession() {
        if (!huddle) {
            console.warn("startSession: no huddle")
            return
        }

        let huddle2 = await Db.refreshHuddle(huddle, p.session)
        if (!huddle2) {
            console.warn("startSession: no huddle2")
            return
        }
        setHuddle(huddle2)

        // TODO: status checks before starting session

        let sessions = await Db.requireHuddleSessionListStoredDocument(huddle, p.session)
        if (!sessions) {
            console.warn("startSession: no sessions")
            return
        }

        let newSession: Db.HuddleSessionListItem = {
            id: Util.uuid("session"),
            created: Util.msecNow(),
        }
        sessions.items.push(newSession)

        let savedSessions = Db.upsertHuddleSessionList(sessions, p.session)
        if (!savedSessions) {
            console.warn("startSession: upsert failed")
            return
        }

        console.log("startSession: sessions", sessions)
    }

    function getHeaderCommandBarItems(): IHeaderCommandBarItem[] {
        let items: IHeaderCommandBarItem[] = []

        let editItem: IHeaderCommandBarItem = {
            id: "editHuddle",
            text: "Edit",
            iconProps: { iconName: "Edit" },
            onActivate: () => { showEditHuddlePanel(); },
            isPrimary: true,
            important: false,
        }
        items.push(editItem)

        // TODO: only if config is valid
        let startItem: IHeaderCommandBarItem = {
            id: "startSession",
            text: "Start Session",
            iconProps: { iconName: "Play" },
            onActivate: () => { startSession(); },
            isPrimary: true,
            important: true,
        }
        items.push(startItem)

        return items
    }

    if (huddle) {
        return (
            <Page>
                <Header
                    title={huddle.name}
                    titleSize={TitleSize.Large}
                    backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
                    commandBarItems={getHeaderCommandBarItems()}
                />
                <div className="page-content page-content-top">
                    <Card>
                        <div className="flex-column">
                            {huddle.id}
                        </div>
                    </Card>
                </div>
                {
                    (isEditingHuddle) && (
                        <EditHuddlePanel
                            huddle={huddle}
                            onCommit={onCommitEditHuddle}
                            onCancel={onCancelEditHuddle}
                        />
                    )
                }
            </Page>
        )
    } else {
        return (
            <Page>
                <Header
                    title={""}
                    titleSize={TitleSize.Large}
                    backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
                />
            </Page>
        )
    }
}

export interface HuddlePageProps {
    appNav: AppNav;
    database: Db.Database;
    session: Azdo.Session;
    id: string;
}

export default HuddlePage;
