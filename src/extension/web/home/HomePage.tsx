import * as Azdo from '../api/azdo.ts';
import type { AppNav } from './app.tsx';
import type { Database } from '../api/db.ts';

import React, { useState } from 'react'

import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Button } from "azure-devops-ui/Button";

function HomePage(p: HomePageProps) {
    const [_sessionInfo, _setSessionInfo] = useState<Azdo.SessionInfo>(p.sessionInfo);

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    if (!p) { console.warn("No props in HomePage"); }

    React.useEffect(() => { init() }, []);
    async function init() {
        console.log("HomePage init");

        const interval_id = setInterval(() => { setPollHack(Math.random()); }, 1000);
        return () => { clearInterval(interval_id); };
    }

    async function poll() {
        console.log("HomePage poll");
    }

    async function showHuddlesPage() {
        await p.appNav.navTo({ view: "huddles", back: p.appNav.current });
    }

    return (
        <Page>
            <Header
                title={"Home Page"}
                titleSize={TitleSize.Large} />
            <div className="page-content page-content-top">
                <Card>
                    <div className="flex-column">
                        <Button
                            text={"Show Huddles"}
                            onClick={() => showHuddlesPage()}
                        />
                    </div>
                </Card>
            </div>
        </Page>
    )
}

export interface HomePageProps {
    appNav: AppNav;
    database: Database;
    sessionInfo: Azdo.SessionInfo;
}

export default HomePage