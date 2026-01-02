import { type IButtonProps } from "azure-devops-ui/Button";
import type { AppNav } from "../home/app";

export function uuid(prefix: string): string {
    let tail = self.crypto.randomUUID();
    if (prefix && prefix.length > 0) {
        return `${prefix}_${tail}`;
    }
    return tail
}

export function msecNow(): number { return Date.now(); }
export function msecToDate(msec: number) { return new Date(msec); }
export function msecFromISO(iso: string): number { return new Date(iso).getTime(); }

export function forEachReversed<T>(array: T[], iteration: (t: T) => void) {
    for (let i = array.length - 1; i >= 0; i--) {
        iteration(array[i])
    }
}

export function spliceWhere<T>(items: T[], predicate: (t: T) => boolean): boolean {
    let idx = items.findIndex((i) => predicate(i))
    if (idx === -1) { return false }

    let rem = items.splice(idx, 1);
    if (!rem || rem.length < 1) { return false; }

    // HACK: recursive
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
