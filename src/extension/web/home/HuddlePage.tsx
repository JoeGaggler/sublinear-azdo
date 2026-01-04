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
import HuddleSessionList from './HuddleSessionList.tsx';


function HuddlePage(p: HuddlePageProps) {
    const [huddle, setHuddle] = React.useState<Db.HuddleStoredDocument | null>(null)
    const [huddleSessions, setHuddleSessions] = React.useState<Db.HuddleSessionListStoredDocument | null>(null)
    const [isEditingHuddle, setIsEditingHuddle] = React.useState<boolean>(false);

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let doc = await Azdo.getSharedDocument<Db.HuddleStoredDocument>(
            Db.huddle_collection_id,
            p.id,
            p.session);

        if (!doc) {
            // TODO: nav back?
            console.warn("getHuddle: does not exist")
            doc = null
        } else {
            setHuddle(doc);

            let sessionsDoc = await Db.requireHuddleSessionListStoredDocument(doc, p.session)
            if (!sessionsDoc) {
                console.warn("startSession: no sessions")
                return
            } else {
                setHuddleSessions(sessionsDoc)
            }
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
                areaPath: data.areaPath,
                includeSubAreas: data.includeSubAreas,
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

        let sessionsDoc = await Db.requireHuddleSessionListStoredDocument(huddle, p.session)
        if (!sessionsDoc) {
            console.warn("startSession: no sessions")
            return
        }

        let newSession: Db.HuddleSessionListItem = {
            id: Util.uuid("session"),
            created: Util.msecNow(),
        }
        sessionsDoc.items.unshift(newSession) // HACK: new sessions at the top

        let savedSessions = await Db.upsertHuddleSessionList(sessionsDoc, p.session)
        if (!savedSessions) {
            console.warn("startSession: upsert failed")
            return
        } else {
            setHuddleSessions(savedSessions)
        }

        console.log("startSession: sessions", sessionsDoc)

        onSelectHuddleSession(newSession)
        let previousId = getPriorHuddleSessionItem(savedSessions, newSession.id)
        onOpenHuddleSession(huddle.id, newSession.id, previousId)
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

    function getPriorHuddleSessionItem(list: Db.HuddleSessionListStoredDocument, id: string): string | undefined {
        let index1 = list.items.findIndex(s => s.id === id)
        if (index1 == -1) {
            console.warn("getPriorHuddleSessionItem: no huddle in sessions list")
            return
        }

        let previousId: string | undefined = undefined;
        let index2 = index1 + 1
        console.log("getPriorHuddleSessionItem: 1/2/len", index1, index2, list.items.length)
        if (index2 >= list.items.length) {
            console.warn("getPriorHuddleSessionItem: no second huddle")
        } else {
            let oldSession = list.items[index2];
            if (!oldSession) {
                console.warn("getPriorHuddleSessionItem: no old huddle", list.items)
                return
            }
            previousId = oldSession.id;
        }

        return previousId
    }

    async function onSelectHuddleSession(newSession: Db.HuddleSessionListItem) {
        if (!huddle) {
            console.warn("onSelectHuddleSession: no huddle")
            return
        }

        let huddleSessions = await Db.requireHuddleSessionListStoredDocument(huddle, p.session)
        if (!huddleSessions) {
            console.warn("onSelectHuddleSession: no sessions")
            return
        }
        setHuddleSessions(huddleSessions)

        let previousId = getPriorHuddleSessionItem(huddleSessions, newSession.id)
        await onOpenHuddleSession(huddle.id, newSession.id, previousId)
    }

    async function onDeleteHuddleSession(item: Db.HuddleSessionListItem) {
        if (!huddle) {
            console.warn("onDeleteHuddleSession: no huddle")
            return
        }

        let sessionsDoc = await Db.requireHuddleSessionListStoredDocument(huddle, p.session)
        if (!sessionsDoc) {
            console.warn("onDeleteHuddleSession: no sessions")
            return
        }

        let index1 = sessionsDoc.items.findIndex(s => s.id === item.id)
        if (index1 == -1) {
            console.warn("onDeleteHuddleSession: no huddle in sessions list")
            return
        }

        sessionsDoc.items.splice(index1, 1)

        let saved = await Db.upsertHuddleSessionList(sessionsDoc, p.session);
        if (!saved) {
            console.warn("onDeleteHuddleSession: upsert failed")
            return
        }

        setHuddleSessions(saved)
    }

    async function onOpenHuddleSession(huddleId: String, huddleSessionId: String, previousHuddleSessionId?: string) {
        p.appNav.navTo({
            view: "huddle_session",
            data: {
                huddleId: huddleId,
                huddleSessionId: huddleSessionId,
                previousHuddleSessionId: previousHuddleSessionId
            },
            back: p.appNav.current,
            title: `huddle_session: ${huddleSessionId}`
        });
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
                        {
                            (huddle?.id && huddleSessions?.items) && (
                                <HuddleSessionList
                                    list={huddleSessions.items}
                                    huddleId={huddle.id}
                                    onSelect={onSelectHuddleSession}
                                    onDelete={onDeleteHuddleSession}
                                />
                            )
                        }
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
