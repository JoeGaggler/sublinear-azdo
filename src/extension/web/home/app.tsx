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
        setRoute({ view: "home", data: "" }); // TODO: route via query/hash
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

    async function onChangeHuddle(doc: db.HuddleStoredDocument) {
        // TODO
        console.warn("TODO: onChangeHuddle", doc)

        //     let prevInfosDoc = await Azdo.getSharedDocument<HuddleInfosStoredDocument>(
        //         main_collection_id,
        //         main_huddles_document_id,
        //         session);
        //     if (!prevInfosDoc) {
        //         console.error("editHuddle: failed to get main_huddles_document_id")
        //         return null;
        //     }

        //     let prevHuddleInfo = prevInfosDoc.huddleInfos.items.find(v => v.id === doc.id)
        //     if (!prevHuddleInfo) {
        //         console.error("editHuddle: failed to find huddle info")
        //         return null;
        //     }

        //     let didChangeHuddleInfo = false
        //     if (prevHuddleInfo.name !== doc.name) { didChangeHuddleInfo = true; prevHuddleInfo.name = doc.name }

        //     if (didChangeHuddleInfo) {
        //         let nextInfosDoc = await Azdo.editSharedDocument(
        //             main_collection_id,
        //             prevInfosDoc,
        //             session
        //         )
        //         if (!nextInfosDoc) {
        //             console.error("editHuddle: failed to save huddle info")
        //             return null;
        //         }
        //     }

        //     let prevDoc = await Azdo.getSharedDocument<HuddleStoredDocument>(
        //         huddle_collection_id,
        //         doc.id,
        //         session);
        //     if (!prevDoc) {
        //         console.error("editHuddle: failed to get huddle doc")
        //         return null;
        //     }

        //     let didChangeHuddle = didChangeHuddleInfo
        //     if (doc.workItemQuery?.areaPath !== prevDoc.workItemQuery?.areaPath) { didChangeHuddle = true }

        //     if (didChangeHuddle) {
        //         let nextDoc = await Azdo.editSharedDocument<HuddleStoredDocument>(
        //             huddle_collection_id,
        //             doc,
        //             session);
        //         if (!nextDoc) {
        //             console.error("editHuddle: failed")
        //             return null;
        //         }
        //         return nextDoc;
        //     } else {
        //         return prevDoc;
        //     }
    }

    async function onChangeHuddles(doc: db.HuddleInfosStoredDocument) {
        // TODO
        console.warn("TODO: onChangeHuddles", doc)
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
                    onChange={onChangeHuddles}
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
                    onChange={onChangeHuddle}
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
