// Raport PDF generowany w przeglądarce (pdfmake, MIT; font Roboto z polskimi znakami, Apache 2.0).
// Biblioteka ładowana dopiero po kliknięciu "Pobierz raport PDF", żeby nie spowalniać startu aplikacji.
// Kolejność treści jak w raporcie na ekranie i w wymaganiach KOWR:
// ocena -> przyczyny -> retencja -> agrotechnika -> nawadnianie, potem ograniczenia, źródła, metodyka.
import { fmtDate, fmtDateTime, n, signed } from '../format.js';

const C = {
  ink: '#1b2a21',
  muted: '#5f6b62',
  line: '#e2ddcf',
  soft: '#f4f1e8',
  green: '#1d3a2a',
  green2: '#2f5d43',
  water: '#2a6f97',
  waterSoft: '#5fa8d3',
  amber: '#c98a1b',
  red: '#b3412f',
  grey: '#b9b2a0',
};
const TONE = {
  critical: { bg: '#a8392a', fg: '#ffffff' },
  warning: { bg: '#c07f15', fg: '#ffffff' },
  good: { bg: '#2f6b47', fg: '#ffffff' },
  wet: { bg: '#2a6f97', fg: '#ffffff' },
  unknown: { bg: '#6b736e', fg: '#ffffff' },
};
const LEVEL_TONE = { susza: 'critical', zagrozenie: 'warning', sucho: 'warning', ok: 'good', mokro: 'wet', brak: 'unknown' };
const LEVEL_COLOR = { susza: C.red, zagrozenie: C.amber, sucho: C.amber, ok: '#2f6b47', mokro: C.water, brak: C.grey };
const PRIO = {
  pilne: { label: 'PILNE', color: C.red },
  wazne: { label: 'WAŻNE', color: C.amber },
  info: { label: 'DO ROZWAŻENIA', color: C.waterSoft },
};
const SOIL_SOURCE = { iung: 'mapa IUNG-PIB', soilgrids: 'model SoilGrids (przybliżenie)', user: 'wybór użytkownika', domyslna: 'przyjęta domyślnie' };
const VULN = { wysoka: 'wysoka', srednia: 'średnia', niska: 'niska' };
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const CONTENT_W = 515; // A4 595 pt − marginesy 2 × 40

// Znaki spoza zestawu Roboto zamieniamy, żeby w PDF nie było pustych kwadratów.
const clean = (s) => String(s ?? '').replace(/→/g, '–').replace(/←/g, '–').replace(/[→←]/g, '–');

async function loadPdfMake() {
  const [pm, fonts] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]);
  const pdfMake = pm.default ?? pm;
  const f = fonts.default ?? fonts;
  const vfs = f?.pdfMake?.vfs ?? f?.vfs ?? f;
  if (typeof pdfMake.addVirtualFileSystem === 'function') pdfMake.addVirtualFileSystem(vfs);
  else pdfMake.vfs = vfs;
  return pdfMake;
}

export async function downloadReportPdf(report) {
  const pdfMake = await loadPdfMake();
  const doc = buildDocDefinition(report);
  const id = report.place.parcel?.id?.replace(/[^\w.-]/g, '_') ?? 'punkt';
  const name = `raport-wodny-${id}-${fmtDate(report.date).replaceAll('.', '-')}.pdf`;
  await new Promise((resolve) => pdfMake.createPdf(doc).download(name, resolve));
}

// ---------- elementy wspólne ----------

const sectionTitle = (num, title, subtitle) => ({
  margin: [0, 16, 0, 6],
  stack: [
    {
      table: {
        widths: [16, '*'],
        body: [[
          { text: num, color: '#ffffff', bold: true, fontSize: 9.5, alignment: 'center', fillColor: C.green, margin: [0, 1, 0, 0] },
          { text: clean(title), style: 'h2', margin: [6, 0, 0, 0] },
        ]],
      },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 1, paddingBottom: () => 1 },
    },
    subtitle ? { text: clean(subtitle), style: 'muted', margin: [22, 2, 0, 0] } : null,
  ].filter(Boolean),
});

/** Próbka koloru + opis (zamiast znaków ●/■, których font może nie mieć). */
const swatch = (color, label, round = false) => ({
  columns: [
    { width: 9, canvas: [round ? { type: 'ellipse', x: 3.5, y: 4.5, r1: 3.2, r2: 3.2, color } : { type: 'rect', x: 0, y: 1.5, w: 7, h: 7, color }] },
    { width: 'auto', text: label, fontSize: 7, color: C.muted },
  ],
  columnGap: 2,
  width: 'auto',
});

const box = (content, { fill = C.soft, border = C.line, margin = [0, 4, 0, 4] } = {}) => ({
  margin,
  table: { widths: ['*'], body: [[{ stack: Array.isArray(content) ? content : [content], fillColor: fill }]] },
  layout: {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => border,
    vLineColor: () => border,
    paddingLeft: () => 9,
    paddingRight: () => 9,
    paddingTop: () => 7,
    paddingBottom: () => 7,
  },
});

const kvTable = (rows) => ({
  table: { widths: [92, '*'], body: rows.map(([k, v]) => [{ text: k, style: 'kvKey' }, { text: clean(v), style: 'kvVal' }]) },
  layout: {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => C.line,
    paddingTop: () => 3,
    paddingBottom: () => 3,
    paddingLeft: () => 0,
  },
});

const gridLayout = {
  hLineWidth: (i, node) => (i === 1 ? 0.8 : i === 0 || i === node.table.body.length ? 0 : 0.4),
  vLineWidth: () => 0,
  hLineColor: (i) => (i === 1 ? C.green2 : C.line),
  paddingTop: () => 4,
  paddingBottom: () => 4,
  paddingLeft: () => 5,
  paddingRight: () => 5,
};

// ---------- szkic działki ----------

function parcelSketch(report, size = 170) {
  const g = report.place.parcel?.geometry;
  if (!g) return { text: 'Brak obrysu działki – analiza dla punktu.', style: 'muted' };
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
  const pts = polys.flatMap((p) => p[0]);
  const lat0 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  const xy = ([lon, lat]) => [lon * kx, lat * ky];
  const all = pts.map(xy);
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const spanM = Math.max(maxX - minX, maxY - minY, 1);
  const pad = 12;
  const s = (size - 2 * pad) / spanM;
  const offX = pad + (size - 2 * pad - (maxX - minX) * s) / 2;
  const offY = pad + (size - 2 * pad - (maxY - minY) * s) / 2;
  const toCanvas = (c) => {
    const [x, y] = xy(c);
    return { x: offX + (x - minX) * s, y: offY + (maxY - y) * s };
  };

  const shapes = [{ type: 'rect', x: 0, y: 0, w: size, h: size, r: 6, color: '#eef3ee' }];
  for (const poly of polys) {
    shapes.push({ type: 'polyline', points: poly[0].map(toCanvas), closePath: true, lineWidth: 1.6, lineColor: C.green, color: '#cfe3ec' });
    for (const hole of poly.slice(1)) shapes.push({ type: 'polyline', points: hole.map(toCanvas), closePath: true, lineWidth: 1, lineColor: C.green, color: '#eef3ee' });
  }
  const marks = Object.values(report.recommendations ?? {}).flat().filter((a) => a.location);
  for (const m of marks) {
    const p = toCanvas([m.location.lon, m.location.lat]);
    if (p.x < 0 || p.y < 0 || p.x > size || p.y > size) continue;
    shapes.push({ type: 'ellipse', x: p.x, y: p.y, r1: 4.5, r2: 4.5, color: C.water, lineColor: '#ffffff', lineWidth: 1.2 });
  }
  // Strzałka północy.
  shapes.push({ type: 'polyline', points: [{ x: size - 14, y: 8 }, { x: size - 18, y: 20 }, { x: size - 14, y: 17 }, { x: size - 10, y: 20 }], closePath: true, color: C.ink });
  // Podziałka: okrągła długość ok. 1/3 szkicu.
  const nice = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  const target = spanM / 3;
  const lenM = nice.reduce((b, v) => (Math.abs(v - target) < Math.abs(b - target) ? v : b), nice[0]);
  const lenPt = lenM * s;
  shapes.push({ type: 'line', x1: 10, y1: size - 10, x2: 10 + lenPt, y2: size - 10, lineWidth: 2, lineColor: C.ink });
  shapes.push({ type: 'line', x1: 10, y1: size - 13, x2: 10, y2: size - 7, lineWidth: 1, lineColor: C.ink });
  shapes.push({ type: 'line', x1: 10 + lenPt, y1: size - 13, x2: 10 + lenPt, y2: size - 7, lineWidth: 1, lineColor: C.ink });

  return {
    width: size,
    stack: [
      { canvas: shapes },
      { text: `N – północ (strzałka) · podziałka: ${lenM} m`, fontSize: 7, color: C.muted, margin: [0, 3, 0, 2] },
      marks.length ? swatch(C.water, 'miejsca wskazane w rekomendacjach', true) : null,
    ].filter(Boolean),
  };
}

// ---------- wykresy ----------

function yearsChart(report) {
  const rows = [...(report.history?.byYear ?? [])].sort((a, b) => a.year - b.year);
  rows.push({ year: Number(report.date.slice(0, 4)), kbw: report.metrics.kbw, current: true });
  const max = Math.max(50, ...rows.map((r) => Math.abs(r.kbw)));
  const barW = 210;
  const thr = report.metrics.iungThreshold;
  const body = rows.map((r) => {
    const w = Math.max(1.5, (Math.abs(r.kbw) / max) * barW);
    const color = r.current ? C.red : r.kbw < 0 ? C.amber : C.waterSoft;
    const canvas = [{ type: 'rect', x: 0, y: 2, w, h: 7, r: 2, color }];
    if (thr != null) {
      const tx = (Math.abs(thr) / max) * barW;
      if (tx <= barW) canvas.push({ type: 'line', x1: tx, y1: 0, x2: tx, y2: 11, lineWidth: 0.8, lineColor: C.red, dash: { length: 2 } });
    }
    return [
      { text: String(r.year) + (r.current ? ' (analiza)' : ''), fontSize: 8, bold: !!r.current },
      { canvas },
      { text: `${signed(r.kbw)} mm`, fontSize: 8, alignment: 'right', bold: !!r.current },
    ];
  });
  return {
    stack: [
      {
        table: { widths: [62, barW + 4, 50], body },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingTop: () => 1, paddingBottom: () => 1, paddingLeft: () => 0, paddingRight: () => 2 },
      },
      {
        text: `Długość paska = niedobór (bilans ujemny) lub nadmiar wody w 61 dniach do ${fmtDate(report.date).slice(0, 5)} każdego roku.${thr != null ? ` Linia przerywana = próg suszy IUNG (${n(thr)} mm).` : ''}`,
        fontSize: 7,
        color: C.muted,
        margin: [0, 3, 0, 0],
      },
    ],
  };
}

function climatologyChart(report) {
  const rows = (report.climatology ?? []).filter((d) => d.month >= 3 && d.month <= 10);
  const vals = rows.flatMap((r) => [r.normal, r.current ?? r.currentPartial]).filter((v) => v != null);
  if (!vals.length) return null;
  const W = CONTENT_W;
  const H = 110;
  const mid = H / 2;
  const max = Math.max(20, ...vals.map(Math.abs));
  const k = (mid - 6) / max;
  const slot = W / rows.length;
  const shapes = [
    { type: 'rect', x: 0, y: 0, w: W, h: H, color: '#faf8f2' },
    { type: 'line', x1: 0, y1: mid, x2: W, y2: mid, lineWidth: 0.6, lineColor: C.grey },
  ];
  rows.forEach((r, i) => {
    const x = i * slot;
    const bar = (v, dx, color) => {
      if (v == null) return;
      const h = Math.max(0.8, Math.abs(v) * k);
      shapes.push({ type: 'rect', x: x + dx, y: v >= 0 ? mid - h : mid, w: slot * 0.3, h, color });
    };
    bar(r.normal, slot * 0.17, C.grey);
    bar(r.current ?? r.currentPartial, slot * 0.53, r.current != null ? C.water : C.waterSoft);
  });
  return {
    unbreakable: true,
    margin: [0, 6, 0, 0],
    stack: [
      { text: 'Bilans miesięczny (opad − parowanie): średnio z 10 lat i w roku analizy', style: 'h4' },
      { canvas: shapes },
      {
        columns: rows.map((r) => ({ width: slot, text: MONTHS[r.month - 1], alignment: 'center', fontSize: 7, color: C.muted })),
        columnGap: 0,
        margin: [0, 2, 0, 0],
      },
      {
        margin: [0, 3, 0, 0],
        columnGap: 12,
        columns: [
          swatch(C.grey, 'średnio (10 lat)'),
          swatch(C.water, 'rok analizy'),
          swatch(C.waterSoft, 'miesiąc niepełny'),
          { width: '*', text: `skala ±${Math.round(max)} mm/miesiąc; nad osią nadwyżka wody, pod osią niedobór`, fontSize: 7, color: C.muted },
        ],
      },
    ],
  };
}

// ---------- sekcje ----------

function actionCard(a) {
  const p = PRIO[a.priority] ?? PRIO.info;
  const stack = [
    { text: p.label, fontSize: 6.5, bold: true, color: p.color, characterSpacing: 0.6 },
    { text: clean(a.title), bold: true, fontSize: 10.5, margin: [0, 1, 0, 3] },
    { text: clean(a.detail), fontSize: 9 },
  ];
  if (a.note) stack.push(box({ text: clean(a.note), fontSize: 8.2, color: '#5a4310' }, { fill: '#fff7e6', border: '#f0d9a0', margin: [0, 5, 0, 0] }));
  if (a.basis?.length) stack.push({ text: [{ text: 'Na podstawie: ', bold: true }, clean(a.basis.join(' · '))], fontSize: 7.8, color: C.muted, margin: [0, 4, 0, 0] });
  return {
    unbreakable: true,
    margin: [0, 3, 0, 3],
    stack: [{
    table: { widths: [3, '*'], body: [[{ text: '', fillColor: p.color }, { stack, fillColor: '#ffffff' }]] },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: (i) => (i === 0 ? 0 : 0.5),
      hLineColor: () => C.line,
      vLineColor: () => C.line,
      paddingLeft: (i) => (i === 0 ? 0 : 9),
      paddingRight: (i) => (i === 0 ? 0 : 9),
      paddingTop: () => 6,
      paddingBottom: () => 7,
    },
    }],
  };
}

function cropCompareSection(report) {
  const cmp = report.cropComparison;
  if (!cmp?.available) return [];
  const riskColor = { niska: '#2f6b47', srednia: '#7a5410', wysoka: C.red };
  return [
    sectionTitle('4a', 'Które uprawy na tej glebie rzadziej cierpią na suszę', `Sezony ${cmp.seasonsRange}, gleba kat. ${cmp.category}, progi suszy IUNG-PIB. Podpowiedź, nie nakaz.`),
    {
      table: {
        headerRows: 1,
        widths: ['*', 70, 150],
        body: [
          ['Uprawa', 'Sezony z suszą', 'Potrzeby wodne wg FAO'].map((t) => ({ text: t, style: 'th' })),
          ...cmp.rows.map((r) => [
            { text: clean(`${r.label}${r.current ? ' (Twoja)' : ''}${r.perennial ? ' – wieloletnia/specjalna' : ''}`), fontSize: 8, bold: r.current },
            r.notSuited
              ? { text: 'niewskazana', fontSize: 8, color: C.muted }
              : { text: `${r.droughtYears} z ${cmp.seasons}`, fontSize: 8, bold: true, color: riskColor[r.level] },
            { text: r.fao ? clean(`${r.fao.mmFrom}–${r.fao.mmTo} mm, wrażliwość ${r.fao.sensitivity}`) : '–', fontSize: 7.5, color: C.muted },
          ]),
        ],
      },
      layout: gridLayout,
    },
    {
      margin: [0, 4, 0, 0],
      fontSize: 7,
      color: C.muted,
      text: clean(`Potrzeby wodne: ${cmp.faoSource} – wartości orientacyjne z cieplejszych klimatów. O wyborze uprawy decydują też płodozmian, rynek, maszyny i zasady programów dopłat.`),
    },
  ];
}

function nextCheckSection(report) {
  if (!report.nextCheck?.length) return [];
  return [
    sectionTitle('»', 'Kiedy sprawdzić ponownie', 'Wystarczy 2–3 razy w roku, w chwilach decyzji.'),
    { ul: report.nextCheck.map((c) => ({ text: [{ text: `${clean(c.title)} – około ${fmtDate(c.date)}: `, bold: true }, clean(c.why)], fontSize: 8.5, margin: [0, 1, 0, 1] })) },
  ];
}

function actionsSection(num, title, subtitle, list) {
  if (!list?.length) return [];
  return [sectionTitle(num, title, subtitle), ...list.map(actionCard)];
}

function statusBox(report) {
  const { status, metrics, uncertainty } = report;
  const t = TONE[LEVEL_TONE[status.level] ?? 'unknown'];
  const nums = [
    { label: 'Bilans 61 dni', value: `${signed(metrics.kbw)} mm` },
    metrics.iungThreshold != null ? { label: 'Próg suszy IUNG', value: `${n(metrics.iungThreshold)} mm` } : null,
    report.history?.percentile != null ? { label: `Na tle ${report.history.years} lat`, value: `percentyl ${report.history.percentile}` } : null,
    { label: 'Pewność wyniku', value: clean(uncertainty.label.replace(' pewność', '')) },
  ].filter(Boolean);
  return {
    margin: [0, 10, 0, 6],
    table: {
      widths: ['*', ...nums.map(() => 'auto')],
      body: [[
        {
          stack: [
            { text: 'WODA NA TWOIM POLU', fontSize: 7, color: t.fg, characterSpacing: 0.8 },
            { text: clean(status.label), fontSize: 20, bold: true, color: t.fg, margin: [0, 1, 0, 1] },
            status.plain ? { text: clean(status.plain), fontSize: 10, color: t.fg, margin: [0, 0, 0, 3] } : null,
            { text: status.periodLabel ? `okres oceny suszy IUNG: ${status.periodLabel}` : 'poza okresem oceny suszy IUNG (21.03–30.09)', fontSize: 7.5, color: t.fg },
          ].filter(Boolean),
          fillColor: t.bg,
        },
        ...nums.map((x) => ({
          stack: [
            { text: x.label, fontSize: 7, color: t.fg },
            { text: x.value, fontSize: 12.5, bold: true, color: t.fg, margin: [0, 2, 0, 0] },
          ],
          fillColor: t.bg,
          alignment: 'right',
        })),
      ]],
    },
    layout: { hLineWidth: () => 0, vLineWidth: () => 0, paddingLeft: () => 11, paddingRight: () => 11, paddingTop: () => 10, paddingBottom: () => 10 },
  };
}

function assessmentSection(report) {
  const { status, metrics, history: h, vulnerability: v, rootZone, crop, soil, satellite, terrain, waters } = report;
  const indicators = {
    table: {
      headerRows: 1,
      widths: [110, 70, 135, '*'],
      body: [
        ['Wskaźnik', 'Wartość', 'Odniesienie', 'Wniosek'].map((t) => ({ text: t, style: 'th' })),
        ...status.indicators.map((i) => [
          { stack: [{ text: clean(i.name), bold: true, fontSize: 8.5 }, i.decisive ? null : { text: 'wskaźnik pomocniczy', fontSize: 7, color: C.muted }].filter(Boolean) },
          { text: clean(i.value), fontSize: 8.5, bold: true, color: LEVEL_COLOR[i.level] ?? C.ink },
          { text: clean(i.reference), fontSize: 8 },
          { text: clean(i.verdict), fontSize: 8 },
        ]),
      ],
    },
    layout: gridLayout,
  };

  const sat = satellite?.current;
  const satText = sat?.clear
    ? `Scena z ${fmtDate(sat.date)}: NDVI ${n(sat.ndvi)}${sat.ndmi != null ? `, NDMI ${n(sat.ndmi)}` : ''} (${sat.pixels} pikseli 20 m, bez chmur ${Math.round(sat.clearFraction * 100)}%).`
    : 'Brak bezchmurnych danych Sentinel-2 dla działki z 30 dni przed datą analizy.';
  const img = sat?.images;
  const satHist = (satellite?.history ?? []).filter((x) => x.clear);
  const terrainText = terrain
    ? `Spadek ${n(terrain.slopePct)}% w kierunku: ${terrain.downslope}; różnica wysokości ${n(terrain.reliefM)} m${terrain.depressions?.length ? `; lokalne obniżenia: ${terrain.depressions.length}` : ''} (NMT GUGiK).`
    : 'Brak danych o ukształtowaniu terenu.';
  const watersText = waters
    ? waters.items.length
      ? waters.items.slice(0, 5).map((w) => `${w.kind}${w.name ? ` „${w.name}”` : ''}: ${w.distM === 0 ? 'na działce' : `${w.distM} m`}`).join('; ')
      : `W promieniu ${waters.radiusM} m mapa OpenStreetMap nie pokazuje wód.`
    : 'Brak danych o rowach i ciekach (OpenStreetMap nie odpowiedział).';

  return [
    sectionTitle('1', 'Ocena sytuacji wodnej', 'Klimatyczny bilans wodny wg IUNG-PIB, porównanie z 10 latami, zapas wody w strefie korzeni (FAO-56), stan roślin z satelity.'),
    indicators,
    {
      text: `Bilans = opad ${n(metrics.rain)} mm − parowanie wzorcowe ET0 ${n(metrics.et0)} mm (${fmtDate(metrics.windowStart)} – ${fmtDate(report.date)}). Zapotrzebowanie uprawy ETc = Kc × ET0: ${n(metrics.etc)} mm. Najdłuższy okres bez deszczu: ${metrics.drySpell} dni.${rootZone?.applicable ? ` W strefie korzeni zostało ok. ${n(rootZone.available)} z ${n(rootZone.taw)} mm wody dostępnej (${rootZone.availablePct}%).` : ''}`,
      style: 'small',
      margin: [0, 5, 0, 8],
    },
    {
      columnGap: 14,
      columns: [
        {
          width: '*',
          stack: [
            { text: `Ten sam okres w ${h.years} poprzednich latach`, style: 'h4' },
            h.years
              ? { text: `Średnio ${signed(h.meanKbw)} mm (od ${signed(h.minKbw)} do ${signed(h.maxKbw)} mm). Opad ${h.rainPctOfNormal ?? '–'}% normy, parowanie ${h.et0PctOfNormal ?? '–'}% normy.`, fontSize: 8.5, margin: [0, 0, 0, 5] }
              : { text: 'Brak danych historycznych.', style: 'muted' },
            h.years ? yearsChart(report) : null,
          ].filter(Boolean),
        },
        {
          width: 200,
          stack: [
            { text: 'Historyczna podatność na suszę', style: 'h4' },
            box(
              [
                v.hasThresholds
                  ? { text: [`Susza wg progów IUNG (${crop.short}, gleba kat. ${soil.category}) w `, { text: `${v.droughtYearsCount} z ${v.seasons}`, bold: true }, ` sezonów (${v.seasonsRange})${v.droughtYears.length ? `: ${v.droughtYears.join(', ')}` : ''}.`], fontSize: 8.5 }
                  : { text: 'IUNG nie publikuje progów suszy dla tej uprawy – porównujemy okresy między sobą.', fontSize: 8.5 },
                v.level ? { text: [{ text: 'Podatność: ' }, { text: VULN[v.level], bold: true }], fontSize: 8.5, margin: [0, 4, 0, 0] } : null,
                v.riskMonths ? { text: [{ text: 'Największe ryzyko niedoboru wody: ' }, { text: v.riskMonths.label, bold: true }, '.'], fontSize: 8.5, margin: [0, 4, 0, 0] } : null,
                { text: `Okres krytyczny uprawy: ${crop.critical}.`, fontSize: 8, color: C.muted, margin: [0, 4, 0, 0] },
                v.notRecommended ? { text: 'IUNG nie wskazuje tej uprawy na tej kategorii gleby.', fontSize: 8, color: C.red, margin: [0, 4, 0, 0] } : null,
              ].filter(Boolean),
            ),
          ],
        },
      ],
    },
    climatologyChart(report),
    {
      margin: [0, 10, 0, 0],
      columnGap: 14,
      columns: [
        {
          width: '*',
          stack: [
            { text: img ? 'Zdjęcie satelitarne (Sentinel-2)' : 'Dane z Sentinel-2', style: 'h4' },
            img
              ? {
                  columnGap: 6,
                  margin: [0, 0, 0, 4],
                  columns: [
                    { width: '*', stack: [{ image: img.rgb, fit: [118, 150] }, { text: `kolory naturalne, ${fmtDate(img.date)}`, fontSize: 6.5, color: C.muted, margin: [0, 2, 0, 0] }] },
                    { width: '*', stack: [{ image: img.ndvi, fit: [118, 150] }, { text: 'zieloność roślin (NDVI)', fontSize: 6.5, color: C.muted, margin: [0, 2, 0, 0] }] },
                  ],
                }
              : null,
            img
              ? { text: `Żółta / czarna linia – granica działki. NDVI: brąz – gleba, żółty – słabe rośliny, zieleń – bujne, szary – chmura. Wycinek ok. ${n(img.widthM)} × ${n(img.heightM)} m, piksel ${img.pixelM} m.`, fontSize: 6.5, color: C.muted, margin: [0, 0, 0, 4] }
              : null,
            { text: satText, fontSize: 8.5 },
            satHist.length ? { text: `Te same tygodnie w poprzednich latach (NDVI): ${satHist.map((x) => `${x.year}: ${n(x.ndvi)}`).join(' · ')}`, fontSize: 7.8, color: C.muted, margin: [0, 3, 0, 0] } : null,
          ].filter(Boolean),
        },
        {
          width: '*',
          stack: [
            { text: 'Teren i woda wokół działki', style: 'h4' },
            { text: terrainText, fontSize: 8.5 },
            { text: watersText, fontSize: 8.5, margin: [0, 3, 0, 0] },
            report.hydroStation
              ? { text: `Wodowskaz IMGW ${report.hydroStation.name} (${report.hydroStation.river}, ${report.hydroStation.distanceKm} km): stan ${report.hydroStation.level} cm${report.hydroStation.warningLevel ? `, ostrzegawczy ${report.hydroStation.warningLevel} cm` : ''}.`, fontSize: 8, color: C.muted, margin: [0, 3, 0, 0] }
              : null,
          ].filter(Boolean),
        },
      ],
    },
  ];
}

function causesSection(report) {
  const list = report.causes?.list ?? [];
  return [
    sectionTitle('2', 'Przyczyny', 'Co wpływa na dostępność wody na tej działce – wyłącznie czynniki potwierdzone danymi.'),
    list.length
      ? { ul: list.map((c) => ({ text: [{ text: `${clean(c.title)}. `, bold: true }, clean(c.detail)], margin: [0, 0, 0, 3] })), fontSize: 9 }
      : { text: 'Dane nie wskazują czynników nasilających niedobór wody.', style: 'muted' },
  ];
}

function limitsSection(report) {
  const u = report.uncertainty;
  return [
    sectionTitle('i', `Ograniczenia i niepewność: ${u.label.toLowerCase()}`, null),
    box(
      [
        { ul: [...u.items, ...(report.weatherNotes ?? [])].map((t) => ({ text: clean(t), margin: [0, 0, 0, 2] })), fontSize: 8.3 },
        { text: 'Rekomendacje wynikają z reguł opisanych w metodyce i danych z dnia analizy. Decyzję podejmuje rolnik; progi warto skonsultować z doradcą (ODR).', fontSize: 7.8, color: C.muted, margin: [0, 5, 0, 0] },
      ],
      { fill: '#fbfaf6' },
    ),
  ];
}

function sourcesSection(report) {
  return [
    sectionTitle('§', 'Źródła danych', null),
    {
      table: {
        headerRows: 1,
        widths: [70, '*', 120],
        body: [
          ['Kategoria', 'Źródło', 'Status'].map((t) => ({ text: t, style: 'th' })),
          ...report.dataSources.map((s) => [
            { text: s.category, fontSize: 8 },
            { text: clean(`${s.name}${s.range ? ` (${s.range})` : ''}${!s.live && s.fetched ? ` – pobrane ${s.fetched}` : ''}`), fontSize: 8 },
            { text: clean(s.status), fontSize: 7.8, color: String(s.status).startsWith('błąd') ? C.red : String(s.status) === 'ok' ? '#2f6b47' : C.muted },
          ]),
        ],
      },
      layout: gridLayout,
    },
    {
      margin: [0, 6, 0, 0],
      fontSize: 7,
      color: C.muted,
      text: [
        'Weather data by ', { text: 'Open-Meteo.com', link: 'https://open-meteo.com/', color: C.water }, ' (CC BY 4.0). Generated using Copernicus Climate Change Service information. ',
        'Contains modified Copernicus Sentinel data. Źródłem pochodzenia danych jest IMGW-PIB (dane przetworzone). NASA POWER. IUNG-PIB (susza.iung.pulawy.pl). ',
        'GUGiK (ULDK, NMT). ISRIC SoilGrids (CC BY 4.0). © OpenStreetMap contributors (ODbL).',
      ],
    },
  ];
}

function methodSection() {
  const items = [
    ['Klimatyczny bilans wodny (KBW)', 'Suma opadu minus suma parowania wzorcowego ET0 w 61 dniach (okres sześciodekadowy jak w Systemie Monitoringu Suszy Rolniczej IUNG-PIB).'],
    ['Próg suszy', 'Wartości krytyczne KBW z tabeli IUNG-PIB (rozporządzenie MRiRW z 11.04.2019) dla uprawy, kategorii gleby i okresu – poniżej progu IUNG przewiduje przeciętnie ok. 20% spadku plonu.'],
    ['Na tle 10 lat', 'Ten sam 61-dniowy okres w 10 poprzednich latach; percentyl = odsetek lat bardziej suchych.'],
    ['Strefa korzeni', 'Dobowy bilans wody (FAO-56, rozdz. 8): ETc = Kc × ET0, pojemność wodna z kategorii gleby IUNG, start 1 marca.'],
    ['Satelita', 'Mediana NDVI i NDMI z pikseli 20 m Sentinel-2 L2A wewnątrz działki, z maską chmur i cieni (SCL).'],
    ['Teren i woda', 'Spadek i obniżenia z siatki 9 × 9 punktów NMT GUGiK; rowy, cieki i mokradła w promieniu 600 m z OpenStreetMap.'],
  ];
  return [
    sectionTitle('m', 'Metodyka w skrócie', null),
    {
      table: { widths: [110, '*'], body: items.map(([k, v]) => [{ text: k, bold: true, fontSize: 8 }, { text: v, fontSize: 8 }]) },
      layout: { ...gridLayout, hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.4), hLineColor: () => C.line },
    },
  ];
}

/** Pierwsza strona: krótka lista poleceń w kolejności zatrzymaj wodę -> uprawa -> podlewanie. */
function quickTodo(report) {
  const rec = report.recommendations;
  if (!rec) return null;
  const groups = [['Zatrzymaj wodę', rec.retencja], ['Uprawa', rec.agrotechnika], ['Podlewanie', rec.nawadnianie]];
  const rows = [];
  for (const [g, list] of groups) {
    for (const a of (list ?? []).slice(0, g === 'Uprawa' ? 3 : 2)) {
      const p = PRIO[a.priority] ?? PRIO.info;
      rows.push([
        { text: g, fontSize: 7.5, color: C.muted },
        { text: clean(a.title), fontSize: 9.5, bold: a.priority !== 'info' },
        { text: a.priority === 'info' ? '' : p.label, fontSize: 6.5, bold: true, color: p.color, alignment: 'right' },
      ]);
    }
  }
  if (!rows.length) return null;
  return {
    unbreakable: true,
    margin: [0, 6, 0, 0],
    stack: [
      { text: 'CO ZROBIĆ – NAJWAŻNIEJSZE', fontSize: 8, bold: true, color: C.green2, characterSpacing: 0.8, margin: [0, 0, 0, 3] },
      {
        table: { widths: [70, '*', 60], body: rows },
        layout: { ...gridLayout, hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.4), hLineColor: () => C.line },
      },
      { text: 'Uzasadnienie każdej rady (dlaczego i jak) – w dalszej części raportu.', fontSize: 7.5, color: C.muted, margin: [0, 3, 0, 0] },
    ],
  };
}

// ---------- dokument ----------

export function buildDocDefinition(report) {
  const { place, crop, soil, recommendations: rec } = report;
  const p = place.parcel;
  const title = p ? `Działka ${p.number}, obręb ${p.region}` : 'Wybrany punkt';
  const generated = fmtDateTime(report.generatedAt);

  const head = {
    columnGap: 16,
    columns: [
      {
        width: '*',
        stack: [
          { text: report.isToday ? 'RAPORT WODNY DZIAŁKI · STAN NA DZIEŃ ANALIZY' : 'RAPORT WODNY DZIAŁKI · ANALIZA HISTORYCZNA', fontSize: 7.5, bold: true, color: C.green2, characterSpacing: 0.8 },
          { text: clean(title), style: 'h1', margin: [0, 2, 0, 8] },
          kvTable([
            ['Identyfikator', p?.id ?? '–'],
            ['Położenie', p ? `gm. ${p.commune}, ${p.county}, woj. ${p.voivodeship}` : `${n(place.lat)}, ${n(place.lon)}`],
            ['Powierzchnia', p ? `${n(p.areaHa)} ha` : '–'],
            ['Data analizy', fmtDate(report.date)],
            ['Uprawa', crop.label],
            ['Gleba', `${soil.label} (${SOIL_SOURCE[soil.source] ?? soil.source})`],
            ['Współrzędne', `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)} (WGS84)`],
          ]),
        ],
      },
      parcelSketch(report),
    ],
  };

  const content = [
    head,
    statusBox(report),
    box({ text: clean(report.summary), fontSize: 9.5, lineHeight: 1.3 }, { fill: '#ffffff' }),
    quickTodo(report),
    ...assessmentSection(report),
    ...causesSection(report),
    ...(rec
      ? [
          ...actionsSection('3', 'Zatrzymaj wodę (retencja)', 'Najpierw zatrzymanie wody tam, gdzie spadła – na działce i w gospodarstwie.', rec.retencja),
          ...actionsSection('4', 'Zabiegi uprawowe (agrotechnika)', 'Jak ograniczyć straty wilgoci i zwiększyć retencję glebową.', rec.agrotechnika),
          ...cropCompareSection(report),
          ...actionsSection('5', 'Nawadnianie (opcjonalnie)', 'Dopiero po retencji: czy, kiedy i ile.', rec.nawadnianie),
          ...actionsSection('!', 'Pogoda i ostrzeżenia na najbliższe dni', null, rec.pogoda),
        ]
      : [{ text: 'Bez oceny sytuacji wodnej nie generujemy rekomendacji.', style: 'muted' }]),
    ...nextCheckSection(report),
    ...limitsSection(report),
    ...sourcesSection(report),
    ...methodSection(),
  ];

  const contentClean = content.filter(Boolean);
  return {
    pageSize: 'A4',
    pageMargins: [40, 58, 40, 46],
    info: {
      title: `Raport wodny – ${title} – ${fmtDate(report.date)}`,
      author: 'Moje Gospodarstwo – woda na Twoich polach',
      subject: 'Ocena sytuacji wodnej działki i rekomendacje',
      keywords: 'susza, retencja, KBW, IUNG, działka',
    },
    header: (currentPage) =>
      currentPage === 1
        ? {
            margin: [40, 20, 40, 0],
            columns: [
              { text: [{ text: 'Moje Gospodarstwo', bold: true, color: C.green }, { text: '  ·  woda na Twoich polach', color: C.green2 }], fontSize: 10 },
              { text: `Wygenerowano: ${generated}`, alignment: 'right', fontSize: 7.5, color: C.muted, margin: [0, 2, 0, 0] },
            ],
          }
        : {
            margin: [40, 20, 40, 0],
            columns: [
              { text: clean(`${title} · ${fmtDate(report.date)} · ${crop.short}`), fontSize: 7.5, color: C.muted },
              { text: [{ text: 'Moje Gospodarstwo', bold: true, color: C.green }, { text: ' · woda na Twoich polach', color: C.green2 }], alignment: 'right', fontSize: 8 },
            ],
          },
    footer: (currentPage, pageCount) => ({
      margin: [40, 12, 40, 0],
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_W, y2: 0, lineWidth: 0.5, lineColor: C.line }] },
        {
          margin: [0, 5, 0, 0],
          columns: [
            { text: 'Prototyp HackNation 2026 (zadanie KOWR). Wynik obliczony automatycznie z danych publicznych – nie zastępuje porady doradcy rolniczego.', fontSize: 6.5, color: C.muted },
            { text: `strona ${currentPage} z ${pageCount}`, alignment: 'right', fontSize: 7, color: C.muted, width: 70 },
          ],
        },
      ],
    }),
    content: contentClean,
    defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.22, color: C.ink },
    styles: {
      h1: { fontSize: 19, bold: true, color: C.green },
      h2: { fontSize: 12.5, bold: true, color: C.green },
      h4: { fontSize: 9, bold: true, color: C.green2, margin: [0, 0, 0, 3] },
      muted: { fontSize: 8, color: C.muted },
      small: { fontSize: 8, color: C.muted },
      th: { fontSize: 7, bold: true, color: C.muted, characterSpacing: 0.4 },
      kvKey: { fontSize: 8, color: C.muted },
      kvVal: { fontSize: 8.5, bold: true },
    },
  };
}
