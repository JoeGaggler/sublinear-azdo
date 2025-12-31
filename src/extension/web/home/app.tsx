import React, { useState } from 'react'
import { Card } from "azure-devops-ui/Card";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
// import NewTeamPanel from '../controls/newteampanel.tsx';
import * as Azdo from '../api/azdo.ts';
import * as db from '../api/db.ts';
import HomePage from './HomePage.tsx';
import HuddlesHomePage from './HuddlesHomePage.tsx';
import { makeHeaderBackButtonProps } from '../api/util.ts';

function App(p: AppProps) {
    const [sessionInfo, setSessionInfo] = useState<Azdo.SessionInfo>(p.sessionInfo);
    const [route, setRoute] = useState<AppRoute>({ view: "loading", hash: "" })
    const [database, setDatabase] = useState<db.Database>(db.makeDatabase());

    // HACK: force rerendering for server sync
    const [pollHack, setPollHack] = React.useState(Math.random());
    React.useEffect(() => { poll(); }, [pollHack]);

    async function navTo(route: AppRoute) {
        console.log("nav: to", route);
        let nav = await Azdo.getNavService();
        if (route.title) {
            nav.setDocumentTitle(route.title);
        }
        if (route.hash || route.hash === "") {
            nav.setHash(route.hash);
        }
        setRoute(route);
    }

    function createAppNav(route: AppRoute): AppNav {
        return {
            current: route,
            navTo: async (route: AppRoute) => {
                await navTo(route);
            },
        };
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
        let memDoc = await db.loadMembers(database, sessionInfo);
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
        setRoute({ view: "home", hash: "" }); // TODO: route via query/hash

        const interval_id = setInterval(() => { setPollHack(Math.random()); }, 1000);
        return () => { clearInterval(interval_id); };
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
                <HomePage
                    appNav={createAppNav(route)}
                    database={database}
                    sessionInfo={sessionInfo}
                />
            )
        }
        case "huddles": {
            return (
                <HuddlesHomePage
                    appNav={createAppNav(route)}
                    database={database}
                    sessionInfo={sessionInfo}
                />
            )
        }
        default: {
            let bbProps: any | undefined = (route) ? makeHeaderBackButtonProps(createAppNav(route)) : undefined // HACK: any
            return (
                <Page>
                    <Header
                        title={"Error"}
                        titleSize={TitleSize.Large}
                        commandBarItems={commmandBarItems}
                        backButtonProps={bbProps} />
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
    back?: AppRoute;
}

export interface AppNav {
    current: AppRoute;
    navTo(route: AppRoute): Promise<void>;
}

export default App
