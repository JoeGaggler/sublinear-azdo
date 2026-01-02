import * as Azdo from '../api/azdo.ts';
import * as Db from '../api/db.ts';
import * as Util from '../api/util.ts';
import type { AppNav } from './app.tsx';

import React from 'react'

import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
// import { Button } from "azure-devops-ui/Button";

interface HuddleGraph {
    debugWorkItems: Db.WorkItemSnapshot[]
    slides: HuddleSlide[]
}

interface HuddleSlide {
    type: string
    id: number
    title: string
    fieldChanges: HuddleSlideFieldChange[]
}

interface HuddleSlideFieldChange {
    what: string
    prev: string
    next: string
}

function HuddleSessionPage(p: HuddleSessionPageProps) {
    let [graph, setGraph] = React.useState<HuddleGraph | undefined>(undefined)

    React.useEffect(() => {
        const interval_id = setInterval(() => { poll(); }, 1000);
        return () => { clearInterval(interval_id); };
    }, []);

    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let huddle = await Db.getHuddleDocument(p.huddleId, p.session)
        if (!huddle) {
            // TODO: fail
            console.error("HuddleSessionPage: missing huddle");
            return
        }
        console.log("HuddleSessionPage: huddle", huddle);

        let huddleSession = await Db.requireHuddleSessionStoredDocument(p.huddleSessionId, p.session)
        huddleSession.created = huddleSession.created || Util.msecNow()
        console.log("HuddleSessionPage: huddle session", huddleSession);

        let snapShot2 = huddleSession.snapshot

        // TODO: FOR DEBUGGING ONLY, ALWAYS GENERATE A NEW SNAPSHOT!
        snapShot2 = undefined
        // TODO: REMOVE THIS DEBUGGING CODE

        if (!snapShot2) {
            let workItemQuery = huddle.workItemQuery
            if (!workItemQuery) {
                // TODO: fail
                console.error("HuddleSessionPage: missing work item query");
                return
            }

            let created2 = huddleSession.created || Util.msecNow()
            snapShot2 = await getSnapshot(workItemQuery, created2, p.session)
            huddleSession.snapshot = snapShot2
        }

        let snapShot1: Db.HuddleSessionSnapshot;
        if (p.previousHuddleSessionId) {
            let previousHuddleSession = await Db.requireHuddleSessionStoredDocument(p.previousHuddleSessionId, p.session)
            if (!previousHuddleSession.snapshot) {
                snapShot1 = {
                    workitems: {
                        items: []
                    }
                }
            } else {
                snapShot1 = previousHuddleSession.snapshot
            }
        } else {
            snapShot1 = {
                workitems: {
                    items: []
                }
            }
        }

        // TODO: PERSIST ALL CHANGES TO HUDDLE SESSION
        console.log("Snapshot1:", snapShot1)
        console.log("Snapshot2:", snapShot2)

        let workItems1 = snapShot1.workitems?.items || []
        let workItems2 = snapShot2.workitems?.items || []

        let slides: HuddleSlide[] = []
        for (let wi2 of workItems2) {
            // NEW
            let wi1 = workItems1.find(w => w.id === wi2.id)
            if (!wi1) {
                let nextSlide = await createNewSlide(wi2);
                slides.push(nextSlide)
                continue;
            }

            // MATCHED
            let nextSlide = await createFoundSlide(wi1, wi2);
            slides.push(nextSlide)
        }

        // TODO: slides only in previous
        for (let wi1 of workItems1) {
            let wi2 = workItems2.find(w => w.id !== wi1.id);
            if (wi2) {
                // already handled above
                continue;
            }

            // OLD
            let nextSlide = await createFinalSlide(wi1);
            slides.push(nextSlide)
        }

        console.log("debug", snapShot2.workitems?.items)
        setGraph({
            debugWorkItems: workItems1,
            slides: slides,
        })

        let savedHuddleSession = await Db.upsertHuddleSession(huddleSession, p.session)
        if (!savedHuddleSession) {
            console.error("failed to upsert huddle session:", huddleSession)
        }
    }

    async function createNewSlide(wi2: Db.WorkItemSnapshot): Promise<HuddleSlide> {
        return ({
            type: "new",
            id: wi2.id,
            title: wi2.title,
            fieldChanges: []
        })
    }

    async function createFoundSlide(wi1: Db.WorkItemSnapshot, wi2: Db.WorkItemSnapshot): Promise<HuddleSlide> {
        let fieldChanges: HuddleSlideFieldChange[] = []
        if (wi1.title !== wi2.title) { fieldChanges.push({ what: "title", prev: wi1.title, next: wi2.title }) }
        // hasChanges = hasChanges || (wi1.priority !== wi2.priority) // TODO: priority should be based on position of snapshot in huddle session, not the raw value

        if (fieldChanges.length > 0) {
            return ({
                type: "update",
                id: wi2.id,
                title: wi2.title,
                fieldChanges: fieldChanges
            })
        } else {
            return ({
                type: "same",
                id: wi2.id,
                title: wi2.title,
                fieldChanges: []
            })
        }
    }

    async function createFinalSlide(wi1: Db.WorkItemSnapshot): Promise<HuddleSlide> {
        // TODO: has changes or not)
        return ({
            type: "final",
            id: wi1.id,
            title: wi1.title,
            fieldChanges: []
        })
    }

    async function getSnapshot(query: Db.HuddleWorkItemQuery, asOf: number | null, session: Azdo.Session): Promise<Db.HuddleSessionSnapshot> {
        let workItemsResult = await Db.queryHuddleWorkItems(query, asOf, session)
        console.log("getSnapshot: workitems result:", workItemsResult)

        if (!workItemsResult.workItems) {
            console.error("getSnapshot: no work items result") // TODO: bug?
            return {
                workitems: {
                    items: []
                }
            }
        }

        let items: Db.WorkItemSnapshot[] = []
        for (const wi of workItemsResult.workItems) {
            let wid = wi.id
            if (!wid) { continue; } // TODO: error
            let wi2 = await Azdo.getWorkItem(wid, null, p.session)
            console.log("getSnapshot: work item", wid, wi2)
            items.push({
                id: wid,
                title: wi2.fields?.['System.Title'] || "",
                priority: wi2.fields?.['Microsoft.VSTS.Common.Priority'] || Number.MAX_SAFE_INTEGER,
            })
        }

        // TODO: produce snapshot
        return {
            workitems: {
                items: items
            }
        }
    }

    async function poll() {
        console.log("HuddleSessionPage poll");
    }

    function debugSlides() {
        let slides = graph?.slides;
        if (!slides) { return <></> }
        return slides.map((s, i) => {
            return (
                <Card>
                    <div className="flex-column">
                        <Header
                            title={`${s.type} Slide #${i}  ${s.id} - ${s.title}`}
                            titleSize={TitleSize.Small}
                        />
                        {
                            (s.fieldChanges) && (
                                s.fieldChanges.map(fc => {
                                    return (
                                        <div>
                                            {fc.what} - {fc.prev} - {fc.next}
                                        </div>
                                    )
                                })
                            )
                        }
                    </div>
                </Card>
            )
        })
    }

    return (
        <Page>
            <Header
                title={"TODO: Huddle Session"}
                titleSize={TitleSize.Large}
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
            />
            <div className="page-content page-content-top">
                <Card>
                    <div className="flex-column">
                        <Header
                            title={`Session: ${p.huddleSessionId} - CREATED?`}
                            titleSize={TitleSize.Medium}
                        />
                        {
                            (p.previousHuddleSessionId &&
                                (
                                    <Header
                                        title={`Previous: ${p.previousHuddleSessionId} - CREATED?`}
                                        titleSize={TitleSize.Medium}
                                    />
                                )
                            )
                        }
                    </div>
                </Card>
                <hr />
                {debugSlides()}
            </div>
        </Page>
    )
}

export interface HuddleSessionPageProps {
    huddleId: string
    huddleSessionId: string
    previousHuddleSessionId?: string
    appNav: AppNav;
    database: Db.Database;
    session: Azdo.Session;
}

export default HuddleSessionPage