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

export interface MainMembersStoredDocument extends StoredDocument {
    members: Members;
}

//
// Database schema
//

export function makeDatabase(): Database {
    return {
        members: { items: [] },
        huddles: { items: [] }
    };
}

export interface Database {
    myself?: Myself;
    members: Members;
    huddles: Huddles;
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
    huddles: Huddles;
}

export interface Huddles {
    items: Huddle[]
}

export interface Huddle {
    name: string
}

export function makeEmptyHuddlesStoredDocument(): MainHuddlesStoredDocument {
    return {
        id: main_huddles_document_id,
        huddles: {
            items: []
        }
    }
}

export function syncHuddles(db: Database): ((d: MainHuddlesStoredDocument) => void) {
    return (d: MainHuddlesStoredDocument) => {
        db.huddles = d.huddles
    };
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