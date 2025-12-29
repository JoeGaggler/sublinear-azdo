import * as Azdo from "./azdo";
import type { StoredDocument } from "./azdo";

// collection of top level documents
export const main_collection_id = "main";
export const main_members_document_id = "members";

// collection of each member
export const members_collection_id = "members";


export interface MainMembersStoredDocument extends StoredDocument {
    members: Members;
}

//
// Database schema
//

export function makeDatabase(): Database {
    return {
        members: {
            items: []
        }
    };
}

export interface Database {
    members: Members;
}

export interface Members {
    items: Member[];
}

export interface Member {
    id: string;
    displayName: string;
    timestamp: number;
}

///
/// Member functions
///

export async function loadMembers(accessToken: string): Promise<MainMembersStoredDocument | null> {
    let membersDoc = await Azdo.getSharedDocument<MainMembersStoredDocument>(
        main_collection_id,
        main_members_document_id,
        accessToken
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
            accessToken
        )
        if (!newMembersDoc) {
            console.error("upsertMember: failed to create document");
            return null;
        }
        membersDoc = newMembersDoc;
    }

    console.log("loadMembers: loaded", membersDoc);
    return membersDoc;
}

export async function upsertMember(member: Member, accessToken: string): Promise<MainMembersStoredDocument | null> {
    let membersDoc = await loadMembers(accessToken);
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
        if (next.displayName != prev.displayName) { changed = true; }
        if (next.timestamp != prev.timestamp) { changed = true; }
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
        accessToken
    )
    if (!newMembersDoc) {
        console.error("upsertMember: failed to edit document");
        return null;
    }

    return membersDoc;
}