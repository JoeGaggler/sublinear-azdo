import * as Azdo from '../api/azdo.ts';
import type { AppNav } from './app.tsx';

import React from 'react'

import { Card } from "azure-devops-ui/Card";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Button } from "azure-devops-ui/Button";

function HomePage(p: HomePageProps) {
    React.useEffect(() => {
        const interval_id = setInterval(() => { poll(); }, 1000);
        return () => { clearInterval(interval_id); };
    }, []);

    async function poll() {
        console.log("HomePage poll");
    }

    async function showHuddlesPage() {
        await p.appNav.navTo({
            view: "huddles",
            title: "Huddles",
            back: p.appNav.current,
        });
    }

    async function purgeAllDocuments() {
        Azdo.purgeAllDocuments(p.sessionInfo);
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
                        <Button
                            text={"Purge"}
                            danger={true}
                            onClick={() => purgeAllDocuments()}
                        />
                    </div>
                </Card>
            </div>
        </Page>
    )
}

export interface HomePageProps {
    appNav: AppNav;
    sessionInfo: Azdo.SessionInfo;
}

export default HomePage