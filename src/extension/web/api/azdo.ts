
import * as SDK from 'azure-devops-extension-sdk';
import {
    type IExtensionDataService,
    type IHostNavigationService,
} from 'azure-devops-extension-api';

//
// Session
//

export interface SessionInfo {
    isValid: boolean;
    bearerToken: string;
    appToken: string;
    refreshAfter: number;
}

export const zeroSessionInfo: SessionInfo =
{
    isValid: false,
    bearerToken: "",
    appToken: "",
    refreshAfter: 0
};

export async function refreshSessionInfo(): Promise<SessionInfo | null> {
    try {
        let bearerToken = await SDK.getAccessToken();
        let appToken = await SDK.getAppToken();
        let conf = SDK.getConfiguration();
        if (conf) {
            console.log("conf:", conf);
        }

        let seconds = 60;
        return {
            isValid: true,
            bearerToken: bearerToken,
            appToken: appToken,
            refreshAfter: Date.now() + (1000 * seconds)
        };
    }
    catch (err) {
        console.error("Error refreshing session info", err);
        return null;
    }
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
