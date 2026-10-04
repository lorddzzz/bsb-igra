import { useEffect, useMemo, useState } from 'react'
import type { Backend } from '../backend'
import type { GameId } from '../game/types'
import { GAMES } from '../games'
import { gamesOf, records, SCORED, totals } from '../history/logic'
import { HISTORY_PATH } from '../history/record'
import type { HistoryGame } from '../history/types'
import { Button, PlayerTag, Waiting } from '../ui/components'

const gameOf = (id: GameId) => GAMES.find((g) => g.id === id) ?? GAMES[0]

/** Serbian noun forms: 1 pobeda, 2 pobede, 5 pobeda (and 11 to 14 take the last form). */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return one
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few
  return many
}

function day(at: number): string {
  if (!at) return ''
  const d = new Date(at)
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}.`
}

/** Wins, points and titles across every game ever played, counted by player name. */
export function Tabela({ be, onBack }: { be: Backend; onBack: () => void }) {
  const [games, setGames] = useState<HistoryGame[] | null>(null)
  const [error, setError] = useState(false)
  const [only, setOnly] = useState<GameId | undefined>()

  useEffect(
    () =>
      be.listen(
        HISTORY_PATH,
        (v) => setGames(gamesOf(v)),
        () => setError(true),
      ),
    [be],
  )

  const shown = useMemo(() => (games ?? []).filter((g) => !only || g.game === only), [games, only])
  const table = useMemo(() => totals(shown), [shown])
  const titles = useMemo(() => records(table, only), [table, only])
  const withPoints = only && SCORED.includes(only)

  return (
    <section className="screen tabela">
      <h1 className="title">🏆 Tabela svih vremena</h1>
      <div className="tabela-filter" role="radiogroup" aria-label="Igra">
        <button role="radio" aria-checked={!only} className={!only ? 'on' : ''} onClick={() => setOnly(undefined)}>
          Sve igre
        </button>
        {GAMES.map((g) => (
          <button key={g.id} role="radio" aria-checked={only === g.id} className={only === g.id ? 'on' : ''} onClick={() => setOnly(g.id)}>
            {g.icon} {g.name}
          </button>
        ))}
      </div>

      {error ? (
        <div className="card center">
          <h2>Tabela još nije uključena</h2>
          <p className="muted">Server još ne dozvoljava čuvanje partija. Javi Dušanu.</p>
        </div>
      ) : !games ? (
        <Waiting>Učitavanje tabele</Waiting>
      ) : !shown.length ? (
        <div className="card center">
          <h2>Još nema partija</h2>
          <p className="muted">Svaka partija koja se odigra do kraja upisuje se ovde, po imenu igrača.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h2>Šampioni</h2>
            <ol className="tabela-list">
              {table.map((t, i) => (
                <li key={t.key}>
                  <span className="tabela-rank">{i === 0 && t.wins ? '👑' : i + 1}</span>
                  <PlayerTag player={{ name: t.name, badge: t.badge ?? '', joinedAt: 0 }} />
                  <span className="tabela-num">
                    <b>{t.wins}</b>
                    <small>
                      {plural(t.wins, 'pobeda', 'pobede', 'pobeda')} · {t.games} {plural(t.games, 'partija', 'partije', 'partija')}
                      {withPoints && ` · ${t.points} ${plural(t.points, 'poen', 'poena', 'poena')}`}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {titles.length > 0 && (
            <div className="card">
              <h2>Titule</h2>
              <ul className="tabela-titles">
                {titles.map(({ record, value, holders }) => (
                  <li key={record.stat}>
                    <span className="tabela-title-icon">{record.icon}</span>
                    <span>
                      <b>{record.title}</b>
                      <small>
                        {holders.map((h) => h.name).join(', ')}: {value} {record.text}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <h2>Poslednje partije</h2>
            <ul className="tabela-recent">
              {shown
                .slice(-8)
                .reverse()
                .map((g, i) => {
                  const won = g.players.filter((p) => p.won).map((p) => p.name)
                  return (
                    <li key={`${g.at}-${i}`}>
                      <span className="tabela-title-icon">{gameOf(g.game).icon}</span>
                      <span>
                        <b>{gameOf(g.game).name}</b> <small className="muted">{day(g.at)}</small>
                        <small>{won.length ? `Pobeda: ${won.join(', ')}` : 'Nerešeno'}</small>
                      </span>
                    </li>
                  )
                })}
            </ul>
          </div>
          <p className="version-note">Ukupno partija: {shown.length}. Broji se po imenu, pa su Dule, dule i Dulé isti igrač.</p>
        </>
      )}
      <Button variant="ghost" onClick={onBack}>
        Nazad
      </Button>
    </section>
  )
}
