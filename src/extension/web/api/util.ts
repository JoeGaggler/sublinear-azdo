import { type IButtonProps } from "azure-devops-ui/Button";
import type { AppNav } from "../home/app";

export function uuid(prefix: string): string {
    let tail = self.crypto.randomUUID();
    if (prefix && prefix.length > 0) {
        return `${prefix}_${tail}`;
    }
    return tail
}

export function spliceWhere<T>(items: T[], predicate: (t: T) => boolean): boolean {
    console.warn("SPLICEWHERE", items);
    let idx = items.findIndex((i) => predicate(i))
    if (idx === -1) { return false }

    let rem = items.splice(idx, 1);
    if (!rem || rem.length < 1) { return false; }
    console.warn("SPLICED", rem)

    return spliceWhere(items, predicate) || true; // always return true
}

export function makeHeaderBackButtonProps(appNav: AppNav): IButtonProps | undefined {
    const backTo = appNav.current.back;
    if (!backTo) {
        return undefined;
    }

    return {
        onClick: () => {
            appNav.navTo(backTo);
        },
    };
}
