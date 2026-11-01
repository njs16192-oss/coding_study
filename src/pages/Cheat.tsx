import { notes } from '../data'
import { Card } from '../components/ui'

export default function CheatPage() {
  const nav = [
    ...notes.cheats.map((c) => ({ id: c.id, title: c.title })),
    ...(notes.tips ? [{ id: notes.tips.id, title: notes.tips.title }] : []),
    ...(notes.priority ? [{ id: notes.priority.id, title: notes.priority.title }] : []),
  ]
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
      <aside>
        <nav className="no-scrollbar sticky top-14 z-10 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-slate-50/95 px-4 py-2 backdrop-blur lg:top-20 lg:mx-0 lg:flex-col lg:bg-transparent lg:px-0 dark:bg-slate-950/95 lg:dark:bg-transparent">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => jump(n.id)}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-sm whitespace-nowrap lg:whitespace-normal lg:rounded-lg lg:border-0 lg:bg-transparent lg:px-2 lg:hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 lg:dark:bg-transparent lg:dark:hover:bg-slate-800"
            >
              {n.title}
            </button>
          ))}
        </nav>
      </aside>

      <div className="space-y-8">
        {notes.intro.length > 0 && <p className="text-sm text-slate-500">{notes.intro.join(' ')}</p>}
        {notes.cheats.map((s) => (
          <section key={s.id} id={s.id} className="scroll-mt-28 lg:scroll-mt-20">
            <h2 className="mb-3 text-lg font-bold">{s.title}</h2>
            <div className="space-y-4">
              {s.groups.map((g, gi) => (
                <Card key={gi} className="overflow-hidden">
                  {g.title && <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-sm font-semibold dark:border-slate-800 dark:bg-slate-800/40">{g.title}</h3>}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {g.rows.map((r, i) => (
                      <div key={i} className="grid gap-1 px-4 py-2.5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-4">
                        <div className="code-inline min-w-0" dangerouslySetInnerHTML={r.html ? { __html: r.html } : undefined}>
                          {r.html ? undefined : <pre>{r.code}</pre>}
                        </div>
                        {r.desc && <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">{r.desc}</p>}
                      </div>
                    ))}
                  </div>
                  {g.notes.length > 0 && (
                    <div className="space-y-1 border-t border-slate-100 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-900 dark:border-slate-800 dark:bg-amber-500/10 dark:text-amber-100">
                      {g.notes.map((n, i) => (
                        <p key={i}>{n}</p>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </section>
        ))}

        {notes.tips && (
          <section id={notes.tips.id} className="scroll-mt-28 lg:scroll-mt-20">
            <h2 className="mb-3 text-lg font-bold">{notes.tips.title}</h2>
            <Card className="divide-y divide-slate-100 dark:divide-slate-800">
              {notes.tips.items.map((t) => (
                <div key={t.id} className="px-4 py-3">
                  <p className="text-[15px] leading-7">{t.text}</p>
                  {t.detail.length > 0 && <pre className="mt-0.5 font-mono text-[13px] leading-6 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{t.detail.map((d) => d.trim()).join('\n')}</pre>}
                </div>
              ))}
            </Card>
          </section>
        )}

        {notes.priority && (
          <section id={notes.priority.id} className="scroll-mt-28 lg:scroll-mt-20">
            <h2 className="mb-3 text-lg font-bold">{notes.priority.title}</h2>
            <Card className="p-4">
              <ol className="space-y-2">
                {notes.priority.items.map((it, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5 text-[15px]">{it}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}
