import * as React from 'react'
import { Link } from "azure-devops-ui/Link";

export interface HuddleSlideFieldProps {
    name?: string
    className?: string
    contentClassName?: string
    onClickHeading?: () => void
}

function HuddleSlideField(props: React.PropsWithChildren<HuddleSlideFieldProps>) {
    if (!props) return <></>
    return (
        <div className={`flex-row flex-baseline rhythm-horizontal-4 ${props.className || ""}`}>
            {
                props.onClickHeading === undefined && (
                    <div className='secondary-text'>{props.name}:</div>
                )
            }
            {
                props.onClickHeading !== undefined && (
                    <div className='secondary-text'>
                        <Link subtle={true} onClick={props.onClickHeading}>{props.name}:</Link>
                    </div>
                )
            }
            <div className={props.contentClassName}>{props.children}</div>
        </div>
    )
}

export default HuddleSlideField;