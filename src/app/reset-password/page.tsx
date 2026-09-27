import { updatePassword } from './actions'

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{error?:string}> }) {
  const p = await searchParams
  return <main className="loginPage"><section className="loginPanel"><div className="card loginBox">
    <span className="eyebrow">Account recovery</span><h2>Choose a new password</h2>
    {p.error && <p className="error">{p.error}</p>}
    <form><label>New password<input type="password" name="password" minLength={12} autoComplete="new-password" required/></label>
    <label>Confirm password<input type="password" name="confirm" minLength={12} autoComplete="new-password" required/></label>
    <button className="primary" formAction={updatePassword}>Update password</button></form>
  </div></section></main>
}
