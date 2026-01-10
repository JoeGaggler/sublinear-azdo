import { Icon, IconSize } from "azure-devops-ui/Icon"

export interface FieldChangeProps {
    prev: string
    next: string
}

function FieldChange(props: FieldChangeProps) {
    return (
        <div className='flex-row flex-center rhythm-horizontal-8'>
            <div className='font-weight-normal secondary-text'>{props.prev}</div>
            <div className='flex-row font-weight-heavy'><Icon iconName={"Forward"} size={IconSize.medium} /></div>
            <div className='font-weight-semibold'>{props.next}</div>
        </div>
    )
}

export default FieldChange