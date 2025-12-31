import React, { useState } from 'react'
import { Card } from "azure-devops-ui/Card";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import * as Azdo from '../api/azdo.ts';
import * as db from '../api/db.ts';
import HomePage from './HomePage.tsx';
import HuddlesHomePage from './HuddlesHomePage.tsx';
import { makeHeaderBackButtonProps } from '../api/util.ts';
import HuddlePage from './HuddlePage.tsx';

function App(p: AppProps) {
    // const [sessionInfo, setSessionInfo] = useState<Azdo.SessionInfo>(p.sessionInfo);
    const [route, setRoute] = useState<AppRoute>({ view: "loading", data: "" })
    const [database, setDatabase] = useState<db.Database>(db.makeDatabase());
    const sessionRef = React.useRef<Azdo.SessionInfo>(p.sessionInfo)

    async function navTo(route: AppRoute) {
        console.log("nav: to", route);
        let nav = await Azdo.getNavService();
        if (route.title) {
            nav.setDocumentTitle(route.title);
        }
        // if (route.hash || route.hash === "") {
        //     nav.setHash(route.hash);
        // }
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

    // initialize the app
    React.useEffect(() => {
        const interval_id = setInterval(() => { poll(); }, 1000);
        return () => { clearInterval(interval_id); };
    }, []);
    React.useEffect(() => { init(); return; }, []);
    async function init() {
        let memDoc = await db.loadMembers(database, sessionRef.current);
        if (memDoc) {
            setDatabase({ ...database });
        } else {
            console.error("init: failed to load members document");
        }

        let myself = await db.loadMyself(database, sessionRef.current);
        if (myself) {
            console.log("init: myself", database.myself);
            setDatabase({ ...database });
        }

        const nav = await Azdo.getNavService();
        const query = await nav.getQueryParams();
        const hash = await nav.getHash();
        console.log("init: nav params", query, hash);
        setRoute({
            view: "home",
            data: "",
            title: "Home - Sublinear",
        }); // TODO: route via query/hash
    }

    async function poll() {
        // refresh session info 
        if (Date.now() > sessionRef.current.refreshAfter) {
            console.log("poll: refresh token", sessionRef.current.refreshAfter);
            let newSessionInfo = await Azdo.refreshSessionInfo();
            if (!newSessionInfo) {
                console.error("poll: refresh token failed");
            } else {
                sessionRef.current = newSessionInfo
                // setSessionInfo(newSessionInfo);
                console.log("poll: refreshed token", newSessionInfo);
            }
        }

        // refresh myself
        if (!database.myself) {
            let myself = await db.loadMyself(database, sessionRef.current);
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
                    />
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
                    sessionInfo={sessionRef.current}
                />
            )
        }
        case "huddles": {
            return (
                <HuddlesHomePage
                    appNav={createAppNav(route)}
                    database={database}
                    sessionInfo={sessionRef.current}
                />
            )
        }
        case "huddle": {
            let huddle = route.data
            if (!huddle) {
                console.error("Invalid data for huddle:", route.data)
                navTo({
                    view: "error",
                    data: "Invalid data for huddle",
                    back: route.back,
                });
                return <></>
            }
            return (
                <HuddlePage
                    appNav={createAppNav(route)}
                    database={database}
                    sessionInfo={sessionRef.current}
                    id={huddle}
                />
            )
        }
        case "error": {
            let bbProps: any | undefined = (route) ? makeHeaderBackButtonProps(createAppNav(route)) : undefined // HACK: any
            let message = route.data || "no error message"
            return (
                <Page>
                    <Header
                        title={"Error"}
                        titleSize={TitleSize.Large}
                        backButtonProps={bbProps} />
                    <div className="page-content page-content-top">
                        <Card>{message}</Card>
                    </div>
                </Page>
            )
        }
        default: {
            let bbProps: any | undefined = (route) ? makeHeaderBackButtonProps(createAppNav(route)) : undefined // HACK: any
            return (
                <Page>
                    <Header
                        title={"Error"}
                        titleSize={TitleSize.Large}
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
    // hash?: string;
    data?: any;
    title?: string;
    back?: AppRoute;
}

export interface AppNav {
    current: AppRoute;
    navTo(route: AppRoute): Promise<void>;
}

export default App
