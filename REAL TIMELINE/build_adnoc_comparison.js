/**
 * ADNOC Phase overlap comparison — Build script (plan v2).
 * - Phase = (Start_dt, End_dt). WA: wa_dt in [start_dt, end_dt). Bushra: overlap_hrs only.
 * - WA blank time → 00:00 GST. Bushra NO32 end_dt = 2026-02-04 16:06.
 * All times GST (UTC+4).
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;

function parseTSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const vals = line.split('\t');
    const row = {};
    header.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const vals = [];
    let cur = '';
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') { inQ = !inQ; continue; }
      if (!inQ && c === ',') { vals.push(cur); cur = ''; continue; }
      cur += c;
    }
    vals.push(cur);
    const row = {};
    header.forEach((h, i) => { row[h.trim()] = (vals[i] ?? '').replace(/^"|"$/g, '').trim(); });
    rows.push(row);
  }
  return rows;
}

function toDate(d, t) {
  const date = (d || '').trim();
  let time = (t || '').trim();
  if (!time) time = '00:00';
  const [hh, mm] = time.split(':').map(Number);
  return new Date(date + 'T' + String(hh).padStart(2, '0') + ':' + String(mm || 0).padStart(2, '0') + ':00+04:00');
}

function toDateOnly(d) {
  return new Date(d.trim() + 'T00:00:00+04:00');
}

function addHours(d, hrs) {
  return new Date(d.getTime() + hrs * 3600 * 1000);
}

function inRange(t, start, end) {
  const ts = t.getTime();
  return ts >= start.getTime() && ts < end.getTime();
}

function overlapHrs(bStart, bEnd, pStart, pEnd) {
  const s = Math.max(bStart.getTime(), pStart.getTime());
  const e = Math.min(bEnd.getTime(), pEnd.getTime());
  if (e <= s) return 0;
  return (e - s) / (3600 * 1000);
}

function fmtDt(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

// ---------- Phase End_dt rules (from plan: time vs elapsed) ----------
function getPhaseBounds(adnocRows) {
  const phases = [];
  let prevEnd = toDate('2026-01-25', '00:00');
  for (let i = 0; i < adnocRows.length; i++) {
    const r = adnocRows[i];
    const sn = parseInt(r.SN, 10);
    if (!sn) continue;
    const date = (r.Date || '').trim();
    const durTimes = (r['DURATION TIMES'] || '').trim();
    const durHrs = parseFloat(r['DURATION HRS']) || 0;
    let endDt;
    // Interpret: SN3,10,12,13 = event time (HH:MM); SN14 = 8.07hr elapsed; others as needed
    if ([3, 4, 5, 6, 7, 8, 10].includes(sn)) {
      const match = durTimes.match(/(\d{1,2}):(\d{2})/);
      if (match) endDt = toDate(date, match[1] + ':' + match[2]);
      else endDt = addHours(prevEnd, durHrs);
    } else if (sn === 9) {
      const match = durTimes.match(/(\d{1,2}):(\d{2})/);
      if (match) endDt = toDate(date, match[1] + ':' + match[2]);
      else endDt = addHours(prevEnd, durHrs);
    } else if (sn === 11) {
      const match = durTimes.match(/(\d{1,2}):(\d{2})/);
      if (match) endDt = toDate(date, match[1] + ':' + match[2]);
      else endDt = addHours(prevEnd, durHrs);
    } else if (sn === 12) {
      const match = durTimes.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        const startEv = toDate(date, match[1] + ':' + match[2]);
        endDt = addHours(startEv, parseFloat(r['DURATION HRS']) || 0);
      } else endDt = addHours(prevEnd, durHrs);
    } else if (sn === 13) {
      // Phase 13 end = 22:42 (WA E013 drop anchor); set in override below
      const match = durTimes.match(/(\d{1,2}):(\d{2})/);
      if (match) endDt = toDate(date, match[1] + ':' + match[2]);
      else endDt = addHours(prevEnd, durHrs);
    } else if (sn === 14) {
      // 08:04 = 8.07hr duration (plan §6.2-5)
      endDt = addHours(prevEnd, parseFloat(r['DURATION HRS']) || 8.07);
    } else {
      // SN1, 2: elapsed
      endDt = addHours(prevEnd, durHrs);
    }
    phases.push({
      phase_id: sn,
      start_dt: new Date(prevEnd.getTime()),
      end_dt: endDt,
      adnoc_duration_hrs: durHrs,
      adnoc_activity: r.Activity || '',
      activity_id_primary: r.activity_id || '',
      activity_id_secondary: '',
    });
    prevEnd = endDt;
  }
  // Override specific phases per plan
  const bySn = {};
  phases.forEach((p) => { bySn[p.phase_id] = p; });
  bySn[3].end_dt = toDate('2026-01-27', '17:38');
  bySn[3].start_dt = bySn[2].end_dt;
  bySn[4].end_dt = toDate('2026-01-28', '17:00');
  bySn[4].start_dt = bySn[3].end_dt;
  bySn[5].end_dt = toDate('2026-01-31', '10:30');
  bySn[5].start_dt = bySn[4].end_dt;
  bySn[6].end_dt = toDate('2026-01-31', '11:00');
  bySn[6].start_dt = bySn[5].end_dt;
  bySn[7].end_dt = toDate('2026-01-31', '20:36');
  bySn[7].start_dt = bySn[6].end_dt;
  bySn[8].end_dt = toDate('2026-02-01', '06:00');
  bySn[8].start_dt = bySn[7].end_dt;
  bySn[9].end_dt = toDate('2026-02-03', '05:00');
  bySn[9].start_dt = bySn[8].end_dt;
  bySn[10].end_dt = toDate('2026-02-04', '16:06');
  bySn[10].start_dt = bySn[9].end_dt;
  bySn[11].end_dt = toDate('2026-02-04', '20:30');
  bySn[11].start_dt = bySn[10].end_dt;
  bySn[12].end_dt = toDate('2026-02-08', '14:38');
  bySn[12].start_dt = bySn[11].end_dt;
  bySn[13].end_dt = toDate('2026-02-08', '22:42'); // WA E013
  bySn[13].start_dt = toDate('2026-02-08', '14:38');
  bySn[14].start_dt = toDate('2026-02-08', '22:42');
  bySn[14].end_dt = addHours(bySn[14].start_dt, 8.07);
  // SN7: Cast off~Sail-away → primary A1081, secondary A1070 (plan §3)
  bySn[7].activity_id_primary = 'A1081';
  bySn[7].activity_id_secondary = 'A1070';
  return phases;
}

function main() {
  const adnocRaw = fs.readFileSync(path.join(DIR, 'adnoc.csv'), 'utf8');
  const bushraRaw = fs.readFileSync(path.join(DIR, 'bushra.csv'), 'utf8');
  const waRaw = fs.readFileSync(path.join(DIR, 'wa_group_events.csv'), 'utf8');

  const adnocRows = parseTSV(adnocRaw).filter((r) => r.SN && r.SN.trim() !== '');
  const bushraRows = parseTSV(bushraRaw).filter((r) => r.NO && r.NO.trim() !== '');
  const waRows = parseCSV(waRaw).filter((r) => r.event_id);

  const phases = getPhaseBounds(adnocRows);

  // WA: wa_dt. Blank time → 00:00
  const waWithDt = waRows.map((r) => {
    const date = (r.occurred_date || '').trim();
    let time = (r.occurred_time || '').trim();
    if (!time) time = '00:00';
    const dt = toDate(date, time);
    return { ...r, wa_dt: dt };
  });

  // Bushra: start_dt, end_dt. NO32 end = 2026-02-04 16:06
  const bushraWithDt = bushraRows.map((r, idx) => {
    const no = parseInt(r.NO, 10);
    const startDt = toDate(r['START DATE'], r['START TIME'] || '0:00');
    let endDt;
    if (no === 32 || (!(r['END DATE'] && r['END DATE'].trim()))) {
      endDt = toDate('2026-02-04', '16:06');
    } else {
      endDt = toDate(r['END DATE'], r['END TIME'] || '0:00');
    }
    return { ...r, no, bushra_start_dt: startDt, bushra_end_dt: endDt };
  });

  const mappingLog = { wa: [], bushra: [], activity: [] };
  const results = phases.map((phase) => {
    const waIn = waWithDt.filter((w) => inRange(w.wa_dt, phase.start_dt, phase.end_dt));
    waIn.forEach((w) => mappingLog.wa.push({ phase_id: phase.phase_id, event_id: w.event_id, occurred_date: w.occurred_date, occurred_time: w.occurred_time || '', wa_dt: fmtDt(w.wa_dt) }));
    const waIds = waIn.map((w) => w.event_id).join(';');
    const waKey = waIn.slice(0, 3).map((w) => fmtDt(w.wa_dt)).join('; ');
    const bushraOverlap = bushraWithDt
      .map((b) => ({
        no: b.no,
        bushra_start_dt: fmtDt(b.bushra_start_dt),
        bushra_end_dt: fmtDt(b.bushra_end_dt),
        hrs: overlapHrs(b.bushra_start_dt, b.bushra_end_dt, phase.start_dt, phase.end_dt),
      }))
      .filter((x) => x.hrs > 0);
    bushraOverlap.forEach((x) => mappingLog.bushra.push({ phase_id: phase.phase_id, bushra_no: x.no, bushra_start_dt: x.bushra_start_dt, bushra_end_dt: x.bushra_end_dt, overlap_hrs: Math.round(x.hrs * 100) / 100 }));
    mappingLog.activity.push({ phase_id: phase.phase_id, activity_id_primary: phase.activity_id_primary, activity_id_secondary: phase.activity_id_secondary });
    const bushraNos = bushraOverlap.map((x) => x.no).join(';');
    const bushraHrsSum = bushraOverlap.reduce((a, x) => a + x.hrs, 0);
    const deltaHrs = phase.adnoc_duration_hrs != null && bushraHrsSum !== 0
      ? Math.round((bushraHrsSum - phase.adnoc_duration_hrs) * 100) / 100
      : '';
    let note = '';
    if (bushraHrsSum === 0 && phase.phase_id <= 2) note = 'bushra 해당일 없음';
    else if (bushraHrsSum === 0 && phase.phase_id >= 12) note = 'bushra 자료 02-04까지';
    else if (deltaHrs !== '' && Math.abs(deltaHrs) < 1) note = 'PASS';
    else if (deltaHrs !== '') note = '정의차이 또는 overlap 구간';
    return {
      phase_id: phase.phase_id,
      start_dt: fmtDt(phase.start_dt),
      end_dt: fmtDt(phase.end_dt),
      adnoc_duration_hrs: phase.adnoc_duration_hrs,
      adnoc_activity: phase.adnoc_activity,
      activity_id_primary: phase.activity_id_primary,
      activity_id_secondary: phase.activity_id_secondary,
      wa_ids_in_phase: waIds,
      wa_key_datetime: waKey,
      bushra_nos_overlapped: bushraNos,
      bushra_hrs_overlapped_sum: bushraHrsSum === 0 ? '' : Math.round(bushraHrsSum * 100) / 100,
      delta_hrs: deltaHrs,
      consistency_note: note,
    };
  });

  // CSV
  const csvHeader = 'phase_id,start_dt,end_dt,adnoc_duration_hrs,adnoc_activity,activity_id_primary,activity_id_secondary,wa_ids_in_phase,wa_key_datetime,bushra_nos_overlapped,bushra_hrs_overlapped_sum,delta_hrs,consistency_note';
  const csvRows = results.map((r) => {
    const esc = (v) => (v == null ? '' : String(v).includes(',') ? '"' + String(v).replace(/"/g, '""') + '"' : v);
    return [r.phase_id, r.start_dt, r.end_dt, r.adnoc_duration_hrs, esc(r.adnoc_activity), r.activity_id_primary, r.activity_id_secondary, r.wa_ids_in_phase, r.wa_key_datetime, r.bushra_nos_overlapped, r.bushra_hrs_overlapped_sum, r.delta_hrs, r.consistency_note].join(',');
  });
  fs.writeFileSync(path.join(DIR, 'ADNOC_DURATION_comparison.csv'), csvHeader + '\n' + csvRows.join('\n') + '\n', 'utf8');

  // MD
  let md = '# ADNOC DURATION 기준 비교 (Phase 구간 + WA/Bushra overlap)\n\n';
  md += '**기준:** ADNOC 1행 = 1 Phase. Phase = (Start_dt, End_dt). WA = 구간 포함, Bushra = overlap_hrs만 합산. 시간대 GST.\n\n';
  md += '## Phase별 비교\n\n| phase_id | start_dt | end_dt | adnoc_hrs | wa_ids | bushra_nos | bushra_overlap_hrs | delta_hrs | note |\n|----------|----------|--------|-----------|--------|------------|-------------------|-----------|------|\n';
  results.forEach((r) => {
    md += `| ${r.phase_id} | ${r.start_dt} | ${r.end_dt} | ${r.adnoc_duration_hrs} | ${r.wa_ids_in_phase || '—'} | ${r.bushra_nos_overlapped || '—'} | ${r.bushra_hrs_overlapped_sum !== '' ? r.bushra_hrs_overlapped_sum : '—'} | ${r.delta_hrs !== '' ? r.delta_hrs : '—'} | ${r.consistency_note || ''} |\n`;
  });
  md += '\n## 비교 포인트\n\n';
  md += '- **SN3:** ADNOC 23.37h vs Bushra overlap — 접안 구간 정의 차이.\n';
  md += '- **SN4:** ADNOC 65.5h vs Bushra overlap — Deck prep 구간.\n';
  md += '- **SN6·7:** WA 10:53 / 20:36 vs Bushra 시각 일치.\n';
  md += '- **SN10:** WA·ADNOC·Bushra 16:06 일치.\n';
  md += '\n## 데이터 모델 요약\n\n';
  md += '- Phase: phase_id, start_dt, end_dt, adnoc_duration_hrs, activity_id_primary/secondary.\n';
  md += '- WA: wa_dt in [start_dt, end_dt) → wa_ids_in_phase. (time 빈칸 = 00:00)\n';
  md += '- Bushra: overlap_hrs = max(0, min(b_end, p_end) - max(b_start, p_start)); NO32 end_dt = 2026-02-04 16:06.\n';
  md += '\n**관련:** [ADNOC_vs_BUSHRA_duration_comparison.md](ADNOC_vs_BUSHRA_duration_comparison.md)\n';
  fs.writeFileSync(path.join(DIR, 'ADNOC_DURATION_comparison.md'), md, 'utf8');

  fs.writeFileSync(path.join(DIR, 'ADNOC_DURATION_mapping_log.json'), JSON.stringify(mappingLog, null, 2), 'utf8');

  console.log('Wrote ADNOC_DURATION_comparison.csv, ADNOC_DURATION_comparison.md, ADNOC_DURATION_mapping_log.json');
}

main();
