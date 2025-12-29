import { useState } from 'react'
import { Card } from "azure-devops-ui/Card";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import { Button } from "azure-devops-ui/Button";
import { Panel } from "azure-devops-ui/Panel";
import NewTeamPanel from '../controls/newteampanel.tsx';
import React from "react";
import * as Azdo from '../api/azdo.ts';
import * as db from '../api/db.ts';

function App(p: AppProps) {
    const [sessionInfo, setSessionInfo] = useState<Azdo.SessionInfo>(p.sessionInfo);
    const [route, setRoute] = useState<AppRoute>({ view: "loading" })
    const [database, setDatabase] = useState<db.Database>(db.makeDatabase());
    const [showPanel, setShowPanel] = React.useState(false);

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    async function navTo(route: AppRoute) {
        console.log("nav: ", route);
        let nav = await Azdo.getNavService();
        if (route.title) {
            nav.setDocumentTitle(route.title);
        }
        if (route.hash) {
            nav.setHash(route.hash);
        }
        setRoute(route);
    }

    const commmandBarItems = [
        {
            iconProps: {
                iconName: "Add"
            },
            id: "testCreate",
            important: true,
            onActivate: () => {
                navTo({ view: "home", title: `sublinear - ${Math.random()}` });
            },
            text: "Action",
            tooltipProps: {
                text: "Custom tooltip for create"
            },

        },
        {
            iconProps: {
                iconName: "Delete"
            },
            id: "testDelete",
            important: false,
            onActivate: () => {
                alert("submenu clicked");
            },
            text: "Menu row with delete icon"
        }
    ];

    // initialize the app
    React.useEffect(() => { init() }, []);
    async function init() {
        let memDoc = await db.loadMembers(database, sessionInfo.bearerToken);
        if (memDoc) {
            setDatabase({ ...database });
        } else {
            console.error("init: failed to load members document");
        }

        let myself = await db.loadMyself(database, sessionInfo);
        if (myself) {
            console.log("init: myself", database.myself);
            setDatabase({ ...database });
        }

        const nav = await Azdo.getNavService();
        const query = await nav.getQueryParams();
        const hash = await nav.getHash();
        console.log("init: nav params", query, hash);
        setRoute({ view: "home" }); // TODO: route via query/hash

        setInterval(() => { setPollHack(Math.random()); }, 1000);
    }

    async function poll() {
        // refresh session info 
        if (Date.now() > sessionInfo.refreshAfter) {
            console.log("poll: refresh token", sessionInfo.refreshAfter);
            let newSessionInfo = await Azdo.refreshSessionInfo();
            if (!newSessionInfo) {
                console.error("poll: refresh token failed");
            } else {
                setSessionInfo(newSessionInfo);
                console.log("poll: refreshed token", newSessionInfo);
            }
        }

        // refresh myself
        if (!database.myself) {
            let myself = await db.loadMyself(database, sessionInfo);
            if (myself) {
                console.log("poll: myself", database.myself);
                setDatabase({ ...database });
            }
        }
    }

    switch (route.view) {
        case "loading": {
            return (
                <Page>
                    <Header
                        title={"Loading"}
                        titleSize={TitleSize.Large}
                        commandBarItems={commmandBarItems} />
                    <div className="page-content page-content-top">
                        <Card>Loading</Card>
                    </div>
                </Page>
            )
        }
        case "home": {
            return (
                <Page>
                    {
                        showPanel && (
                            <Panel
                                onDismiss={() => setShowPanel(false)}>
                                <div>
                                    <NewTeamPanel
                                        onCommit={
                                            async (code: string, name: string) => {
                                                console.log("New team:", code, name);
                                                setShowPanel(false);
                                            }
                                        }
                                        onDismiss={
                                            async () => setShowPanel(false)
                                        }
                                        initialCode="ORG"
                                        initialName="My Organization" />
                                </div>
                                <div>
                                    <Button onClick={() => setShowPanel(false)}>Close</Button>
                                </div>
                            </Panel>
                        )
                    }
                    <Header
                        title={"Sublinear"}
                        titleSize={TitleSize.Large}
                        commandBarItems={commmandBarItems} />
                    <div className="page-content page-content-top">
                        <Card>Page content</Card>
                    </div>

                    <Header
                        title={"Teams"}
                        titleSize={TitleSize.Large}
                        commandBarItems={[
                            {
                                iconProps: {
                                    iconName: "Add"
                                },
                                id: "addTeamButton",
                                important: true,
                                onActivate: () => {
                                    setShowPanel(true);
                                },
                                text: "Add",
                                tooltipProps: {
                                    text: "Add team"
                                },
                            }
                        ]} />
                    <div className="page-content page-content-top">
                        <Card>TODO: Teams</Card>
                    </div>

                    <Header
                        title={"Members"}
                        titleSize={TitleSize.Large}
                        commandBarItems={
                            [
                                {
                                    iconProps: {
                                        iconName: "Add"
                                    },
                                    id: "testCreate",
                                    important: true,
                                    onActivate: () => {
                                        console.log("add member");
                                        let uid = Math.floor(Math.random() * 1000);
                                        db.upsertMember(database, {
                                            id: `user_${uid}`,
                                            displayName: `User ${uid}`,
                                            timestamp: Date.now()
                                        }, sessionInfo.bearerToken).then((res) => {
                                            if (res) {
                                                console.log("upserted member", res);
                                            } else {
                                                console.error("failed to upsert member");
                                            }
                                            setDatabase({ ...database });
                                        })
                                    },
                                    text: "Add",
                                    tooltipProps: {
                                        text: "Add member"
                                    },
                                }
                            ]
                        } />
                    <div className="page-content page-content-top">
                        <Card>
                            <div className="flex-column">
                                <div>Count: {database.members.items.length}</div>
                                {
                                    database.members.items.map((m) => (
                                        <Header
                                            title={m.displayName}
                                            titleSize={TitleSize.Large}
                                            commandBarItems={
                                                [
                                                    {
                                                        iconProps: {
                                                            iconName: "Delete"
                                                        },
                                                        id: "testCreate",
                                                        important: true,
                                                        onActivate: () => {
                                                            console.log("delete member", m);
                                                            db.deleteMember(database, m.id, sessionInfo.bearerToken).then((res) => {
                                                                if (res) {
                                                                    console.log("deleted member", m);
                                                                    setDatabase({ ...database });
                                                                } else {
                                                                    console.error("failed to delete member", m);
                                                                }
                                                            })
                                                        },
                                                        text: "Delete",
                                                        tooltipProps: {
                                                            text: "Delete member"
                                                        },
                                                    }
                                                ]
                                            }
                                        />)
                                    )
                                }
                            </div>
                        </Card>
                    </div>
                </Page>
            )
        }
        default: {
            return (
                <Page>
                    <Header
                        title={"Error"}
                        titleSize={TitleSize.Large}
                        commandBarItems={commmandBarItems} />
                    <div className="page-content page-content-top">
                        <Card>Unknown view: {route.view}</Card>
                    </div>
                </Page>
            )
        }
    }
}

export interface AppSingleton {
}

export interface AppProps {
    sessionInfo: Azdo.SessionInfo;
    singleton: AppSingleton;
}

export interface AppRoute {
    view: string;
    hash?: string;
    title?: string;
}

export default App
