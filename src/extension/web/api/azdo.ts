
import * as SDK from 'azure-devops-extension-sdk';
import {
    type IExtensionDataService,
    type IHostNavigationService,
} from 'azure-devops-extension-api';
import { main_collection_id } from './db';

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

export async function restPost(url: string, body: any, bearertoken: string): Promise<any> {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${bearertoken}`,
            "Content-Type": "application/json",
            "X-Bearer": bearertoken,
        },
        body: JSON.stringify(body)
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
// Work Items
//

export interface QueryWorkItemsResult {
    queryType?: string;
    queryResultType?: string;
    asOf?: string;
    workItems?: QueryWorkItemsWorkItem[]
}

export interface QueryWorkItemsWorkItem {
    id?: number
    url?: string
}

export async function queryWorkItems(session: Session) {
    // POST https://dev.azure.com/{organization}/{project}/{team}/_apis/wit/wiql?timePrecision={timePrecision}&$top={$top}&api-version=7.2-preview.2
    let url = `https://dev.azure.com/${session.organization}/${session.project}/${session.team}/_apis/wit/wiql?timePrecision=false&$top=101&api-version=7.2-preview.2`

    let body = {
        query: "Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] <> 'FOO' AND [State] <> 'FOO' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc ASOF '2026-01-01T02:00:00Z'"
    }

    let response = await restPost(url, body, session.bearerToken) as QueryWorkItemsResult
    console.log("queryWorkItems:", response)
    return response

    // let wi1 = response.workItems?.[0]
    // console.log("queryWorkItems 1:", wi1?.id, wi1?.url)

    // let r1 = await getWorkItemRevisions(3, session)
    // console.log("r1", r1.count, r1)
    // let r2 = r1.value[0].fields?.['System.ChangedDate']
    // console.log("r2", r2)
    // let r3 = new Date(r2!)
    // console.log("r3", r3, r3.getTime(), r3.getTime(), new Date(r3.getTime()))
    // console.log("r3s", new Date(r3.getTime()).toUTCString(), new Date(r3.getTime()).toISOString())
}

export interface AzdoResult<T> {
    count: number
    value: T[]
}

export interface GetWorkItemRevisionsValue {
    id?: number,
    rev?: number,
    fields?: WorkItemFields
}

export interface WorkItemFields {
    "System.Id"?: number
    "System.Rev"?: number
    "System.State"?: string
    "System.ChangedDate"?: string
}

export async function getWorkItemRevisions(id: number, session: Session) {
    //GET https://dev.azure.com/{organization}/{project}/_apis/wit/workItems/{id}/revisions?$top={$top}&$skip={$skip}&$expand={$expand}&api-version=7.1
    let url = `https://dev.azure.com/${session.organization}/${session.project}/_apis/wit/workItems/${id}/revisions?$expand=all&api-version=7.1`
    let response = await restGet(url, session.bearerToken) as QueryWorkItemsResult
    console.log("queryWorkItems:", response)
    return response as AzdoResult<GetWorkItemRevisionsValue>
}

//
// Session
//

export interface Session {
    isValid: boolean;
    bearerToken: string;
    appToken: string;
    refreshAfter: number;
    organization: string;
    team: string;
    project: string;
}

export async function refreshSessionInfo(): Promise<Session | null> {
    try {
        let bearerToken = await SDK.getAccessToken();
        let appToken = await SDK.getAppToken();
        let host = SDK.getHost()
        console.log("Host:", host);

        let team = SDK.getTeamContext()
        console.log("Team:", team)

        let web = SDK.getWebContext()
        console.log("Web:", web)

        let seconds = 60;
        return {
            isValid: true,
            bearerToken: bearerToken,
            appToken: appToken,
            refreshAfter: Date.now() + (1000 * seconds),
            organization: host.name,
            team: team.id,
            project: web.project.id,
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

export async function getConnectionData(session: Session): Promise<ConnectionData | null> {
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

export async function getSharedDocument<T extends StoredDocument>(colId: string, docId: string, session: Session): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, session.bearerToken);
    try {
        const doc = await dataManager.getDocument(colId, docId);
        console.log("get doc (shared): ", colId, docId, doc);
        return doc as T;
    }
    catch (e) {
        console.warn("get doc (shared): ", colId, docId, e);
        return null;
    }
}

export async function newSharedDocument<T extends StoredDocument>(colId: string, document: T, session: Session): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, session.bearerToken);
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

export async function editSharedDocument<T extends StoredDocument>(colId: string, document: T, session: Session): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, session.bearerToken);
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

export async function upsertSharedDocument<T extends StoredDocument>(colId: string, document: T, session: Session): Promise<T | null> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, session.bearerToken);
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

export async function deleteSharedDocument(colId: string, docId: string, session: Session): Promise<boolean> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, session.bearerToken);
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

export async function purgeAllDocuments(session: Session): Promise<void> {
    const extDataService = await SDK.getService<IExtensionDataService>("ms.vss-features.extension-data-service");
    const dataManager = await extDataService.getExtensionDataManager(SDK.getExtensionContext().id, session.bearerToken);

    let x = await dataManager.getDocuments(main_collection_id);
    console.log("TODO: PURGE", x)
    for (let d of x) {
        deleteSharedDocument(main_collection_id, d.id, session)
    }
}
