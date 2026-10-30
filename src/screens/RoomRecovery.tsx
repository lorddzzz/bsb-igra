import { useEffect, useState } from 'react'
import type { Backend } from '../backend'
import type { RoomView } from '../game/room'
import { hostOffline, takeOverHost } from '../game/recovery'
import { Button } from '../ui/components'

/** Common recovery controls, inherited by every game without changing its rules. */
export function RoomRecovery({ be, code, view }: { be: Backend; code: string; view: RoomView }) {
  const [now, setNow] = useState(() => be.serverNow())
  const [message, setMessage] = useState('')
  useEffect(() => {
    const timer = setInterval(() => setNow(be.serverNow()), 1000)
    return () => clearInterval(timer)
  }, [be])
  const pub = view.pub!
  const missing = Object.entries(pub.players ?? {}).filter(([uid]) => uid !== be.uid && typeof view.online[uid] === 'number')
  if (!missing.length) return null
  const canTakeOver = pub.hostUid !== be.uid && hostOffline(view.online, pub.hostUid, now)
  return <div className="card" role="status">
    <h2>Čekamo pojačanje</h2>
    <p>Van veze: {missing.map(([, player]) => player.name).join(', ')}.</p>
    <p className="muted">Neka otvore istu sobu. Ako neko ne može da se vrati, napravite novu sobu; njegovi potezi ostaju na čekanju.</p>
    {canTakeOver && <Button variant="ghost" onClick={async () => {
      const ok = await takeOverHost(be, code, pub.hostUid)
      setMessage(ok ? 'Ti si sada domaćin.' : 'Domaćin se vratio ili je neko već preuzeo. Proveri sobu.')
    }}>Preuzmi ulogu domaćina</Button>}
    {message && <p>{message}</p>}
  </div>
}
