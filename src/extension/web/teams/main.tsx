import ReactDOM from 'react-dom'
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import * as SDK from 'azure-devops-extension-sdk';
import App from './index.tsx'
import type { AppProps, AppSingleton } from './index.tsx'


console.log("sublinear home main loading");

const appSingleton: AppSingleton = {};

SDK.init();

let render = (p: AppProps) => {
  console.log("render", p);
  ReactDOM.render(
    <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
      <App appToken={p.appToken} bearerToken={p.bearerToken} singleton={appSingleton} />
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
