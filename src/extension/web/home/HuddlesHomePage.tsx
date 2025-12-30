import * as Azdo from '../api/azdo.ts';
import { makeHeaderBackButtonProps } from '../api/util.ts';
import type { AppNav } from './app.tsx';

import React, { useState } from 'react'

import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Button } from 'azure-devops-ui/Components/Button/Button';

function HuddlesHomePage(p: HuddlesHomePageProps) {
    const [_sessionInfo, _setSessionInfo] = useState<Azdo.SessionInfo>(p.sessionInfo);

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    if (!p) { console.warn("No props in HomePage"); }

    React.useEffect(() => { init() }, []);
    async function init() {
        console.log("HuddlesHomePage init");

        const interval_id = setInterval(() => { setPollHack(Math.random()); }, 1000);
        return () => { clearInterval(interval_id); };
    }

    async function poll() {
        console.log("HuddlesHomePage poll");
    }

    async function showHuddlesPage() {
        await p.appNav.navTo({ view: "huddles", back: p.appNav.current });
    }

    return (
        <Page>
            <Header
                title={"Huddles Home Page"}
                titleSize={TitleSize.Large}
                backButtonProps={makeHeaderBackButtonProps(p.appNav)}
            />
            <div className="page-content page-content-top">
                <Card>
                    <div className="flex-column">
                        <div>Huddles Home Page - via {p.appNav.current.back?.view || "no_back"}</div>
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

export interface HuddlesHomePageProps {
    appNav: AppNav;
    sessionInfo: Azdo.SessionInfo;
}

export default HuddlesHomePage