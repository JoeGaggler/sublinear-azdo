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
    id: number
    title: string
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
        console.log("HuddleSessionPage: huddle session", huddleSession);

        let snapShot2 = huddleSession.snapshot
        if (!snapShot2) {
            let workItemQuery = huddle.workItemQuery
            if (!workItemQuery) {
                // TODO: fail
                console.error("HuddleSessionPage: missing work item query");
                return
            }

            snapShot2 = await getSnapshot(workItemQuery, p.session)
            huddleSession.snapshot = snapShot2
        }

        // TODO: previous work items
        let snapShot1: Db.HuddleSessionSnapshot;
        if (p.previousHuddleSessionId) {
            // TODO: fetch previous huddle session
            // TODO: fetch snapshot
            snapShot1 = {
                workitems: {
                    items: []
                }
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

        let slides: HuddleSlide[] = []
        for (let wi of snapShot2.workitems?.items || []) {
            slides.push({
                id: wi.id,
                title: wi.title,
            })
        }

        console.log("debug", snapShot2.workitems?.items)
        setGraph({
            debugWorkItems: snapShot2.workitems?.items || [],
            slides: slides,
        })
    }

    async function getSnapshot(query: Db.HuddleWorkItemQuery, session: Azdo.Session): Promise<Db.HuddleSessionSnapshot> {

        let workItemsResult = await Db.queryHuddleWorkItems(query, session)
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
            let fields = "System.Title,Microsoft.VSTS.Common.Priority"
            let wi2 = await Azdo.getWorkItem(wid, fields, p.session)
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

    function debugSnapshotCard() {
        if (!graph?.debugWorkItems) { return <></> }
        console.log("debug2", graph?.debugWorkItems)
        return (
            <Card>
                <div className="flex-column">
                    {
                        graph.debugWorkItems.map(s => {
                            return (
                                <Header
                                    title={`${s.id} - ${s.title} - ${s.priority}`}
                                    titleSize={TitleSize.Small}
                                />)
                        })
                    }
                </div>
            </Card>
        )
    }

    function debugSlides() {
        let slides = graph?.slides;
        if (!slides) { return <></> }
        return slides.map(s => {
            return (
                <Card>
                    <Header
                        title={`Slide ${s.id} - ${s.title}`}
                        titleSize={TitleSize.Small}
                    />
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
                        TODO: Huddle Session
                    </div>
                </Card>
                <hr />
                {debugSlides()}
                <hr />
                {debugSnapshotCard()}
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