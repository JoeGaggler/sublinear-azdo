import * as Azdo from '../api/azdo.ts';
import * as Db from '../api/db.ts';
import * as Util from '../api/util.ts';
import type { AppNav } from './app.tsx';

import React from 'react'

import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
// import { Button } from "azure-devops-ui/Button";

function HuddleSessionPage(p: HuddleSessionPageProps) {
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
            let wi2 = await Azdo.getWorkItem(wid, "System.Title", p.session)
            console.log("getSnapshot: work item", wid, wi2)
            items.push({
                id: wid,
                title: wi2.fields?.['System.Title'] || ""
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