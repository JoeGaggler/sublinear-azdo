import * as Azdo from "./azdo";
import type { StoredDocument } from "./azdo";
import * as Util from "./util";

// collection of top level documents
export const main_collection_id = "main";
export const main_members_document_id = "members";
export const main_huddles_document_id = "huddles";

// collection of each member
export const members_collection_id = "members";

// collection for personal user data
export const my_collection_id = "mine";
export const my_connectiondata_document_id = "connection_data";

// collection of each huddle
export const huddle_collection_id = "huddle";

// collection of each huddle session
export const huddle_session_list_collection_id = "huddle_session_list";


export const huddle_session_collection_id2 = "huddle_session";

//
// Database schema
//

export function makeDatabase(): Database {
    return {
        members: { items: [] },
    };
}

export interface Database {
    myself?: Myself;
    members: Members;
}

//
// Huddles
//

export interface HuddleListStoredDocument extends StoredDocument {
    huddleInfos: HuddleItems;
}

export interface HuddleItems {
    items: HuddleItem[];
}

export interface HuddleItem {
    id: string;
    name: string;
}

export interface HuddleStoredDocument extends StoredDocument {
    name: string;
    workItemQuery?: HuddleWorkItemQuery
}

export interface HuddleWorkItemQuery {
    areaPath: string
    asOf?: number
    includeSubAreas?: boolean
    workItemTypes?: string
}

export interface HuddleSessionListStoredDocument extends StoredDocument {
    items: HuddleSessionListItem[]
}

export interface HuddleSessionListItem {
    id: string
    created: number
}

export interface HuddleSessionStoredDocument extends StoredDocument {
    created?: number
    snapshot?: HuddleSessionSnapshot
}

export interface HuddleSessionSnapshot {
    workitems?: WorkItemsSnapshot;
}

export interface WorkItemsSnapshot {
    items: WorkItemSnapshot[]
}

export interface WorkItemSnapshot {
    id: number
    title: string
    priority: number

    state?: string
    reason?: string
    areaPath?: string
    iterationPath?: string
    description?: string
    workItemType?: string
    tags?: string
    backlogPriority?: number
    startDate?: string
    targetDate?: string
    parent?: number

    // TODO
    comments?: WorkItemSnapshotComment[]
}

export interface WorkItemSnapshotComment {
    content: string
}

export function syncing<S, T>(source: S[], target: T[], equals: (s: S, t: T) => boolean, removing: (t: T) => void, create: (from: S) => T): void {
    for (let t of target) {
        if (source.every(s => !equals(s, t))) {
            console.warn("REMOVING FROM TARGET:", t)
            removing(t)
        }
    }

    for (let s of source) {
        if (target.every(t => !equals(s, t))) {
            console.warn("ADDING TO TARGET:", s)
            target.push(create(s))
        }
    }
}

export async function getHuddleDocument(id: string, session: Azdo.Session): Promise<HuddleStoredDocument | null> {
    let savedHuddle = await Azdo.getSharedDocument<HuddleStoredDocument>(huddle_collection_id, id, session)
    if (!savedHuddle) {
        console.error("getHuddleDocument: get failed")
        return null;
    }
    return savedHuddle;
}

export async function requireHuddleListStoredDocument(session: Azdo.Session): Promise<HuddleListStoredDocument> {
    let doc = await Azdo.getSharedDocument<HuddleListStoredDocument>(
        main_collection_id,
        main_huddles_document_id,
        session);
    if (!doc) {
        console.error("loadHuddles: missing")
        doc = {
            id: main_huddles_document_id,
            huddleInfos: {
                items: []
            }
        }
    }

    return doc;
}

export async function deleteHuddle(data: HuddleItem, session: Azdo.Session): Promise<HuddleListStoredDocument | null> {
    let doc = await requireHuddleListStoredDocument(session);
    if (!doc) {
        console.error("deleteHuddle: failed to get document")
        return null;
    }

    if (!doc.huddleInfos?.items) {
        console.error("deleteHuddle: failed to get document items")
        return null;
    }
    if (!Util.spliceWhere(doc.huddleInfos.items, i => i.id === data.id)) {
        console.error("deleteHuddle: not in doc?")
    }

    let newDoc = await Azdo.editSharedDocument(
        main_collection_id,
        doc,
        session);
    if (!newDoc) {
        console.error("deleteHuddle: failed to edit document")
        return null;
    }

    let deleted = await Azdo.deleteSharedDocument(huddle_collection_id, data.id, session);
    if (!deleted) {
        console.error("deleteHuddle: failed to delete item document")
        // fallthrough
    }

    return newDoc;
}

interface UpsertHuddleResult {
    item: HuddleStoredDocument,
    list: HuddleListStoredDocument,
    info: HuddleItem,
}

export async function refreshHuddle(data: HuddleStoredDocument, session: Azdo.Session): Promise<HuddleStoredDocument | null> {
    let savedHuddle = await Azdo.getSharedDocument<HuddleStoredDocument>(huddle_collection_id, data.id, session)
    if (!savedHuddle) {
        console.error("upsertHuddle: upsert huddle failed")
        return null;
    }
    return savedHuddle;
}

export async function upsertHuddle(data: HuddleStoredDocument, session: Azdo.Session): Promise<UpsertHuddleResult | null> {
    let savedHuddle = await Azdo.upsertSharedDocument(huddle_collection_id, data, session)
    if (!savedHuddle) {
        console.error("upsertHuddle: upsert huddle failed")
        return null;
    }

    // NOW UPDATE THE LIST

    let nextHuddleInfo: HuddleItem = {
        id: data.id,
        name: data.name,
    }

    let prevHuddles = await requireHuddleListStoredDocument(session);

    let idx = prevHuddles.huddleInfos.items.findIndex(h => h.id === data.id)
    if (idx != -1) {
        prevHuddles.huddleInfos.items.splice(idx, 1, nextHuddleInfo)
    } else {
        prevHuddles.huddleInfos.items.push(nextHuddleInfo)
    }

    let savedHuddles = await Azdo.upsertSharedDocument(main_collection_id, prevHuddles, session)
    if (!savedHuddles) {
        console.error("newHuddle: upsert huddles failed")
        return null;
    }

    return {
        item: savedHuddle,
        list: savedHuddles,
        info: nextHuddleInfo,
    }
}

export async function requireHuddleSessionListStoredDocument(huddle: HuddleStoredDocument, session: Azdo.Session): Promise<HuddleSessionListStoredDocument> {
    let doc = await Azdo.getSharedDocument<HuddleSessionListStoredDocument>(
        huddle_session_list_collection_id,
        huddle.id,
        session);
    if (!doc) {
        console.error("requireHuddleSessionListStoredDocument: missing")
        doc = {
            id: huddle.id,
            items: []
        }
    }
    return doc;
}

export async function upsertHuddleSessionList(data: HuddleSessionListStoredDocument, session: Azdo.Session): Promise<HuddleSessionListStoredDocument | null> {
    let savedHuddle = await Azdo.upsertSharedDocument(huddle_session_list_collection_id, data, session)
    if (!savedHuddle) {
        console.error("upsertHuddleSessionList: upsert huddle failed")
        return null;
    }
    return savedHuddle;
}

export async function requireHuddleSessionStoredDocument(id: string, session: Azdo.Session): Promise<HuddleSessionStoredDocument> {
    let doc = await Azdo.getSharedDocument<HuddleSessionStoredDocument>(
        huddle_session_collection_id2,
        id,
        session);
    if (!doc) {
        console.error("requireHuddleSessionStoredDocument: missing")
        doc = {
            id: id,
        }
    }
    return doc;
}

export async function upsertHuddleSession(data: HuddleSessionStoredDocument, session: Azdo.Session): Promise<HuddleSessionStoredDocument | null> {
    let savedHuddleSession = await Azdo.upsertSharedDocument(huddle_session_collection_id2, data, session)
    if (!savedHuddleSession) {
        console.error("upsertHuddleSession: upsert huddle failed")
        return null;
    }

    return savedHuddleSession

    // TODO: UPDATE THE LIST?

    // let nextHuddleInfo: HuddleItem = {
    //     id: data.id,
    //     name: data.name,
    // }

    // let prevHuddles = await requireHuddleListStoredDocument(session);

    // let idx = prevHuddles.huddleInfos.items.findIndex(h => h.id === data.id)
    // if (idx != -1) {
    //     prevHuddles.huddleInfos.items.splice(idx, 1, nextHuddleInfo)
    // } else {
    //     prevHuddles.huddleInfos.items.push(nextHuddleInfo)
    // }

    // let savedHuddles = await Azdo.upsertSharedDocument(main_collection_id, prevHuddles, session)
    // if (!savedHuddles) {
    //     console.error("newHuddle: upsert huddles failed")
    //     return null;
    // }

    // return {
    //     item: savedHuddle,
    //     list: savedHuddles,
    //     info: nextHuddleInfo,
    // }
}

export async function queryHuddleWorkItems(query: HuddleWorkItemQuery, asOf: number | null, session: Azdo.Session): Promise<Azdo.QueryWorkItemsResult> {
    // POST https://dev.azure.com/{organization}/{project}/{team}/_apis/wit/wiql?timePrecision={timePrecision}&$top={$top}&api-version=7.2-preview.2
    let url = `https://dev.azure.com/${session.organization}/${session.project}/${session.team}/_apis/wit/wiql?timePrecision=false&$top=1000&api-version=7.2-preview.2`

    // query: "Select [System.Id], [System.Title], [System.State] From WorkItems Where [System.WorkItemType] <> 'FOO' AND [State] <> 'FOO' order by [Microsoft.VSTS.Common.Priority] asc, [System.CreatedDate] desc ASOF '2026-01-01T02:00:00Z'"
    let selectString = "SELECT [System.Id] FROM WorkItems"
    let asOfString = (asOf) ? `ASOF '${Util.msecToISO(asOf)}'` : ""
    let orderString = "ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.CreatedDate] DESC"
    let whereString = `WHERE [System.TeamProject] = '${session.projectName}' AND [System.State] <> 'Done' AND [System.State] <> 'Removed'`

    if (query.workItemTypes) {
        let workItemTypeString = query.workItemTypes // ` 'Product Backlog Item', 'Initiative', 'Feature', 'Epic', 'Issue', 'Task' `
        whereString += ` AND [System.WorkItemType] IN (${workItemTypeString})`
    }

    if (query.areaPath) {
        let op = "="
        if (query.includeSubAreas == true) { op = "UNDER" }
        whereString += ` AND [System.AreaPath] ${op} '${query.areaPath}'`
    }

    // let wiqlQuery = `${selectString}  ${whereString}  ${orderString}  ${asOfString}`
    let wiqlDebug = `${selectString}\n${whereString}\n${orderString}\n${asOfString}`
    console.log("WIQL", wiqlDebug, asOf)

    let body = {
        query: wiqlDebug
    }

    let response = await Azdo.restPost(url, body, session.bearerToken) as Azdo.QueryWorkItemsResult
    console.log("queryHuddleWorkItems:", response)
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

// 
// Myself functions
//

export interface Myself {
    id: string;
    displayName: string;
}

export async function loadMyself(db: Database, session: Azdo.Session): Promise<Myself | null> {
    let data = await Azdo.getConnectionData(session);
    if (!data) { return null; }

    let actualUser = data.authenticatedUser;
    let myself: Myself = {
        id: actualUser.id,
        displayName: actualUser.customDisplayName
    };
    db.myself = myself;
    return myself;
}

///
/// Member functions
///

export interface Members {
    items: Member[];
}

export interface Member {
    id: string;
    displayName: string;
    timestamp: number;
}

export interface MainMembersStoredDocument extends StoredDocument {
    members: Members;
}

export async function loadMembers(db: Database, session: Azdo.Session): Promise<MainMembersStoredDocument | null> {
    let membersDoc = await Azdo.getSharedDocument<MainMembersStoredDocument>(
        main_collection_id,
        main_members_document_id,
        session
    );
    if (!membersDoc) {
        console.warn("loadMembers: failed to obtain document");
        membersDoc = {
            id: main_members_document_id,
            members: {
                items: []
            }
        }

        let newMembersDoc = await Azdo.newSharedDocument(
            main_collection_id,
            membersDoc,
            session
        )
        if (!newMembersDoc) {
            console.error("upsertMember: failed to create document");
            return null;
        }
        membersDoc = newMembersDoc;
    }

    console.log("loadMembers: loaded", membersDoc);
    db.members = membersDoc.members;
    return membersDoc;
}

export async function upsertMember(db: Database, member: Member, session: Azdo.Session): Promise<MainMembersStoredDocument | null> {
    let membersDoc = await loadMembers(db, session);
    if (!membersDoc) {
        console.warn("upsertMember: failed to obtain document");
        return null;
    }

    let i = membersDoc.members.items.findIndex((m) => m.id === member.id);
    if (i !== -1) {
        let prev = membersDoc.members.items[i];
        let next = member;
        console.log("upsertMember: found member", prev);

        let changed = false;
        if (next.displayName != prev.displayName) { changed = true; console.log("upsertMember: displayName changed", prev.displayName, next.displayName); }
        if (next.timestamp != prev.timestamp) { changed = true; console.log("upsertMember: timestamp changed", prev.timestamp, next.timestamp); }
        if (!changed) { return membersDoc; }

        membersDoc.members.items[i] = next;
    } else {
        console.log("upsertMember: adding new member", member);
        // TODO: create user document!
        membersDoc.members.items.push(member);
    }

    let newMembersDoc = await Azdo.editSharedDocument(
        main_collection_id,
        membersDoc,
        session
    )
    if (!newMembersDoc) {
        console.error("upsertMember: failed to edit document");
        return null;
    }

    db.members = newMembersDoc.members;
    return newMembersDoc;
}

export async function deleteMember(db: Database, memberId: string, session: Azdo.Session): Promise<MainMembersStoredDocument | null> {
    let membersDoc = await loadMembers(db, session);
    if (!membersDoc) {
        console.warn("deleteMember: failed to obtain document");
        return null;
    }

    let i = membersDoc.members.items.findIndex((m) => m.id === memberId);
    if (i === -1) {
        console.log("deleteMember: member not found", memberId);
        return membersDoc;
    }

    console.log("deleteMember: deleting member", membersDoc.members.items[i]);
    membersDoc.members.items.splice(i, 1);

    let newMembersDoc = await Azdo.editSharedDocument(
        main_collection_id,
        membersDoc,
        session
    )
    if (!newMembersDoc) {
        console.error("deleteMember: failed to edit document");
        return null;
    }

    db.members = newMembersDoc.members;
    return newMembersDoc;
}