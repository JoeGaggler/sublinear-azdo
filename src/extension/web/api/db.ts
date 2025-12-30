import * as Azdo from "./azdo";
import type { StoredDocument } from "./azdo";

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

export interface MainMembersStoredDocument extends StoredDocument {
    members: Members;
}

//
// Database schema
//

export function makeDatabase(): Database {
    return {
        members: { items: [] },

        huddleInfos: { items: [] },
        huddles: [],
    };
}

export interface Database {
    myself?: Myself;
    members: Members;
    huddleInfos: HuddleInfos;

    huddles: Huddle[]
}

export interface Myself {
    id: string;
    displayName: string;
}

export interface Members {
    items: Member[];
}

export interface Member {
    id: string;
    displayName: string;
    timestamp: number;
}

//
// Huddles
//

export interface MainHuddlesStoredDocument extends StoredDocument {
    huddleInfos: HuddleInfos;
}

export interface HuddleInfos {
    items: HuddleInfo[];
}

export interface HuddleInfo {
    id: string;
    name: string;
}

export interface HuddleStoredDocument extends StoredDocument {
    data: Huddle;
}

export interface Huddle {
    id: string;
    name: string;
    isReady: boolean
}

export function makeEmptyHuddlesStoredDocument(): MainHuddlesStoredDocument {
    return {
        id: main_huddles_document_id,
        huddleInfos: {
            items: []
        }
    }
}

export function syncHuddleInfos(db: Database): ((d: MainHuddlesStoredDocument) => void) {
    return (d: MainHuddlesStoredDocument) => {
        db.huddleInfos = d.huddleInfos
    };
}

export async function loadHuddleInfos(db: Database, session: Azdo.SessionInfo): Promise<HuddleInfos | null> {
    let empty = makeEmptyHuddlesStoredDocument();
    let doc = await Azdo.getOrCreateSharedDocument<MainHuddlesStoredDocument>(
        main_collection_id,
        main_huddles_document_id,
        empty,
        syncHuddleInfos(db),
        session);
    if (!doc) {
        console.error("loadHuddles: failed")
        return null;
    }

    return doc.huddleInfos || empty.huddleInfos;
}

export async function newHuddle(data: HuddleInfo, db: Database, session: Azdo.SessionInfo): Promise<void> {
    let empty = makeEmptyHuddlesStoredDocument();
    let doc = await Azdo.getOrCreateSharedDocument<MainHuddlesStoredDocument>(
        main_collection_id,
        main_huddles_document_id,
        empty,
        syncHuddleInfos(db),
        session);
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

    db.huddleInfos = newDoc.huddleInfos;

    let empty2: HuddleStoredDocument = {
        id: data.id,
        data: {
            id: data.id,
            name: data.name,
            isReady: false,
        },
    }
    let huddle: Huddle | undefined
    let doc2 = await Azdo.getOrCreateSharedDocument<HuddleStoredDocument>(
        huddle_collection_id,
        data.id,
        empty2,
        (d) => { huddle = d.data },
        session
    );
    if (!doc2) {
        console.error("newHuddle: save failed")
        return;
    }
    if (!huddle) {
        console.error("newHuddle: setter failed")
        return;
    }

    let huddles = db.huddles
    if (!huddles) {
        huddles = db.huddles = []
    }

    let idx2 = huddles.findIndex((h) => h.id === data.id);
    if (idx2 !== -1) {
        huddles.splice(idx2, 1, huddle)
    }

    return;
}

export async function deleteHuddle(data: HuddleInfo, db: Database, session: Azdo.SessionInfo): Promise<void> {
    let empty = makeEmptyHuddlesStoredDocument();
    let doc = await Azdo.getOrCreateSharedDocument<MainHuddlesStoredDocument>(
        main_collection_id,
        main_huddles_document_id,
        empty,
        syncHuddleInfos(db),
        session);
    if (!doc) {
        console.error("deleteHuddle: failed to get document")
        return;
    }

    let items = doc.huddleInfos?.items
    if (!items) {
        console.error("deleteHuddle: failed to get document items")
        return;
    }

    let idx = items.findIndex((i) => i.id === data.id)
    if (idx === -1) { return }

    let rem = items.splice(idx, 1);
    if (!rem || rem.length < 1) { return; }

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

    db.huddleInfos = newDoc.huddleInfos;
    return;
}

// 
// Myself functions
//

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