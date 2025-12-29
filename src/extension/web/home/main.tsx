import ReactDOM from 'react-dom'
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import * as SDK from 'azure-devops-extension-sdk';
// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import type { AppProps, AppSingleton } from './App.tsx'

// createRoot(document.getElementById('extension_root_div')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

console.log("pingmint menu is loading");

const appSingleton: AppSingleton = {
    // repositoryFilterDropdownMultiSelection: new DropdownMultiSelection()
};

SDK.init();

let render = (p: AppProps) => {
    console.log("render", p);
    ReactDOM.render(
        <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
            {/* <App appToken={p.appToken} bearerToken={p.bearerToken} singleton={appSingleton} /> */}
            <App />
        </SurfaceContext.Provider>,
        document.getElementById('extension_root_div')
    );
}

let refreshMs = 1000 * 60 * 5; // 5 minutes

let refreshToken = () => {
    console.log("refreshToken");
    SDK.getAccessToken().then((token) => {
        console.log("Refreshed token", token);
        render({ bearerToken: token, appToken: "TODO_REFRESH_APP_TOKEN", singleton: appSingleton });
        setTimeout(refreshToken, refreshMs);
    }).catch((err) => {
        console.error("Error getting access token", err);
    });
}

SDK.ready().then(() => {
    console.log("SDK is ready");
    SDK.getAppToken().then((a) => {
        console.log("AppToken is ready");
        console.log(a);
        SDK.getAccessToken().then((b) => {
            console.log("BearerToken is ready");
            console.log(b);

            let conf = SDK.getConfiguration();
            console.log("conf", conf);
            render({ bearerToken: b, appToken: a, singleton: appSingleton });
            SDK.notifyLoadSucceeded();

            setTimeout(refreshToken, refreshMs);
        });
    });
});
