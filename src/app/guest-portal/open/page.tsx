import type { Metadata } from 'next'
import { GuestPortalBootstrap } from '@/components/GuestPortalBootstrap'

export const metadata:Metadata={title:'Open private guest access',robots:{index:false,follow:false,nocache:true}}

export default function OpenGuestPortal(){return <GuestPortalBootstrap/>}
