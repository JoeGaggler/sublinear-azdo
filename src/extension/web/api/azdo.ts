
import * as SDK from 'azure-devops-extension-sdk';
import {
    type IExtensionDataService,
    type IHostNavigationService,
} from 'azure-devops-extension-api';

export async function restGet(url: string, bearertoken: string): Promise<any> {
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${bearertoken}`,
            "Content-Type": "application/json",
            "X-Bearer": bearertoken,
        }
    });
    if (response.ok) {
        const data = await response.json();
        const ctok = response.headers.get("x-ms-continuationtoken");
        if (ctok) {
            console.log("Continuation token:", ctok);
        }
        // console.log(data);
        return data;
    } else {
        console.log("Error fetching azdo data", response.statusText);
    }
}

//
// Session
//

export interface SessionInfo {
    isValid: boolean;
    bearerToken: string;
    appToken: string;
    refreshAfter: number;
    organization: string;
}

export const zeroSessionInfo: SessionInfo =
{
    isValid: false,
    bearerToken: "",
    appToken: "",
    refreshAfter: 0,
    organization: "",
};

export async function refreshSessionInfo(): Promise<SessionInfo | null> {
    try {
        let bearerToken = await SDK.getAccessToken();
        let appToken = await SDK.getAppToken();
        let host = SDK.getHost()
        console.log("Host:", host);

        let seconds = 60;
        return {
            isValid: true,
            bearerToken: bearerToken,
            appToken: appToken,
            refreshAfter: Date.now() + (1000 * seconds),
            organization: host.name,
        };
    }
    catch (err) {
        console.error("Error refreshing session info", err);
        return null;
    }
}

//
// Connection Data
//

export interface ConnectionData {
    authenticatedUser: {
        id: string;
        customDisplayName: string;
    }
}

export async function getConnectionData(session: SessionInfo): Promise<ConnectionData | null> {
    let data = await restGet(`https://dev.azure.com/${session.organization}/_apis/connectionData?api-version=7.1-preview.1`, session.bearerToken);
    console.log("getConnectionData: ", data);
    return data;
}

//
// Services
//

export async function getNavService(): Promise<IHostNavigationService> { return await SDK.getService<IHostNavigationService>("ms.vss-features.host-navigation-service"); }

//
// Shared Document APIs
//

export interface StoredDocument {
    id: string;
    __etag?: number;
}

export async function getSharedDocument<T extends StoredDocument>(colId: string, docId: string, accessToken: string): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
    try {
        const doc = await dataManager.getDocument(colId, docId);
        console.log("get doc (shared): ", colId, docId, doc);
        return doc as T;
    }
    catch {
        console.warn("get doc (shared): ", colId, docId, null);
        return null;
    }
}

export async function newSharedDocument<T extends StoredDocument>(colId: string, document: T, accessToken: string): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
    try {
        const newdoc = await dataManager.createDocument(colId, document);
        console.log("new doc (shared): ", colId, document.id, newdoc);
        return newdoc;
    }
    catch {
        console.warn("new doc (shared): ", colId, document.id, null);
        return null;
    }
}

export async function editSharedDocument<T extends StoredDocument>(colId: string, document: T, accessToken: string): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
    try {
        const newdoc = await dataManager.updateDocument(colId, document);
        console.log("edit doc (shared): ", colId, document.id, newdoc);
        return newdoc as T;
    }
    catch {
        console.warn("edit doc (shared): ", colId, document.id, null);
        return null;
    }
}

export async function upsertSharedDocument<T extends StoredDocument>(colId: string, document: T, accessToken: string): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
    try {
        const newdoc = await dataManager.setDocument(colId, document);
        console.log("upsert doc (shared): ", colId, document.id, newdoc);
        return newdoc as T;
    }
    catch {
        console.warn("upsert doc (shared): ", colId, document.id, null);
        return null;
    }
}

export async function deleteSharedDocument(colId: string, docId: string, accessToken: string): Promise<boolean> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, accessToken);
    try {
        await dataManager.deleteDocument(colId, docId);
        console.log("delete doc (shared): ", colId, docId, true);
        return true;
    }
    catch {
        console.warn("delete doc (shared): ", colId, docId, false);
        return false;
    }
}
