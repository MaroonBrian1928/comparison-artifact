const { useEffect, useMemo, useRef, useState } = React;

gsap.registerPlugin(ScrollTrigger, useGSAP);

const DATA = window.__BENCH__;

const SOURCES = [
  { key: "native", label: "Parakeet only", short: "Parakeet", color: "var(--s-native)" },
  { key: "qwen", label: "Qwen only", short: "Qwen", color: "var(--s-qwen)" },
  { key: "hybrid", label: "Hybrid, per segment", short: "Per segment", color: "var(--s-hybrid)" },
  { key: "per_word", label: "Hybrid, per word", short: "Per word", color: "var(--accent)" },
];

// Real word timings from the 560 s crosstalk passage of Live From Boston (Night 1).
const MISS = {
  from: 559.9,
  to: 566.4,
  mfa: [
    ["I", 559.96, 560.08], ["don't", 560.08, 560.22], ["know", 560.22, 560.38], ["how", 560.38, 560.5],
    ["you", 560.5, 560.64], ["look", 560.64, 560.86], ["like,", 560.86, 561.33], ["but", 561.33, 561.43],
    ["you're", 561.43, 561.53], ["not", 561.53, 561.84], ["fucking", 561.84, 562.23], ["cute.", 562.23, 562.41],
    ["Exactly.", 562.44, 563.1], ["Okay,", 563.1, 563.61], ["exactly.", 563.61, 564.2],
    ["You're", 564.2, 564.67], ["not", 564.67, 564.79], ["cute.", 564.79, 565.13], ["Exactly.", 565.13, 566.19],
  ],
  native: [
    ["I", 560.0, 560.08], ["don't", 560.08, 560.24], ["know", 560.24, 560.4], ["how", 560.4, 560.56],
    ["you", 560.56, 560.72], ["look", 560.72, 560.88], ["like,", 560.88, 561.12], ["but", 561.28, 561.44],
    ["you're", 561.44, 561.6], ["not", 561.6, 561.84], ["fucking", 561.84, 562.16], ["cute.", 562.16, 562.48],
    ["Exactly.", 562.8, 563.12], ["Okay?", 563.28, 563.52], ["Exactly.", 563.76, 564.08],
    ["You're", 564.32, 564.56], ["not", 564.56, 564.72], ["cute.", 564.72, 565.12], ["Exactly.", 565.44, 565.84],
  ],
  qwen: [
    ["I", 560.0, 560.0], ["don't", 560.0, 561.12], ["know", 561.12, 561.12], ["how", 561.12, 561.12],
    ["you", 561.12, 561.12], ["look", 561.12, 563.2], ["like", 563.2, 563.2], ["but", 563.2, 563.2],
    ["you're", 563.2, 563.2], ["not", 563.2, 563.2], ["fucking", 563.2, 563.2], ["cute", 563.2, 566.16],
    ["Exactly", 566.16, 566.16],
  ],
};

function useColorScheme() {
  const read = () => {
    const forced = document.documentElement.getAttribute("data-theme");
    if (forced === "dark" || forced === "light") return forced;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const [scheme, setScheme] = useState(read);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setScheme(read());
    media.addEventListener("change", update);
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      media.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);
  return scheme;
}

function useToken(name, scheme) {
  return useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    [name, scheme]
  );
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Hero({ scheme }) {
  const line = useToken("--wave-line", scheme);
  const accent = useToken("--accent", scheme);
  return (
    <header className="hero">
      <div className="hero__waves" aria-hidden="true">
        <Waves
          key={scheme}
          lineColor={line}
          accentColor={accent}
          spacing={14}
          amplitude={26}
          speed={0.6}
          opacity={scheme === "dark" ? 0.55 : 0.7}
          lightMode={false}
          fade={0.35}
        />
      </div>
      <div className="hero__inner">
        <p className="eyebrow">parakeetX alignment benchmark · 24 Oct 2026</p>
        <SplitText
          tag="h1"
          className="hero__title"
          text="Where does the bleep land?"
          splitType="words"
          effect="rise"
          delay={70}
          duration={0.9}
          trigger="load"
          textAlign="left"
        />
        <p className="hero__lede">
          Podly bleeps each swear across the time span its word timestamps give it. This compares the
          timing sources parakeetX can supply across six of your podcasts, scored against Montreal
          Forced Aligner (MFA) as the reference.
        </p>
        <dl className="hero__facts">
          <div><dt>Shows</dt><dd>6</dd></div>
          <div><dt>Audio</dt><dd>60 min</dd></div>
          <div><dt>Words scored</dt><dd>10,515</dd></div>
          <div><dt>Swears</dt><dd>40</dd></div>
        </dl>
      </div>
    </header>
  );
}

function MissTimeline() {
  const root = useRef(null);
  const W = 900;
  const left = 88;
  const right = 16;
  const span = MISS.to - MISS.from;
  const x = (t) => left + ((t - MISS.from) / span) * (W - left - right);
  const rows = [
    { key: "mfa", label: "MFA", y: 70, words: MISS.mfa },
    { key: "native", label: "Parakeet", y: 160, words: MISS.native },
    { key: "qwen", label: "Qwen", y: 250, words: MISS.qwen },
  ];
  const frames = [];
  for (let t = Math.ceil(MISS.from / 0.08) * 0.08; t <= MISS.to; t += 0.08) frames.push(t);
  const seconds = [];
  for (let t = Math.ceil(MISS.from * 2) / 2; t <= MISS.to; t += 0.5) seconds.push(t);
  const collapsed = MISS.qwen.filter(([, s, e]) => e - s < 0.02 && Math.abs(s - 563.2) < 0.001).map(([w]) => w);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".mt-bar-mfa", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.5, stagger: 0.035 })
        .from(".mt-bar-native", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.5, stagger: 0.035 }, "<0.2")
        .from(".mt-bar-qwen", { scaleX: 0, transformOrigin: "0% 50%", duration: 0.5, stagger: 0.035 }, "<0.2")
        .from(".mt-collapse", { y: -24, autoAlpha: 0, duration: 0.6, ease: "back.out(2)" }, "-=0.2")
        .from(".mt-truth", { autoAlpha: 0, duration: 0.5 }, "-=0.3");
    },
    { scope: root }
  );

  return (
    <div className="chart-scroll" ref={root}>
      <svg className="miss" viewBox={`0 0 ${W} 352`} role="img" aria-label="Word timelines from MFA, Parakeet and Qwen for the same six seconds of audio. MFA places 'fucking' at 561.84 to 562.23 seconds and Parakeet at 561.84 to 562.16. Qwen stacks five words, including 'fucking', at 563.20 seconds with zero length.">
        {frames.map((t) => (
          <line key={t} x1={x(t)} x2={x(t)} y1={30} y2={305} className="mt-frame" />
        ))}
        {seconds.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={24} y2={326} className="mt-sec" />
            <text x={x(t)} y={344} className="mt-axis" textAnchor="middle">{t.toFixed(1)}s</text>
          </g>
        ))}
        <rect className="mt-truth" x={x(561.84)} width={x(562.23) - x(561.84)} y={24} height={286} />
        <text className="mt-truth mt-truth-label" x={x(562.035)} y={18} textAnchor="middle">"fucking" spoken here</text>
        {rows.map((row) => (
          <g key={row.key}>
            <text x={0} y={row.y + 5} className="mt-rowlabel">{row.label}</text>
            {row.words.map(([word, s, e], i) => {
              const swear = word.startsWith("fucking");
              const zero = e - s < 0.02;
              if (zero) {
                return <line key={i} className={`mt-bar-${row.key} mt-tick${swear ? " is-swear" : ""}`} x1={x(s)} x2={x(s)} y1={row.y - 14} y2={row.y + 14} />;
              }
              const width = Math.max(2, x(e) - x(s) - 1.5);
              return (
                <g key={i}>
                  <clipPath id={`mt-clip-${row.key}-${i}`}>
                    <rect x={x(s)} y={row.y - 14} width={width - 2} height={28} />
                  </clipPath>
                  <rect className={`mt-bar-${row.key} mt-word${swear ? " is-swear" : ""}`} x={x(s)} y={row.y - 14} width={width} height={28} rx={3} />
                  {width > 24 && (
                    <text className={`mt-label${swear ? " is-swear" : ""}`} x={x(s) + 4} y={row.y + 4} clipPath={`url(#mt-clip-${row.key}-${i})`}>{word}</text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
        <g className="mt-collapse">
          <line x1={x(563.2)} x2={x(563.2)} y1={268} y2={285} className="mt-callout-line" />
          <text x={x(563.2)} y={298} className="mt-callout" textAnchor="middle">
            {collapsed.length} words stacked at 563.20s, 0 ms long: {collapsed.join(" ")}
          </text>
        </g>
      </svg>
    </div>
  );
}

function Findings({ scheme }) {
  const t = DATA.totals;
  const failed = DATA.shows.reduce((a, s) => a + s.qwenSegFail.failed, 0);
  const segments = DATA.shows.reduce((a, s) => a + s.qwenSegFail.segments, 0);
  const cards = [
    {
      figure: `${t.native.leak[0]}%`,
      label: "of words leak with 0 ms padding",
      body: `Your current setting. Even the best source leaves ${t.per_word.leak[0]}% of words partly unbleeped, because no timestamp is that exact.`,
    },
    {
      figure: "0 / 40",
      label: "swears leaked at 150 ms, Parakeet only",
      body: `Podly's default padding. Qwen still leaked ${t.qwen.swearLeaks[3]} there, on words it cut short or collapsed.`,
    },
    {
      figure: `${t.per_word.leak[3]}%`,
      label: "of words leak at 150 ms, per-word hybrid",
      body: `Best overall, versus ${t.native.leak[3]}% for Parakeet and ${t.qwen.leak[3]}% for Qwen. It keeps Qwen's timing per word and swaps in Parakeet's where Qwen breaks.`,
    },
    {
      figure: `${Math.round((failed / segments) * 100)}%`,
      label: "of segments had a broken Qwen word",
      body: `${failed} of ${segments} segments, on every show, including 99% Invisible's studio narration. A live audience isn't the cause.`,
    },
  ];
  return (
    <div className="findings">
      {cards.map((c) => (
        <SpotlightCard
          key={c.label}
          theme={scheme}
          className="finding"
          spotlightColor="var(--accent)"
          intensity={0.18}
          style={{
            "--spotlight-card-surface": "var(--surface)",
            "--spotlight-card-border": "var(--rule)",
            "--spotlight-card-shadow": "none",
          }}
        >
          <p className="finding__figure">{c.figure}</p>
          <p className="finding__label">{c.label}</p>
          <p className="finding__body">{c.body}</p>
        </SpotlightCard>
      ))}
    </div>
  );
}

function LeakChart() {
  const root = useRef(null);
  const W = 640;
  const H = 320;
  const m = { l: 52, r: 132, t: 16, b: 44 };
  const pads = DATA.paddings;
  const x = (p) => m.l + (p / 200) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - v / 70) * (H - m.t - m.b);
  const yTicks = [0, 10, 20, 30, 40, 50, 60, 70];
  const ends = SOURCES.map((s) => ({ ...s, v: DATA.totals[s.key].leak[pads.length - 1] }));
  const labelY = {};
  [...ends].sort((a, b) => a.v - b.v).forEach((s, i) => {
    labelY[s.key] = H - m.b - 12 - i * 18;
  });

  useGSAP(
    () => {
      if (reducedMotion()) return;
      root.current.querySelectorAll(".lc-line").forEach((path) => {
        const len = path.getTotalLength();
        gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, {
          strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut",
          scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
          onComplete: () => gsap.set(path, { clearProps: "strokeDasharray,strokeDashoffset" }),
        });
      });
      gsap.from(".lc-dot", {
        scale: 0, transformOrigin: "50% 50%", duration: 0.35, stagger: 0.03, delay: 0.9, ease: "back.out(2)",
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });
    },
    { scope: root }
  );

  return (
    <div className="chart-scroll" ref={root}>
      <svg className="leak" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Share of words whose spoken span falls more than 30 ms outside the bleep window, by padding from 0 to 200 ms, for four timing sources.">
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="grid" />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end" className="axis">{v}%</text>
          </g>
        ))}
        {pads.map((p) => (
          <text key={p} x={x(p)} y={H - m.b + 18} textAnchor="middle" className="axis">{p} ms</text>
        ))}
        <text x={(m.l + W - m.r) / 2} y={H - 6} textAnchor="middle" className="axis axis--title">Bleep padding on each side</text>
        <line x1={x(0)} x2={x(0)} y1={m.t} y2={H - m.b} className="marker" />
        <text x={x(0) + 6} y={m.t + 12} className="marker-label">your setting</text>
        <line x1={x(150)} x2={x(150)} y1={m.t} y2={H - m.b} className="marker" />
        <text x={x(150) + 6} y={m.t + 12} className="marker-label">Podly default</text>
        {SOURCES.map((s) => {
          const vals = DATA.totals[s.key].leak;
          const d = vals.map((v, i) => `${i ? "L" : "M"}${x(pads[i]).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
          const endY = y(vals[vals.length - 1]);
          return (
            <g key={s.key}>
              <path d={d} className={`lc-line${s.key === "per_word" ? " is-lead" : ""}`} stroke={s.color} />
              {vals.map((v, i) => (
                <circle key={i} className="lc-dot" cx={x(pads[i])} cy={y(v)} r={s.key === "per_word" ? 4 : 3} fill={s.color} />
              ))}
              <line x1={x(200) + 6} x2={x(200) + 14} y1={endY} y2={labelY[s.key]} stroke={s.color} className="lc-leader" />
              <text x={x(200) + 18} y={labelY[s.key] + 4} className="lc-label" fill={s.color}>
                {s.short} {vals[vals.length - 1]}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SwearGrid() {
  const pads = DATA.paddings;
  return (
    <div className="chart-scroll">
      <table className="swears">
        <caption className="sr-only">Swears out of 40 whose spoken span leaked past the bleep, by timing source and padding</caption>
        <thead>
          <tr>
            <th scope="col">Timing source</th>
            {pads.map((p) => <th key={p} scope="col">{p} ms</th>)}
          </tr>
        </thead>
        <tbody>
          {SOURCES.map((s) => (
            <tr key={s.key}>
              <th scope="row"><span className="swatch" style={{ background: s.color }} />{s.label}</th>
              {DATA.totals[s.key].swearLeaks.map((n, i) => (
                <td key={i} className="swears__cell" style={{ "--heat": n / 24 }}>
                  <span className={n === 0 ? "is-zero" : undefined}>{n}</span>
                  <span className="swears__of">/40</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShowTable() {
  return (
    <div className="chart-scroll">
      <table className="shows">
        <thead>
          <tr>
            <th scope="col">Show</th>
            <th scope="col" className="num">Words</th>
            <th scope="col" className="num">Qwen broken segments</th>
            <th scope="col" className="num">Leak at 0 ms<br /><small>Parakeet / Qwen / per word</small></th>
            <th scope="col" className="num">Leak at 150 ms<br /><small>Parakeet / Qwen / per word</small></th>
            <th scope="col" className="num">Swears leaked at 150 ms<br /><small>Parakeet / Qwen / per word</small></th>
          </tr>
        </thead>
        <tbody>
          {DATA.shows.map((s) => {
            const f = s.qwenSegFail;
            const trio = (key, i) => s.src[key].leak[i];
            return (
              <tr key={s.id}>
                <th scope="row">{s.label}<br /><small className="tc">clip {fmtTime(s.clipStart)} to {fmtTime(s.clipStart + 600)}</small></th>
                <td className="num">{s.words.toLocaleString()}</td>
                <td className="num">
                  <span className="bar" style={{ "--w": f.failed / f.segments }} />
                  {Math.round((f.failed / f.segments) * 100)}% <small>({f.failed}/{f.segments})</small>
                </td>
                <td className="num">{trio("native", 0)} / {trio("qwen", 0)} / <b>{trio("per_word", 0)}</b>%</td>
                <td className="num">{trio("native", 3)} / {trio("qwen", 3)} / <b>{trio("per_word", 3)}</b>%</td>
                <td className="num">
                  {s.src.native.swearLeaks[3]} / {s.src.qwen.swearLeaks[3]} / <b>{s.src.per_word.swearLeaks[3]}</b>
                  <small> of {s.src.native.swears}</small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Measured on the same six clips (60 min of audio), each stage in its own fresh process.
const COST_SOURCES = [
  { key: "native", label: "Parakeet", note: "timings come with transcription", color: "var(--s-native)" },
  { key: "qwen", label: "Qwen aligner", note: "GPU, after transcription", color: "var(--s-qwen)" },
  { key: "mfa", label: "MFA", note: "CPU only, one core", color: "var(--s-mfa)" },
];
const COST = [
  { metric: "Time per hour of audio", unit: "s", values: { native: 49.4, qwen: 68.4, mfa: 188.2 },
    detail: "Parakeet's figure is the transcription you already run; Qwen and MFA add theirs on top." },
  { metric: "Model load", unit: "s", values: { native: 28.9, qwen: 14.2, mfa: null },
    detail: "Paid once per model load. MFA has no separate load step; its setup is in the time above." },
  { metric: "Peak VRAM", unit: "GiB", values: { native: 4.79, qwen: 4.05, mfa: 0 },
    detail: "Driver-reported, including the CUDA context, on a 12 GiB card. The server keeps both models loaded, about 8.8 GiB together." },
  { metric: "Peak RAM", unit: "GiB", values: { native: 3.27, qwen: 3.93, mfa: 2.66 },
    steady: { native: 0.66, qwen: 2.47 },
    detail: "Peak during load or the run. The server has 7.7 GiB in total. The faded part of each bar is resident RAM once the model is loaded." },
  { metric: "CPU time", unit: "s", values: { native: 50.4, qwen: 72.3, mfa: 176.0 },
    detail: "Process CPU seconds for the hour of audio. MFA ran single-threaded: it parallelises by speaker, and an episode counts as one." },
];

function CostPanel() {
  const root = useRef(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.from(".cost__fill", {
        scaleX: 0, transformOrigin: "0 50%", duration: 0.9, ease: "power3.out", stagger: 0.05,
        scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
      });
    },
    { scope: root }
  );

  return (
    <div className="cost" ref={root}>
      {COST.map((row) => {
        const max = Math.max(...Object.values(row.values).filter((v) => v != null));
        return (
          <div className="cost__metric" key={row.metric}>
            <h3>{row.metric}</h3>
            <dl className="cost__bars">
              {COST_SOURCES.map((s) => {
                const v = row.values[s.key];
                const steady = row.steady?.[s.key];
                return (
                  <div className="cost__row" key={s.key}>
                    <dt><span className="swatch" style={{ background: s.color }} />{s.label}</dt>
                    <dd>
                      <span className="cost__track">
                        {v ? <span className="cost__fill" style={{ width: `${(v / max) * 100}%`, background: s.color }} /> : null}
                        {steady ? <span className="cost__steady" style={{ width: `${(steady / max) * 100}%` }} /> : null}
                      </span>
                      <span className="cost__value">{v == null ? "n/a" : v === 0 ? "none" : `${v} ${row.unit}`}</span>
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="cost__detail">{row.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function fmtTime(sec) {
  const h = Math.floor(sec / 3600);
  const mm = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(sec % 60)).padStart(2, "0");
  return `${h}:${mm}:${ss}`;
}

function App() {
  const scheme = useColorScheme();
  const main = useRef(null);

  useGSAP(
    () => {
      if (reducedMotion()) return;
      gsap.utils.toArray(".section__head").forEach((el) => {
        gsap.from(el.children, {
          y: 18, duration: 0.7, ease: "power3.out", stagger: 0.08,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
    },
    { scope: main }
  );

  return (
    <>
      <Hero scheme={scheme} />
      <main className="main" ref={main}>
        <section className="section">
          <div className="section__head">
            <p className="eyebrow">The miss that started this</p>
            <h2>Same six seconds, three timelines</h2>
            <p>
              A fast exchange from Live From Boston (Night 1). Faint ticks are Parakeet's 80 ms frame grid.
              MFA, the reference, and Parakeet agree on where the swear was spoken, to within 70 ms. Qwen collapses half a sentence onto a single
              instant 1.4 s later. In Podly's run, that bleep lasted 1 ms and missed the word.
            </p>
          </div>
          <MissTimeline />
        </section>

        <section className="section">
          <div className="section__head">
            <p className="eyebrow">Across all six shows</p>
            <h2>What the benchmark found</h2>
          </div>
          <Findings scheme={scheme} />
        </section>

        <section className="section">
          <div className="section__head">
            <p className="eyebrow">Every word, 10,515 of them</p>
            <h2>Padding matters more than the aligner</h2>
            <p>
              A word leaks when more than 30 ms of its spoken span, as MFA measured it, falls outside the
              bleep window. The 30 ms allowance covers MFA's own error. Moving from 0 ms to 150 ms of padding
              cuts leaks by a factor of 8 to 13 for every source.
            </p>
          </div>
          <LeakChart />
        </section>

        <section className="section">
          <div className="section__head">
            <p className="eyebrow">The words you actually care about</p>
            <h2>Swears leaked, out of 40</h2>
            <p>
              The swears still leaking at 150 ms are two long words that Qwen ended early ("goddamn",
              "motherfuckers"), plus one Qwen collapsed to zero length ("shit"). Parakeet alone covered every swear at
              150 ms. With 40 swears this is a small sample, so read it alongside the all-words chart.
            </p>
          </div>
          <SwearGrid />
        </section>

        <section className="section">
          <div className="section__head">
            <p className="eyebrow">Per show</p>
            <h2>A live audience isn't the problem</h2>
            <p>
              Qwen broke on 30 to 46% of segments on every show. Each row is the middle ten minutes of one
              recent episode.
            </p>
          </div>
          <ShowTable />
        </section>

        <section className="section">
          <div className="section__head">
            <p className="eyebrow">What each aligner costs</p>
            <h2>Time, VRAM, RAM and CPU</h2>
            <p>
              MFA is the yardstick for the accuracy charts, so it can't be scored against itself. It aligned 99.2%
              of words; the other 0.8% would need Parakeet timings as a fallback. It needs no GPU, but it took 2.8
              times as long as Qwen on one CPU core.
            </p>
          </div>
          <CostPanel />
        </section>

        <section className="section section--last">
          <div className="section__head">
            <p className="eyebrow">What to change</p>
            <h2>Recommendation</h2>
          </div>
          <ol className="steps">
            <li>
              <h3>Set bleep padding back to 150 ms</h3>
              <p>
                The biggest single improvement. At 0 ms, 38% to 62% of words leak whatever the timing
                source. At 150 ms, Parakeet alone leaked none of the 40 swears.
              </p>
            </li>
            <li>
              <h3>Use the per-word hybrid for timing</h3>
              <p>
                Keep Qwen's timing for each word, and swap in Parakeet's only where Qwen's is zero-length, out
                of order or outside its segment. It is the best source at every padding, at 2.8% of words leaking at 150 ms.
              </p>
            </li>
            <li>
              <h3>Spot-check by ear before trusting the swear numbers</h3>
              <p>
                MFA stands in for a human listener. Qwen was trained partly on MFA output, which flatters
                Qwen in this comparison, and 40 swears is too few to rank sources on its own.
              </p>
            </li>
          </ol>
          <p className="method">
            Method: middle 10 minutes of one recent episode per show; Parakeet TDT 0.6B and Qwen3-ForcedAligner-0.6B
            on the deployed parakeetX image (GTX TITAN X); MFA 3.4 with the english_us_arpa models, G2P for unknown
            words, beam 100 and retry beam 400. MFA aligned 1,038 of 1,051 utterances. Costs: each stage profiled in a
            fresh process on the 12-core, 7.7 GiB server; VRAM sampled from nvidia-smi every 200 ms, RAM as process
            RSS (Parakeet, Qwen) or container cgroup memory (MFA).
          </p>
        </section>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
