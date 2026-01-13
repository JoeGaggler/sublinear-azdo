import type { WorkItemType } from '../api/azdo'
import { Icon } from 'azure-devops-ui/Icon'

export interface WorkItemTitleProps {
    id?: number
    text?: string
    type?: string
    allTypes?: WorkItemType[]
    iconSize?: number
    className?: string
}

function WorkItemTitle(props: WorkItemTitleProps) {
    if (!props.text) { return <></> }

    let availableWorkItemTypes = props.allTypes || []
    let workItemType = availableWorkItemTypes.find(i => props.type && i.name === props.type);
    let workItemIcon = workItemType && workItemType.icon
    let iconsSize = props.iconSize || 16

    return (
        <div className={`flex-row flex-center rhythm-horizontal-4 ${props.className || ""}`}>
            {
                workItemIcon && (
                    <Icon render={() => {
                        return <img src={workItemIcon.url} width={iconsSize} height={iconsSize} />
                    }} />
                )
            }
            {props.id && <div className="font-weight-semibold">{props.id}</div>}
            <div className="secondary-text text-ellipsis">{props.text}</div>
        </div>
    )
}

export default WorkItemTitle;