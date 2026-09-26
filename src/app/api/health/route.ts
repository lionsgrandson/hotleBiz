export const dynamic='force-dynamic'
export async function GET(){
  return Response.json({ok:true,service:'guestatlas',time:new Date().toISOString()},{headers:{'cache-control':'no-store, max-age=0'}})
}
