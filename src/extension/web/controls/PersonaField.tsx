import * as React from 'react'
import { VssPersona } from 'azure-devops-ui/VssPersona'

export interface PersonaFieldProps {
    name?: string
    imageUrl?: string
}

function PersonaField(props: PersonaFieldProps) {
    let propsRef = React.useRef<PersonaFieldProps>()
    propsRef.current = props

    let idProv = React.useRef({
        getDisplayName() { return propsRef.current?.name || "Unknown User"; },
        getIdentityImageUrl(_size: number) { return propsRef.current?.imageUrl || undefined; }
    })

    return (
        <div className='flex-row flex-baseline rhythm-horizontal-4'>
            {props.imageUrl && (<VssPersona size={"small"} identityDetailsProvider={idProv.current} className='flex-self-center' />)}
            <div>
                {props.name}
            </div>
        </div>
    )
}

export default PersonaField;