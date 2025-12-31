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

export interface HuddleInfosStoredDocument extends StoredDocument {
    huddleInfos: HuddleInfos;
}

export interface HuddleInfos {
    items: HuddleInfo[];
}

export interface HuddleInfo {
    id: string;
    name: string;
    isDeleted: boolean
}

export interface HuddleStoredDocument extends StoredDocument {
    name: string;
    workItemQuery?: HuddleWorkItemQuery
}

export interface HuddleWorkItemQuery {
    areaPath: string
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

export async function getMainHuddlesStoredDocument(session: Azdo.SessionInfo): Promise<HuddleInfosStoredDocument | null> {
    let empty: HuddleInfosStoredDocument = {
        id: main_huddles_document_id,
        huddleInfos: {
            items: []
        }
    }
    let doc = await Azdo.getOrCreateSharedDocument<HuddleInfosStoredDocument>(
        main_collection_id,
        main_huddles_document_id,
        empty,
        session);
    if (!doc) {
        console.error("loadHuddles: failed")
        return null;
    }

    // syncing(
    //     doc.huddleInfos.items,
    //     db.huddles.items,
    //     (s, t) => s.id === t.id,
    //     t => t.isDeleted = true,
    //     t => {
    //         return {
    //             id: t.id,
    //             name: t.name,
    //             isReady: false,
    //             isDeleted: false,
    //         }
    //     })

    return doc;
}

export async function newHuddleInfo(data: HuddleInfo, session: Azdo.SessionInfo): Promise<void> {
    let doc = await getMainHuddlesStoredDocument(session);
    if (!doc) {
        console.error("newHuddle: get failed")
        return;
    }

    if (!doc.huddleInfos) { doc.huddleInfos = { items: [] } }
    if (!doc.huddleInfos.items) { doc.huddleInfos.items = [] }

    doc.huddleInfos.items.push(data);

    let newDoc = await Azdo.editSharedDocument(main_collection_id, doc, session)
    if (!newDoc) {
        console.error("newHuddle: edit failed")
        return;
    }
}

export async function deleteHuddle(data: HuddleInfo, session: Azdo.SessionInfo): Promise<void> {
    let doc = await getMainHuddlesStoredDocument(session);
    if (!doc) {
        console.error("deleteHuddle: failed to get document")
        return;
    }

    if (!doc.huddleInfos?.items) {
        console.error("deleteHuddle: failed to get document items")
        return;
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
        return;
    }

    // TODO: cleanup orphaned record

    let deleted = await Azdo.deleteSharedDocument(
        huddle_collection_id,
        data.id,
        session
    );
    if (!deleted) {
        console.error("deleteHuddle: failed to delete item document")
        // fallthrough
    }
}

export async function getHuddleInfo(id: string, session: Azdo.SessionInfo): Promise<HuddleInfo | null> {
    let huddles = await getMainHuddlesStoredDocument(session);
    if (!huddles) {
        console.log("getHuddleInfo: failed to load huddles")
        return null
    }

    let huddle = huddles.huddleInfos.items.find(h => h.id === id);
    if (!huddle) {
        console.log("HuddlePage: failed to load huddle: ", id)
        return null
    }

    return huddle
}

export async function getHuddle(info: HuddleInfo, database: Database, session: Azdo.SessionInfo): Promise<HuddleStoredDocument | null> {
    let empty: HuddleStoredDocument = {
        id: main_huddles_document_id,
        name: info.name,
    }
    let doc = await Azdo.getOrCreateSharedDocument<HuddleStoredDocument>(
        huddle_collection_id,
        info.id,
        empty,
        session);
    if (!doc) {
        console.error("getHuddle: failed")
        return null;
    }

    if (!database) {
        console.error("getHuddle: no db")
        // TODO: sync?
    }

    return doc;
}

export async function editHuddle(doc: HuddleStoredDocument, session: Azdo.SessionInfo): Promise<HuddleStoredDocument | null> {
    let prevInfosDoc = await Azdo.getSharedDocument<HuddleInfosStoredDocument>(
        main_collection_id,
        main_huddles_document_id,
        session);
    if (!prevInfosDoc) {
        console.error("editHuddle: failed to get main_huddles_document_id")
        return null;
    }

    let prevHuddleInfo = prevInfosDoc.huddleInfos.items.find(v => v.id === doc.id)
    if (!prevHuddleInfo) {
        console.error("editHuddle: failed to find huddle info")
        return null;
    }

    let didChangeHuddleInfo = false
    if (prevHuddleInfo.name !== doc.name) { didChangeHuddleInfo = true; prevHuddleInfo.name = doc.name }

    if (didChangeHuddleInfo) {
        let nextInfosDoc = await Azdo.editSharedDocument(
            main_collection_id,
            prevInfosDoc,
            session
        )
        if (!nextInfosDoc) {
            console.error("editHuddle: failed to save huddle info")
            return null;
        }
    }

    let prevDoc = await Azdo.getSharedDocument<HuddleStoredDocument>(
        huddle_collection_id,
        doc.id,
        session);
    if (!prevDoc) {
        console.error("editHuddle: failed to get huddle doc")
        return null;
    }

    let didChangeHuddle = didChangeHuddleInfo
    if (doc.workItemQuery?.areaPath !== prevDoc.workItemQuery?.areaPath) { didChangeHuddle = true }

    if (didChangeHuddle) {
        let nextDoc = await Azdo.editSharedDocument<HuddleStoredDocument>(
            huddle_collection_id,
            doc,
            session);
        if (!nextDoc) {
            console.error("editHuddle: failed")
            return null;
        }
        return nextDoc;
    } else {
        return prevDoc;
    }
}

// 
// Myself functions
//

export interface Myself {
    id: string;
    displayName: string;
}

export async function loadMyself(db: Database, session: Azdo.SessionInfo): Promise<Myself | null> {
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

export async function loadMembers(db: Database, session: Azdo.SessionInfo): Promise<MainMembersStoredDocument | null> {
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

export async function upsertMember(db: Database, member: Member, session: Azdo.SessionInfo): Promise<MainMembersStoredDocument | null> {
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

export async function deleteMember(db: Database, memberId: string, session: Azdo.SessionInfo): Promise<MainMembersStoredDocument | null> {
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