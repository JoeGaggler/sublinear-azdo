import { useState } from 'react'
import { Card } from "azure-devops-ui/Card";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import React from "react";
import * as Azdo from '../api/azdo.ts';

function App(p: AppProps) {
  const [sessionInfo, setSessionInfo] = useState<Azdo.SessionInfo>(p.sessionInfo);
  const [route, setRoute] = useState<AppRoute>({ view: "loading" })

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
    const nav = await Azdo.getNavService();
    const query = await nav.getQueryParams();
    const hash = await nav.getHash();
    console.log("init: ", query, hash);
    setRoute({ view: "home" }); // TODO: route via query/hash

    setInterval(() => { setPollHack(Math.random()); }, 1000);
  }

  async function poll() {
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
            commandBarItems={commmandBarItems} />
          <div className="page-content page-content-top">
            <Card>TODO: Teams</Card>
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
