import { type IButtonProps } from "azure-devops-ui/Button";
import type { AppNav } from "../home/app";

export function uuid(): string { return self.crypto.randomUUID(); }

export function makeHeaderBackButtonProps(appNav: AppNav): IButtonProps | undefined {
    const backTo = appNav.current.back;
    if (!backTo) {
        console.warn("makeHeaderBackButtonProps: no backTo for", appNav.current.view);
        return undefined;
    }

    console.log("makeHeaderBackButtonProps: from/to", appNav.current.view, backTo.view);
    return {
        onClick: () => {
            appNav.navTo(backTo);
        },
    };
}