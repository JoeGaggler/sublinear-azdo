import * as Azdo from "./azdo";
import type { StoredDocument } from "./azdo";
import { spliceWhere } from "./util";

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
export const huddle_session_collection_id = "huddle_session";

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
}

export interface HuddleSessionListStoredDocument extends StoredDocument {
    items: HuddleSessionListItem[]
}

export interface HuddleSessionListItem {
    id: string
    created: number
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
    if (!spliceWhere(doc.huddleInfos.items, i => i.id === data.id)) {
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
        huddle_session_collection_id,
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
    let savedHuddle = await Azdo.upsertSharedDocument(huddle_session_collection_id, data, session)
    if (!savedHuddle) {
        console.error("upsertHuddleSessionList: upsert huddle failed")
        return null;
    }
    return savedHuddle;
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