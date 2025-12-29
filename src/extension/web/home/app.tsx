import { useState } from 'react'
import { Card } from "azure-devops-ui/Card";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import React from "react";
import * as SDK from 'azure-devops-extension-sdk';
import type { IHostNavigationService } from 'azure-devops-extension-api';
import * as Azdo from '../api/azdo.ts';

function App(p: AppProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  const _appToken = p.appToken
  if (!_appToken) {
    console.error("No app token provided");
  }

  async function blah() {
    await Azdo.getSharedDocument("a", "d", p.bearerToken);

    let x1 = await SDK.getService<IHostNavigationService>("ms.vss-features.host-navigation-service");
    x1.setQueryParams({ foo: "bar" });
    x1.setHash("myhashvalue");
    let x3 = await x1.getPageNavigationElements();
    console.log("Navigation page route:", x3);
    let x2 = await x1.getHash();
    console.log("Navigation hash:", x2);
    let x4 = await x1.getQueryParams();
    console.log("Navigation query params:", x4);
  }
  blah();

  const commmandBarItems = [
    {
      iconProps: {
        iconName: "Add"
      },
      id: "testCreate",
      important: true,
      onActivate: () => {
        alert("This would normally trigger a modal popup");
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
    setTimeout(() => {
      setIsLoaded(true);
    }, 3000);
  }

  if (!isLoaded) {
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
  } else {
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
}

export interface AppSingleton {
}

export interface AppProps {
  bearerToken: string;
  appToken: string;
  singleton: AppSingleton;
}

export default App
