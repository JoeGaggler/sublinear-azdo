import * as SDK from 'azure-devops-extension-sdk';
import { type IExtensionDataService } from 'azure-devops-extension-api';

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
        return doc;
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
        return newdoc;
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
        return newdoc;
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
