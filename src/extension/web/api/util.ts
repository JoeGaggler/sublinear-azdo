import { type IButtonProps } from "azure-devops-ui/Button";
import type { AppNav } from "../home/app";
import React from 'react'
import * as Luxon from 'luxon'


export function uuid(prefix: string): string {
    let tail = self.crypto.randomUUID();
    if (prefix && prefix.length > 0) {
        return `${prefix}_${tail}`;
    }
    return tail
}

export function msecNow(): number { return Date.now(); }
export function msecToDate(msec: number): Date { return new Date(msec); }
export function msecToISO(msec: number): string { return new Date(msec).toISOString(); }
export function msecToDateString(msec: number): string { return new Date(msec).toLocaleDateString(); }
export function msecToRelative(msec: number): string | null { return Luxon.DateTime.fromMillis(msec).toRelative() }
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

export interface Span {
    start: number
    length: number
}

export function chunk<T>(array: T[], size: number): Span[] {
    let spans: Span[] = []
    if (!array || array.length < 1) { return spans }

    let front = 0;
    while (true) {
        if (front == array.length) { break; }
        let end = front + size
        if (end > array.length) {
            end = array.length - front;
        }
        spans.push({
            start: front,
            length: end - front
        })
        front = end
    }
    return spans
}

export function useInterval(callback: Function, delay: number, on: boolean = true) {
    const savedCallback = React.useRef<Function>(callback)

    React.useEffect(() => { savedCallback.current = callback }, [callback])

    React.useEffect(() => {
        if (!on) { return; }
        function tick() { savedCallback.current() }
        let id = setInterval(tick, delay);
        return () => clearInterval(id);
    }, [on, delay])
}