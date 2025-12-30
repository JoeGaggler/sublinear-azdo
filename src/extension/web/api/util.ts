import { type IButtonProps } from "azure-devops-ui/Button";
import type { AppNav } from "../home/app";

export function uuid(prefix: string): string {
    let tail = self.crypto.randomUUID();
    if (prefix && prefix.length > 0) {
        return `${prefix}_${tail}`;
    }
    return tail
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
