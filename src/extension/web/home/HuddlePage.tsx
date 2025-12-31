import { Page } from 'azure-devops-ui/Page';
import * as Azdo from '../api/azdo.ts';
// import * as Util from '../api/util.ts';
import * as Db from '../api/db.ts';
import type { AppNav } from './app.tsx';
import { Header, TitleSize } from 'azure-devops-ui/Header';
import * as Util from '../api/util.ts';
import { Card } from 'azure-devops-ui/Card';

import React from 'react'


function HuddlePage(p: HuddlePageProps) {
    const [huddleInfo, setHuddleInfo] = React.useState<Db.HuddleInfo>(p.huddleInfo)
    const [huddle, setHuddle] = React.useState<Db.HuddleStoredDocument | null>(null)

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    React.useEffect(() => { init() }, []);
    async function init() {
        console.log("HuddlePage init");
        
        let huddleInfo = await Db.getHuddleInfo(p.huddleInfo.id, p.sessionInfo);
        if (!huddleInfo) {
            console.log("HuddlePage: failed to load huddle info: ", p.huddleInfo.id)
            return
        }

        setHuddleInfo(huddleInfo)

        let huddle = await Db.getHuddle(huddleInfo, p.database, p.sessionInfo)
        if (!huddle) {
            console.log("HuddlePage: failed to load huddle: ", p.huddleInfo.id)
            return
        }

        setHuddle(huddle)

        const interval_id = setInterval(() => { setPollHack(Math.random()); }, 1000);
        return () => { clearInterval(interval_id); };
    }

    async function poll() {
        console.log("HuddlePage poll");
    }

    return (
        <Page>
            <Header
                title={huddleInfo.name}
                titleSize={TitleSize.Large}
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
            />
            {
                (huddle) && (
                    <div className="page-content page-content-top">
                        <Card>
                            <div className="flex-column">
                                {huddleInfo.id}
                            </div>
                        </Card>
                    </div>
                )
            }

        </Page>
    )
}

export interface HuddlePageProps {
    appNav: AppNav;
    database: Db.Database;
    sessionInfo: Azdo.SessionInfo;
    huddleInfo: Db.HuddleInfo;
}

export default HuddlePage;
