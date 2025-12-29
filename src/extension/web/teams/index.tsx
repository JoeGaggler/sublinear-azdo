import { useState } from 'react'
import { Card } from "azure-devops-ui/Card";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import * as SDK from 'azure-devops-extension-sdk';
import type { IHostNavigationService } from 'azure-devops-extension-api';


function App(p: AppProps) {
  const [_count, _setCount] = useState(0)

  const _appToken = p.appToken
  if (!_appToken) {
    console.error("No app token provided");
  }

  async function blah() {
    let x1 = await SDK.getService<IHostNavigationService>("ms.vss-features.host-navigation-service");
    let x3 = await x1.getPageRoute();
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
      id: "newTeam",
      important: true,
      onActivate: () => {
        alert("This would normally trigger a modal popup");
      },
      text: "New Team",
      tooltipProps: {
        text: "Create a new team"
      },

    }
    // ,
    // {
    //   iconProps: {
    //     iconName: "Delete"
    //   },
    //   id: "testDelete",
    //   important: false,
    //   onActivate: () => {
    //     alert("submenu clicked");
    //   },
    //   text: "Menu row with delete icon"
    // }
  ];

  return (
    <Page>
      <Header
        title={"Teams"}
        titleSize={TitleSize.Large} 
        commandBarItems={commmandBarItems}/>
      <div className="page-content page-content-top">
        <Card>Page content</Card>
      </div>
    </Page>
  )
}

export interface AppSingleton {
}

export interface AppProps {
  bearerToken: string;
  appToken: string;
  singleton: AppSingleton;
}

export default App
