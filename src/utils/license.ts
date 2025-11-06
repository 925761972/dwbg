export type LicenseState = {
  pro: boolean
  trialExpireAt?: number
}

const KEY = 'dwbg:license'

function read(): LicenseState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { pro: false }
    const obj = JSON.parse(raw)
    return { pro: !!obj.pro, trialExpireAt: obj.trialExpireAt }
  } catch {
    return { pro: false }
  }
}

function write(state: LicenseState) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function isPro(): boolean {
  const s = read()
  if (s.pro) return true
  if (s.trialExpireAt && Date.now() < s.trialExpireAt) return true
  return false
}

export function getTrialRemainingDays(): number {
  const s = read()
  if (!s.trialExpireAt) return 0
  const ms = s.trialExpireAt - Date.now()
  return ms > 0 ? Math.ceil(ms / 86400000) : 0
}

export function activatePro() {
  const s = read()
  s.pro = true
  s.trialExpireAt = undefined
  write(s)
}

export function startTrial(days = 3) {
  const s = read()
  s.pro = false
  s.trialExpireAt = Date.now() + days * 86400000
  write(s)
}

export function revoke() {
  write({ pro: false })
}