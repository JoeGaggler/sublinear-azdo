import { type IButtonProps } from "azure-devops-ui/Button";
import type { AppNav } from "../home/app";

export function uuid(): string { return self.crypto.randomUUID(); }

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
