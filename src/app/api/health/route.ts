import { ok } from '@/lib/http'
export async function GET(){return ok({ok:true,service:'guestatlas',time:new Date().toISOString()})}
