import React from 'react'
import ReactDOM from 'react-dom'
import { Spacing, SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import * as SDK from 'azure-devops-extension-sdk';
import App, { type AppProps, type AppSingleton } from './app.tsx'
import * as Azdo from '../api/azdo.ts';

const appSingleton: AppSingleton = {};

SDK.init();

let render = (p: AppProps) => {
  console.log("render", p);
  ReactDOM.render(
    <React.StrictMode>
      <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral, spacing: Spacing.default }}>
        <App sessionInfo={p.sessionInfo} singleton={appSingleton} />
      </SurfaceContext.Provider>
    </React.StrictMode>,
    document.getElementById('extension_root_div')
  );
}

await SDK.ready();

let sessionInfo = await Azdo.refreshSessionInfo();
if (!sessionInfo) {
  throw new Error("Failed to get initial session info");
}
render({ sessionInfo: sessionInfo, singleton: appSingleton });

SDK.notifyLoadSucceeded();
