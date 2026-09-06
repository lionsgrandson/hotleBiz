import { requireUser } from '@/lib/auth'
import { MfaGate } from '@/components/MfaGate'
export default async function MFA(){await requireUser();return <main className="loginPanel" style={{minHeight:'100vh'}}><MfaGate/></main>}
