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
    const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
    const [title, setTitle] = React.useState<string>("Loading...");

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    React.useEffect(() => { init() }, []);
    async function init() {
        console.log("HuddlePage init");

        let huddleInfo = await Db.getHuddleInfo(p.huddleId, p.database, p.sessionInfo);
        if (!huddleInfo) {
            console.log("HuddlePage: failed to load huddle info: ", p.huddleId)
            return
        }

        setTitle(huddleInfo.name)

        let huddle = await Db.getHuddle(huddleInfo, p.database, p.sessionInfo)
        if (!huddle) {
            console.log("HuddlePage: failed to load huddle: ", p.huddleId)
            return
        }

        setIsLoaded(true)

        const interval_id = setInterval(() => { setPollHack(Math.random()); }, 1000);
        return () => { clearInterval(interval_id); };
    }

    async function poll() {
        console.log("HuddlePage poll");
    }

    return (
        <Page>
            <Header
                title={title}
                titleSize={TitleSize.Large}
                backButtonProps={Util.makeHeaderBackButtonProps(p.appNav)}
            />
            {
                (isLoaded) && (
                    <div className="page-content page-content-top">
                        <Card>
                            <div className="flex-column">
                                {p.huddleId}
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
    huddleId: string;
}

export default HuddlePage;
