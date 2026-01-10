import * as React from 'react'
import { Panel } from "azure-devops-ui/Panel";
import { TitleSize } from 'azure-devops-ui/Header';

export interface TargetDatePanelProps {
    onDismiss: () => void;
}

function TargetDatePanel(props: React.PropsWithChildren<TargetDatePanelProps>) {

    return <Panel
        onDismiss={props.onDismiss}
        titleProps={
            {
                text: "Target Date",
                iconProps: {
                    iconName: "Circle"
                },
                size: TitleSize.Medium,
                className: undefined,
                id: undefined,
            }
        }
        description={undefined}
        footerButtonProps={[
            { text: "Close", onClick: () => { props.onDismiss() }, primary: false, },
        ]}
    >
        <div className="flex-column">
            {props.children || <></>}
        </div>
    </Panel>
}

export default TargetDatePanel