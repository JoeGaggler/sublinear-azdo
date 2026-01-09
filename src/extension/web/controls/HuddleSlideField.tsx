import * as React from 'react'

export interface HuddleSlideFieldProps {
    name?: string
    className?: string
    contentClassName?: string
}

function HuddleSlideField(props: React.PropsWithChildren<HuddleSlideFieldProps>) {
    if (!props) return <></>
    return (
        <div className={`flex-row flex-baseline rhythm-horizontal-4 ${props.className || ""}`}>
            <div className='secondary-text'>{props.name}:</div>
            <div className={props.contentClassName}>{props.children}</div>
        </div>
    )
}

export default HuddleSlideField;