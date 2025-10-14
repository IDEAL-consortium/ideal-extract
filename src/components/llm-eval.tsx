import React, { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { Checkbox } from "./ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

type CriterionKey = string;

type Row = Record<string, string | number | null | undefined>;

type Thresholds = {
  yesMaybeMinProb: number; // if prob < this for yes/maybe => treat as no
  noMinProb: number; // if prob < this for no => treat as yes
};

type CriteriaThresholds = Record<CriterionKey, Thresholds>;

type LlmPair = { id: string; labelCol: string; probCol?: string; display: string };
type Mapping = Record<string, {
  include: boolean;
  humanColumn?: string;
  humanValueMap: Record<string, "include" | "exclude">;
  llmValueMap: Record<string, "include" | "exclude">;
}>; // key by pair.id

type RowFilter = {
  enabled: boolean;
  column?: string;
  operator?: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "contains" | "ncontains";
  value?: string;
};

type ModerationDecisions = Record<string, Record<number, 'human' | 'llm'>>; // [criterionKey][rowIndex] = 'human' | 'llm'

type Confusion = {
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  total: number;
  accuracy: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
};

const DEFAULT_THRESHOLDS: CriteriaThresholds = {};

function safeLower(s: any): string {
  return typeof s === "string" ? s.toLowerCase() : "";
}

function parseBooleanFromHumanReasons(reasonsCell: string | undefined, criterion: CriterionKey): boolean {
  if (!reasonsCell) return false;
  // reasons are semicolon separated; criteria labels appear like IC1; IC2; IC3; IC4; EC5
  const tokens = reasonsCell
    .split(";")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return tokens.includes(criterion.toLowerCase());
}

function coerceLlmLabelToBoolean(label: string | undefined): boolean | null {
  if (!label) return null;
  const l = safeLower(label);
  if (l === "yes" || l === "maybe") return true; // treat maybe as yes
  if (l === "no") return false;
  return null;
}

function applyThresholds(
  baseLabel: boolean | null,
  prob: number | undefined,
  thresholds: Thresholds,
  originalRaw: string | undefined
): boolean | null {
  if (prob === undefined || prob === null || Number.isNaN(prob)) return baseLabel;
  // We need to know the original categorical: yes/maybe vs no
  const raw = safeLower(originalRaw);
  const isYesMaybe = raw === "yes" || raw === "maybe";
  const isNo = raw === "no";
  if (isYesMaybe && prob < thresholds.yesMaybeMinProb) {
    // below threshold => treat as no
    return false;
  }
  if (isNo && prob < thresholds.noMinProb) {
    // below threshold for no => treat as yes
    return true;
  }
  return baseLabel;
}

function computeConfusion(truth: boolean[], pred: boolean[]): Confusion {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (let i = 0; i < truth.length; i++) {
    const t = truth[i];
    const p = pred[i];
    if (t && p) tp++;
    else if (!t && !p) tn++;
    else if (!t && p) fp++;
    else if (t && !p) fn++;
  }
  const total = tp + tn + fp + fn;
  const accuracy = total ? (tp + tn) / total : 0;
  const precision = tp + fp ? tp / (tp + fp) : null;
  const recall = tp + fn ? tp / (tp + fn) : null;
  const f1 = precision !== null && recall !== null && (precision + recall) ? (2 * precision * recall) / (precision + recall) : null;
  return { tp, tn, fp, fn, total, accuracy, precision, recall, f1 };
}

function pearson(x: number[], y: number[]): number | null {
  const n = Math.min(x.length, y.length);
  if (n === 0) return null;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = x[i] - mx;
    const vy = y[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  return den ? num / den : null;
}

function parseNumber(value: any): number | undefined {
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(num) ? num : undefined;
}

// Local storage helpers
type PersistedMapping = {
  signature: { llmPairs: Array<{ labelCol: string; probCol?: string }>; header: string[] };
  mapping: Mapping;
  filters?: Record<string, RowFilter>;
};

type SavedMapping = {
  id: string;
  filename: string;
  displayName: string;
  includedColumnCount: number;
  withProbabilitiesCount: number;
  lastUsed: string;
  mapping: Mapping;
  filters: Record<string, RowFilter>;
  llmPairs: Array<{ labelCol: string; probCol?: string }>;
};

function pairsSignature(pairs: LlmPair[]): Array<{ labelCol: string; probCol?: string }> {
  return pairs.map(p => ({ labelCol: p.labelCol, probCol: p.probCol }))
    .sort((a, b) => (a.labelCol + '|' + (a.probCol || '')).localeCompare(b.labelCol + '|' + (b.probCol || '')));
}

function isCompatibleSignature(prev: PersistedMapping["signature"], header: string[], pairs: LlmPair[]): boolean {
  const prevPairs = prev.llmPairs;
  const currPairs = pairsSignature(pairs);
  if (prevPairs.length !== currPairs.length) return false;
  for (let i = 0; i < prevPairs.length; i++) {
    if (prevPairs[i].labelCol !== currPairs[i].labelCol || (prevPairs[i].probCol || '') !== (currPairs[i].probCol || '')) {
      return false;
    }
  }
  // Ensure all previously referenced human columns still exist
  const headerSet = new Set(header);
  // If any included mapping references a human column that does not exist, incompatible
  try {
    const prevMapping = (JSON.parse(localStorage.getItem("llmEvalMapping") || "{}") as PersistedMapping).mapping || {};
    for (const key of Object.keys(prevMapping)) {
      const m = (prevMapping as any)[key];
      if (m?.include && m?.humanColumn && !headerSet.has(m.humanColumn)) {
        return false;
      }
    }
  } catch {}
  return true;
}

function loadPersistedMapping(header: string[], pairs: LlmPair[]): PersistedMapping | null {
  try {
    const raw = localStorage.getItem("llmEvalMapping");
    if (!raw) return null;
    const persisted = JSON.parse(raw) as PersistedMapping;
    if (!persisted?.signature || !persisted?.mapping) return null;
    if (!isCompatibleSignature(persisted.signature, header, pairs)) return null;
    return persisted;
  } catch {
    return null;
  }
}

function savePersistedMapping(header: string[], pairs: LlmPair[], mapping: Mapping, filters: Record<string, RowFilter>) {
  const payload: PersistedMapping = {
    signature: { llmPairs: pairsSignature(pairs), header },
    mapping,
    filters,
  };
  try {
    localStorage.setItem("llmEvalMapping", JSON.stringify(payload));
  } catch {}
}

function getAllSavedMappings(): SavedMapping[] {
  try {
    const raw = localStorage.getItem("llmEvalSavedMappings");
    if (!raw) return [];
    return JSON.parse(raw) as SavedMapping[];
  } catch {
    return [];
  }
}

function generateMappingId(mapping: Mapping, pairs: Array<{ labelCol: string; probCol?: string }>): string {
  const sig = JSON.stringify({ mapping, pairs: pairsSignature(pairs.map(p => ({ id: p.labelCol, labelCol: p.labelCol, probCol: p.probCol, display: p.labelCol }))) });
  return btoa(sig).slice(0, 32);
}

function saveToMappingLibrary(filename: string, mapping: Mapping, filters: Record<string, RowFilter>, pairs: LlmPair[]) {
  const includedPairs = pairs.filter(p => mapping[p.id]?.include);
  const withProbs = includedPairs.filter(p => p.probCol !== undefined).length;
  const llmPairsSig = pairsSignature(includedPairs);
  const id = generateMappingId(mapping, llmPairsSig);
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '/');
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const displayName = `${dateStr}_${timeStr}_${includedPairs.length}cols_${withProbs}withprobs`;
  
  const savedMappings = getAllSavedMappings();
  const existingIndex = savedMappings.findIndex(m => m.id === id);
  
  const newMapping: SavedMapping = {
    id,
    filename,
    displayName,
    includedColumnCount: includedPairs.length,
    withProbabilitiesCount: withProbs,
    lastUsed: now.toISOString(),
    mapping,
    filters,
    llmPairs: llmPairsSig,
  };
  
  if (existingIndex >= 0) {
    savedMappings[existingIndex] = newMapping;
  } else {
    savedMappings.push(newMapping);
  }
  
  try {
    localStorage.setItem("llmEvalSavedMappings", JSON.stringify(savedMappings));
  } catch {}
}

function deleteSavedMapping(id: string) {
  const savedMappings = getAllSavedMappings();
  const filtered = savedMappings.filter(m => m.id !== id);
  try {
    localStorage.setItem("llmEvalSavedMappings", JSON.stringify(filtered));
  } catch {}
}

function detectLlmPairs(header: string[]): LlmPair[] {
  const pairs: LlmPair[] = [];
  const set = new Set(header);
  for (const h of header) {
    if (h.endsWith(" Probability")) {
      const label = h.slice(0, -" Probability".length);
      if (set.has(label)) {
        pairs.push({ id: label, labelCol: label, probCol: h, display: label });
      }
    }
  }
  return pairs;
}

function deriveAliases(label: string): string[] {
  const l = label.toLowerCase();
  const aliases = new Set<string>();
  aliases.add(l);
  const numMatch = l.match(/(\d+)/);
  if (numMatch) {
    const num = numMatch[1];
    aliases.add(`ic${num}`);
    aliases.add(`ec${num}`);
    aliases.add(`criteria ${num}`);
  }
  const inc = l.match(/inclusion\s*criteria\s*(\d+)/);
  if (inc) aliases.add(`ic${inc[1]}`);
  const exc = l.match(/exclusion\s*criteria\s*(\d+)/);
  if (exc) aliases.add(`ec${exc[1]}`);
  return Array.from(aliases);
}

function getUniqueValues(rows: Row[], column: string | undefined): string[] {
  if (!column) return [];
  const set = new Set<string>();
  for (const r of rows) {
    const v = r[column];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s.length) set.add(s);
  }
  return Array.from(set).slice(0, 200);
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LlmEval() {
  const [rows, setRows] = useState<Row[]>([]);
  const [header, setHeader] = useState<string[]>([]);
  const [thresholds, setThresholds] = useState<CriteriaThresholds>(DEFAULT_THRESHOLDS);
  const [selectedCriteria, setSelectedCriteria] = useState<Record<CriterionKey, boolean>>({});
  const [llmPairs, setLlmPairs] = useState<LlmPair[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [isMappingOpen, setIsMappingOpen] = useState<boolean>(false);
  const [mappingConfirmed, setMappingConfirmed] = useState<boolean>(false);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailMeta, setDetailMeta] = useState<{ criterion: string; bucket: 'tp' | 'tn' | 'fp' | 'fn'; indices: number[] } | null>(null);
  const [filtersByCriterion, setFiltersByCriterion] = useState<Record<string, RowFilter>>({});
  const [reportName, setReportName] = useState<string>("LLM Eval Report");
  const [manualColumnSelection, setManualColumnSelection] = useState<string>("");
  const [modelName, setModelName] = useState<string>("");
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
  const [selectedSavedMapping, setSelectedSavedMapping] = useState<string>("");
  const [uploadedFilename, setUploadedFilename] = useState<string>("");
  const [moderationDecisions, setModerationDecisions] = useState<ModerationDecisions>({});

  const humanColumnOptions = useMemo(() => {
    const llmCols = new Set<string>();
    for (const p of llmPairs) {
      llmCols.add(p.labelCol);
      if (p.probCol) llmCols.add(p.probCol);
    }
    return header.filter((h) => !llmCols.has(h));
  }, [header, llmPairs]);

  const availableColumnsForManualSelection = useMemo(() => {
    const llmCols = new Set<string>();
    for (const p of llmPairs) {
      // Only exclude columns that are currently included
      if (mapping[p.id]?.include !== false) {
        llmCols.add(p.labelCol);
        if (p.probCol) llmCols.add(p.probCol);
      }
    }
    return header.filter((h) => !llmCols.has(h));
  }, [header, llmPairs, mapping]);

  const parsed = useMemo(() => {
    if (!rows.length || !header.length) return null;
    const crits: CriterionKey[] = llmPairs.filter(p => mapping[p.id]?.include).map(p => p.id);
    if (!crits.length) return null;

    const truthByCriterion: Record<CriterionKey, boolean[]> = Object.fromEntries(crits.map(c => [c, []])) as Record<CriterionKey, boolean[]>;
    const predByCriterion: Record<CriterionKey, boolean[]> = Object.fromEntries(crits.map(c => [c, []])) as Record<CriterionKey, boolean[]>;

    // Build global active filters (AND across all enabled filters)
    const activeFilters = Object.values(filtersByCriterion).filter(
      (f) => f?.enabled && f.column && f.operator
    ) as RowFilter[];

    const keptOriginalIndices: number[] = [];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      // Check row against all active filters (AND)
      let passAll = true;
      for (const filter of activeFilters) {
        const cell = row[filter.column!];
        const valueStr = String(cell ?? "");
        const target = filter.value ?? "";
        const nVal = parseFloat(valueStr);
        const nTarget = parseFloat(target);
        const bothNumeric = Number.isFinite(nVal) && Number.isFinite(nTarget);
        switch (filter.operator) {
          case "eq": passAll = bothNumeric ? nVal === nTarget : valueStr === target; break;
          case "neq": passAll = bothNumeric ? nVal !== nTarget : valueStr !== target; break;
          case "lt": passAll = bothNumeric ? nVal < nTarget : valueStr < target; break;
          case "lte": passAll = bothNumeric ? nVal <= nTarget : valueStr <= target; break;
          case "gt": passAll = bothNumeric ? nVal > nTarget : valueStr > target; break;
          case "gte": passAll = bothNumeric ? nVal >= nTarget : valueStr >= target; break;
          case "contains": passAll = valueStr.toLowerCase().includes((target || "").toLowerCase()); break;
          case "ncontains": passAll = !valueStr.toLowerCase().includes((target || "").toLowerCase()); break;
          default: passAll = true;
        }
        if (!passAll) break;
      }
      if (!passAll) continue;

      keptOriginalIndices.push(rowIndex);

      for (const c of crits) {
        const pair = llmPairs.find(p => p.id === c)!;
        const humanCol = mapping[c]?.humanColumn;
        const humanRaw = humanCol ? String(row[humanCol] ?? "").trim() : "";
        const humanMapped = mapping[c]?.humanValueMap?.[humanRaw];
        const humanInclude = humanMapped ? humanMapped === "include" : false;
        const labelCol = pair.labelCol;
        const probCol = pair.probCol;
        const rawLabel = String(row[labelCol] ?? "");
        const rawProb = probCol ? parseNumber(row[probCol]) : undefined;
        const llmMapped = mapping[c]?.llmValueMap?.[rawLabel];
        let base: boolean | null = llmMapped !== undefined ? (llmMapped === "include") : coerceLlmLabelToBoolean(rawLabel);
        // Only apply thresholds if probCol exists
        const finalVal = probCol ? applyThresholds(base, rawProb, thresholds[c] || { yesMaybeMinProb: 0.5, noMinProb: 0.5 }, rawLabel) : base;
        const llmInclude = finalVal === null ? false : finalVal;
        
        // Apply moderation decisions
        const moderation = moderationDecisions[c]?.[rowIndex];
        let truth = humanInclude;
        let pred = llmInclude;
        
        if (moderation === 'human') {
          // Agree with human: keep original truth, keep original pred
          // This confirms the human was correct, classification stays as is (FP/FN if they disagree)
          // No change needed
        } else if (moderation === 'llm') {
          // Agree with LLM: adjust human truth to match LLM
          // This corrects the human annotation, making it TP or TN
          truth = llmInclude;
        }
        
        truthByCriterion[c].push(truth);
        predByCriterion[c].push(pred);
      }
    }

    const confusionByCriterion: Record<CriterionKey, Confusion> = Object.fromEntries(
      crits.map(c => [c, computeConfusion(truthByCriterion[c], predByCriterion[c])])
    ) as Record<CriterionKey, Confusion>;

    const rowIndicesByCriterion: Record<CriterionKey, { tp: number[]; tn: number[]; fp: number[]; fn: number[] }> = Object.fromEntries(
      crits.map(c => [c, { tp: [], tn: [], fp: [], fn: [] }])
    ) as Record<CriterionKey, { tp: number[]; tn: number[]; fp: number[]; fn: number[] }>;
    for (const c of crits) {
      const tArr = truthByCriterion[c];
      const pArr = predByCriterion[c];
      for (let i = 0; i < tArr.length; i++) {
        const t = tArr[i];
        const p = pArr[i];
        const originalIndex = keptOriginalIndices[i] ?? i;
        if (t && p) rowIndicesByCriterion[c].tp.push(originalIndex);
        else if (!t && !p) rowIndicesByCriterion[c].tn.push(originalIndex);
        else if (!t && p) rowIndicesByCriterion[c].fp.push(originalIndex);
        else if (t && !p) rowIndicesByCriterion[c].fn.push(originalIndex);
      }
    }

    // Correlations between criteria errors (FP and FN vectors)
    const errorVectors: Record<CriterionKey, { fp: number[]; fn: number[] }> = Object.fromEntries(
      crits.map(c => [c, { fp: [], fn: [] }])
    ) as Record<CriterionKey, { fp: number[]; fn: number[] }>;

    const n = keptOriginalIndices.length;
    for (let i = 0; i < n; i++) {
      for (const c of crits) {
        const t = truthByCriterion[c][i];
        const p = predByCriterion[c][i];
        errorVectors[c].fp.push(!t && p ? 1 : 0);
        errorVectors[c].fn.push(t && !p ? 1 : 0);
      }
    }

    const corr: Record<string, number | null> = {};
    for (let i = 0; i < crits.length; i++) {
      for (let j = i + 1; j < crits.length; j++) {
        const a = crits[i];
        const b = crits[j];
        corr[`${a}-fp_vs_${b}-fp`] = pearson(errorVectors[a].fp, errorVectors[b].fp);
        corr[`${a}-fn_vs_${b}-fn`] = pearson(errorVectors[a].fn, errorVectors[b].fn);
        corr[`${a}-fp_vs_${b}-fn`] = pearson(errorVectors[a].fp, errorVectors[b].fn);
        corr[`${a}-fn_vs_${b}-fp`] = pearson(errorVectors[a].fn, errorVectors[b].fp);
      }
    }

    // Overall accuracy across all criteria
    const allTruth: number[] = [];
    const allPred: number[] = [];
    for (const c of crits) {
      for (let i = 0; i < truthByCriterion[c].length; i++) {
        allTruth.push(truthByCriterion[c][i] ? 1 : 0);
        allPred.push(predByCriterion[c][i] ? 1 : 0);
      }
    }
    const overallAccuracy = allTruth.length
      ? allTruth.reduce((acc, t, idx) => acc + (t === allPred[idx] ? 1 : 0), 0) / allTruth.length
      : 0;

    return { truthByCriterion, predByCriterion, confusionByCriterion, correlations: corr, overallAccuracy, rowIndicesByCriterion };
  }, [rows, header, llmPairs, mapping, thresholds, filtersByCriterion, moderationDecisions]);

  const isMappingValid = useMemo(() => {
    const included = llmPairs.filter(p => mapping[p.id]?.include);
    if (included.length === 0) return false;
    return included.every(p => {
      const humanCol = mapping[p.id]?.humanColumn;
      if (!humanCol) return false;
      const humanVals = getUniqueValues(rows, humanCol);
      const llmVals = getUniqueValues(rows, p.labelCol);
      const humanAllMapped = humanVals.length > 0 && humanVals.every(v => !!mapping[p.id]?.humanValueMap?.[v]);
      const llmAllMapped = llmVals.length > 0 && llmVals.every(v => !!mapping[p.id]?.llmValueMap?.[v]);
      return humanAllMapped && llmAllMapped;
    });
  }, [llmPairs, mapping, rows]);

  useEffect(() => {
    setSavedMappings(getAllSavedMappings());
  }, []);

  function extractModelFromFilename(filename: string): string {
    // Pattern: extracted_fields_{jobId}_{modelName}.csv
    const match = filename.match(/extracted_fields_\d+_(.+)\.csv$/i);
    if (match && match[1]) {
      return match[1];
    }
    return "";
  }

  function handleFile(file: File) {
    const extractedModel = extractModelFromFilename(file.name);
    setModelName(extractedModel);
    setUploadedFilename(file.name);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as Row[];
        const fields = res.meta.fields || [];
        setRows(data);
        setHeader(fields);
        const pairs = detectLlmPairs(fields);
        setLlmPairs(pairs);
        // initialize mapping draft
        const persisted = loadPersistedMapping(fields, pairs);
        if (persisted) {
          setMapping(persisted.mapping);
          setFiltersByCriterion(persisted.filters || {});
        } else {
          const m: Mapping = {};
          for (const p of pairs) {
            m[p.id] = { include: true, humanColumn: undefined, humanValueMap: {}, llmValueMap: {} };
          }
          setMapping(m);
          setFiltersByCriterion({});
        }
        // initialize thresholds for any new criteria
        setThresholds((prev) => {
          const next = { ...prev } as CriteriaThresholds;
          for (const p of pairs) {
            if (!next[p.id]) next[p.id] = { yesMaybeMinProb: 0.5, noMinProb: 0.5 };
          }
          return next;
        });
        // select all criteria by default for correlation view
        setSelectedCriteria(Object.fromEntries(pairs.map(p => [p.id, true])) as Record<string, boolean>);
        setIsMappingOpen(true);
        setMappingConfirmed(false);
      },
      error: (err) => {
        console.error("CSV parse error", err);
      },
    });
  }

  function handleExportMapping() {
    const exportData = {
      mapping,
      filters: filtersByCriterion,
      llmPairs: pairsSignature(llmPairs),
      exportedAt: new Date().toISOString(),
    };
    downloadJson("llm-eval-mapping.json", exportData);
  }

  function handleImportMappingFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        applyImportedMapping(data);
      } catch (err) {
        console.error("Failed to parse mapping file:", err);
      }
    };
    reader.readAsText(file);
  }

  function applyImportedMapping(data: any) {
    if (!data?.mapping || !data?.llmPairs) return;
    
    // Check compatibility: all llmPairs from import must exist in current data
    const currentPairIds = new Set(llmPairs.map(p => p.id));
    const importedPairs = data.llmPairs as Array<{ labelCol: string; probCol?: string }>;
    const importedMapping = data.mapping as Mapping;
    
    // Only apply mapping for pairs that exist
    const compatibleMapping: Mapping = {};
    for (const [key, value] of Object.entries(importedMapping)) {
      if (currentPairIds.has(key)) {
        compatibleMapping[key] = value;
      }
    }
    
    if (Object.keys(compatibleMapping).length === 0) {
      console.warn("Imported mapping not compatible with current data");
      return;
    }
    
    setMapping((prev) => ({ ...prev, ...compatibleMapping }));
    if (data.filters) {
      setFiltersByCriterion((prev) => ({ ...prev, ...data.filters }));
    }
  }

  function handleApplySavedMapping() {
    if (!selectedSavedMapping) return;
    const saved = savedMappings.find(m => m.id === selectedSavedMapping);
    if (!saved) return;
    
    applyImportedMapping({
      mapping: saved.mapping,
      filters: saved.filters,
      llmPairs: saved.llmPairs,
    });
    setSelectedSavedMapping("");
  }

  function handleDeleteSavedMapping(id: string) {
    deleteSavedMapping(id);
    setSavedMappings(getAllSavedMappings());
    if (selectedSavedMapping === id) {
      setSelectedSavedMapping("");
    }
  }

  function handleConfirmMapping() {
    savePersistedMapping(header, llmPairs, mapping, filtersByCriterion);
    saveToMappingLibrary(uploadedFilename || "unknown.csv", mapping, filtersByCriterion, llmPairs);
    setSavedMappings(getAllSavedMappings());
    setIsMappingOpen(false);
    setMappingConfirmed(true);
  }

  function handleAddManualColumn() {
    if (!manualColumnSelection) return;
    
    // Check if this column already exists in llmPairs
    const existingPair = llmPairs.find(p => p.id === manualColumnSelection);
    
    if (existingPair) {
      // If it exists, just set include to true
      setMapping((prev) => ({
        ...prev,
        [existingPair.id]: { ...prev[existingPair.id], include: true },
      }));
    } else {
      // If it doesn't exist, create a new pair
      const newPair: LlmPair = {
        id: manualColumnSelection,
        labelCol: manualColumnSelection,
        probCol: undefined,
        display: manualColumnSelection,
      };
      setLlmPairs((prev) => [newPair, ...prev]);
      setMapping((prev) => ({
        ...prev,
        [newPair.id]: { include: true, humanColumn: undefined, humanValueMap: {}, llmValueMap: {} },
      }));
    }
    
    setSelectedCriteria((prev) => ({ ...prev, [manualColumnSelection]: true }));
    setManualColumnSelection("");
  }

  function handleExport() {
    if (!parsed) return;
    const criteriaWithProb = critList.filter(c => llmPairs.find(p => p.id === c.key)?.probCol !== undefined);
    const criteriaWithoutProb = critList.filter(c => llmPairs.find(p => p.id === c.key)?.probCol === undefined);
    const exportObj = {
      ...(modelName && { model: modelName }),
      thresholds,
      mapping,
      llmPairs,
      metrics: parsed.confusionByCriterion,
      overallAccuracy: parsed.overallAccuracy,
      correlations: parsed.correlations,
      filters: filtersByCriterion,
      includedCriteria: critList.map(c => c.label),
      probabilityAvailability: {
        withProbabilities: criteriaWithProb.map(c => c.label),
        withoutProbabilities: criteriaWithoutProb.map(c => c.label),
        note: criteriaWithoutProb.length > 0 
          ? "Some criteria do not have probability columns. Probability thresholds were not applied to these criteria."
          : "All criteria have probability columns available.",
      },
      humanCounts: Object.fromEntries(
        critList.map(({ key, label }) => {
          const truths = parsed.truthByCriterion[key] || [];
          const total = truths.length;
          const humanInclude = truths.reduce((a, b) => a + (b ? 1 : 0), 0);
          const humanExclude = total - humanInclude;
          return [label, { total, humanInclude, humanExclude }];
        })
      ),
      generatedAt: new Date().toISOString(),
    };
    const file = sanitizeFileName(reportName || "llm-eval-report");
    downloadJson(`${file}.json`, exportObj);
  }

  function handleExportPDF() {
    if (!parsed) return;
    const date = new Date().toLocaleString();
    const includedCriteria = critList.map(c => c.label).join(", ");
    const criteriaWithProb = critList.filter(c => llmPairs.find(p => p.id === c.key)?.probCol !== undefined);
    const criteriaWithoutProb = critList.filter(c => llmPairs.find(p => p.id === c.key)?.probCol === undefined);
    const probNote = criteriaWithoutProb.length > 0 
      ? `<div style="background: #fff3cd; padding: 12px; border-radius: 4px; margin: 12px 0; border-left: 4px solid #ffc107;">
           <strong>Note:</strong> The following criteria do not have probability columns: ${criteriaWithoutProb.map(c => c.label).join(", ")}. 
           Probability thresholds were not applied to these criteria.
         </div>`
      : "";
    const thresholdsHtml = critList.map(c => {
      const pair = llmPairs.find(p => p.id === c.key);
      const hasProb = pair?.probCol !== undefined;
      if (hasProb) {
        const t = thresholds[c.key];
        return `<tr><td>${c.label}</td><td>${t.yesMaybeMinProb.toFixed(2)}</td><td>${t.noMinProb.toFixed(2)}</td></tr>`;
      } else {
        return `<tr><td>${c.label}</td><td colspan="2" style="color: #666; font-style: italic;">No probabilities available</td></tr>`;
      }
    }).join("");
    const mappingHtml = llmPairs.filter(p => mapping[p.id]?.include).map(p => {
      const humanCol = mapping[p.id]?.humanColumn || '-';
      const hv = mapping[p.id]?.humanValueMap || {};
      const lv = mapping[p.id]?.llmValueMap || {};
      const hRows = Object.entries(hv).map(([v, m]) => `<tr><td>${humanCol}</td><td>${v || '&lt;empty&gt;'}</td><td>${m}</td></tr>`).join("");
      const lRows = Object.entries(lv).map(([v, m]) => `<tr><td>${p.labelCol}</td><td>${v || '&lt;empty&gt;'}</td><td>${m}</td></tr>`).join("");
      return `<h3 style=\"font-size:14px; margin:16px 0 4px;\">${p.display}</h3>
      <table><thead><tr><th>Column</th><th>Value</th><th>Mapping</th></tr></thead><tbody>${hRows}${lRows}</tbody></table>`;
    }).join("");
    const filtersHtml = llmPairs.filter(p => mapping[p.id]?.include).map(p => {
      const f = filtersByCriterion[p.id];
      if (!f?.enabled || !f.column || !f.operator) return `<tr><td>${p.display}</td><td>-</td><td>-</td><td>-</td></tr>`;
      return `<tr><td>${p.display}</td><td>${f.column}</td><td>${f.operator}</td><td>${f.value ?? ''}</td></tr>`;
    }).join("");
    const rowsHtml = critList.map(({ key, label }) => {
      const m = parsed.confusionByCriterion[key];
      const pct = (v: number) => m.total ? `${((v / m.total) * 100).toFixed(1)}%` : "-";
      return `
        <tr>
          <td>${label}</td>
          <td>${m.tp} (${pct(m.tp)})</td>
          <td>${m.tn} (${pct(m.tn)})</td>
          <td>${m.fp} (${pct(m.fp)})</td>
          <td>${m.fn} (${pct(m.fn)})</td>
          <td>${(m.accuracy * 100).toFixed(1)}%</td>
          <td>${m.precision == null ? '-' : (m.precision * 100).toFixed(1) + '%'}</td>
          <td>${m.recall == null ? '-' : (m.recall * 100).toFixed(1) + '%'}</td>
          <td>${m.f1 == null ? '-' : (m.f1 * 100).toFixed(1) + '%'}</td>
        </tr>`;
    }).join("");
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(reportName || 'LLM Eval Report')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111; }
    h1 { margin: 0 0 8px; font-size: 20px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
    .section { margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f7f7f7; }
  </style>
  <script>
    function doPrint(){ setTimeout(function(){ window.print(); }, 300); }
  </script>
  </head>
  <body onload="doPrint()">
    <h1>${escapeHtml(reportName || 'LLM Evaluation Report')}</h1>
    <div class="meta">Generated ${date}</div>
    ${modelName ? `<div style="margin: 12px 0; padding: 8px 12px; background: #f0f0f0; border-radius: 4px; font-size: 14px;"><strong>Model:</strong> ${escapeHtml(modelName)}</div>` : ''}
    <div class="section">
      <h2 style="font-size:16px; margin:0 0 8px;">Settings</h2>
      <div style="margin: 6px 0 12px;">Included criteria: ${escapeHtml(includedCriteria)}</div>
      ${probNote}
      <h3 style="font-size:14px; margin:0 0 4px;">Thresholds</h3>
      <table><thead><tr><th>Criteria</th><th>Yes/Maybe min prob</th><th>No min prob</th></tr></thead><tbody>${thresholdsHtml}</tbody></table>
      <h3 style="font-size:14px; margin:16px 0 4px;">Mappings</h3>
      ${mappingHtml}
      <h3 style="font-size:14px; margin:16px 0 4px;">Filters</h3>
      <table><thead><tr><th>Criteria</th><th>Column</th><th>Operator</th><th>Value</th></tr></thead><tbody>${filtersHtml}</tbody></table>
    </div>
    <div class="section">
      <h2 style="font-size:16px; margin:0 0 8px;">Overall Accuracy</h2>
      <div style="font-size:24px; font-weight:600;">${(parsed.overallAccuracy * 100).toFixed(2)}%</div>
    </div>
    <div class="section">
      <h2 style="font-size:16px; margin:0 0 8px;">Human Inclusion/Exclusion</h2>
      <table>
        <thead>
          <tr>
            <th>Criteria</th>
            <th>Total rows considered</th>
            <th>Human Inclusion (n)</th>
            <th>Human Exclusion (n)</th>
          </tr>
        </thead>
        <tbody>
          ${critList.map(({ key, label }) => {
            const truths = parsed.truthByCriterion[key] || [];
            const total = truths.length;
            const humanInclude = truths.reduce((a, b) => a + (b ? 1 : 0), 0);
            const humanExclude = total - humanInclude;
            return `<tr><td>${label}</td><td>${total}</td><td>${humanInclude}</td><td>${humanExclude}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="section">
      <h2 style="font-size:16px; margin:0 0 8px;">Per-criteria Metrics</h2>
      <table>
        <thead>
          <tr>
            <th>Criteria</th>
            <th>TP</th>
            <th>TN</th>
            <th>FP (Inclusion Error)</th>
            <th>FN (Exclusion Error)</th>
            <th>Accuracy</th>
            <th>Precision</th>
            <th>Recall</th>
            <th>F1</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
    <div class="section">
      <h2 style="font-size:16px; margin:0 0 8px;">Error Correlations</h2>
      <table>
        <thead>
          <tr>
            <th>Pair</th>
            <th>r</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(parsed.correlations).map(([k, v]) => `<tr><td>${k}</td><td>${v==null?'-':v.toFixed(3)}</td></tr>`).join("")}
        </tbody>
      </table>
    </div>
  </body>
</html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function sanitizeFileName(name: string): string {
    return (name || "report").replace(/[\\/:*?"<>|]+/g, "").trim().replace(/\s+/g, "_").slice(0, 100);
  }

  function escapeHtml(s: string): string {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function handleExportModeratedCSV() {
    if (!parsed) return;
    
    const totalModerations = Object.values(moderationDecisions).reduce((sum, decisions) => sum + Object.keys(decisions).length, 0);
    if (totalModerations === 0) return;
    
    // Build CSV rows
    const csvRows: string[][] = [];
    
    // Header row: all original columns + new columns for each criterion
    const headerRow = [...header];
    for (const { key, label } of critList) {
      headerRow.push(`${label}_Original_Classification`);
      headerRow.push(`${label}_Moderation`);
      headerRow.push(`${label}_New_Classification`);
    }
    csvRows.push(headerRow);
    
    // Helper to get classification for a row
    const getClassification = (rowIndex: number, criterionKey: string, moderated: boolean): string => {
      const pair = llmPairs.find(p => p.id === criterionKey);
      if (!pair) return '';
      
      const row = rows[rowIndex];
      const humanCol = mapping[criterionKey]?.humanColumn;
      const humanVal = humanCol ? String(row[humanCol] ?? "").trim() : "";
      const humanMapped = mapping[criterionKey]?.humanValueMap?.[humanVal];
      const humanInclude = humanMapped ? humanMapped === "include" : false;
      
      const llmVal = String(row[pair.labelCol] ?? "");
      const probCol = pair.probCol;
      const rawProb = probCol ? parseNumber(row[probCol]) : undefined;
      const llmMap = mapping[criterionKey]?.llmValueMap || {};
      const mapped = llmMap[llmVal];
      let base: boolean | null = mapped !== undefined ? (mapped === "include") : coerceLlmLabelToBoolean(llmVal);
      const t = thresholds[criterionKey] || { yesMaybeMinProb: 0.5, noMinProb: 0.5 };
      const finalVal = probCol ? applyThresholds(base, rawProb, t, llmVal) : base;
      const llmInclude = finalVal === null ? false : finalVal;
      
      let truth = humanInclude;
      let pred = llmInclude;
      
      if (moderated) {
        const moderation = moderationDecisions[criterionKey]?.[rowIndex];
        if (moderation === 'llm') {
          truth = llmInclude;
        }
      }
      
      if (truth && pred) return 'TP';
      if (!truth && !pred) return 'TN';
      if (!truth && pred) return 'FP';
      return 'FN';
    };
    
    // Data rows
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const dataRow = header.map(col => {
        const val = row[col];
        const str = val === null || val === undefined ? '' : String(val);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      
      // Add classification columns for each criterion
      for (const { key } of critList) {
        const originalClassification = getClassification(rowIndex, key, false);
        const moderation = moderationDecisions[key]?.[rowIndex] || '';
        const moderationStr = moderation === 'human' ? 'Confirmed Human' : moderation === 'llm' ? 'Corrected to LLM' : '';
        const newClassification = moderation ? getClassification(rowIndex, key, true) : originalClassification;
        
        dataRow.push(originalClassification);
        dataRow.push(moderationStr);
        dataRow.push(newClassification);
      }
      
      csvRows.push(dataRow);
    }
    
    // Convert to CSV string
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    
    // Generate filename
    const baseFilename = uploadedFilename.replace(/\.csv$/i, '') || 'data';
    const filename = `${totalModerations}_moderated_${baseFilename}.csv`;
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderMetricCell(value: number | null) {
    if (value === null || Number.isNaN(value)) return "-";
    return value.toFixed(3);
  }

  function updateThreshold(criterion: CriterionKey, key: keyof Thresholds, value: number[]) {
    const v = value[0] ?? 0;
    setThresholds((prev) => ({
      ...prev,
      [criterion]: {
        ...prev[criterion],
        [key]: Math.max(0, Math.min(1, v)),
      },
    }));
  }

  const critList: { key: CriterionKey; label: string }[] = useMemo(() => {
    return llmPairs.filter(p => mapping[p.id]?.include).map(p => ({ key: p.id, label: p.display }));
  }, [llmPairs, mapping]);

  function corrColor(v: number | null): string {
    if (v === null || Number.isNaN(v)) return "transparent";
    // map [-1,1] to hue [0 (red), 120 (green)] via (-1 -> 0, 0 -> 60 yellow, 1 -> 120)
    const hue = ((v + 1) / 2) * 120;
    const sat = 70;
    const light = 90 - Math.abs(v) * 35; // stronger corr -> darker
    return `hsl(${hue} ${sat}% ${light}%)`;
  }

  return (
    <div className="p-4 space-y-6">
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[95vw] p-0">
          <DialogHeader className="p-4">
            <DialogTitle>
              Rows: {detailMeta?.criterion} – {detailMeta?.bucket?.toUpperCase()}
              {(() => {
                if (!detailMeta) return null;
                const pair = llmPairs.find(p => p.display === detailMeta.criterion);
                if (!pair) return null;
                const moderatedCount = moderationDecisions[pair.id] ? Object.keys(moderationDecisions[pair.id]).length : 0;
                if (moderatedCount > 0) {
                  return <span className="ml-2 text-sm font-normal text-blue-600">({moderatedCount} moderated)</span>;
                }
                return null;
              })()}
            </DialogTitle>
            <DialogDescription>
              "Agree with Human" confirms human annotation (keeps classification). 
              "Agree with LLM" corrects human annotation to match LLM (changes to TP/TN).
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 pb-4 space-y-4">
            <div className="overflow-auto max-h-[60vh] border rounded-md">
              <div className="overflow-x-auto">
                {(() => {
                  if (!detailMeta || !parsed) return null;
                  const pair = llmPairs.find(p => p.display === detailMeta.criterion);
                  if (!pair) return <div className="p-4 text-sm text-muted-foreground">Pair not found.</div>;
                  
                  // Use static indices from when modal opened
                  const indices = detailMeta.indices || [];
                  
                  const humanCol = mapping[pair.id]?.humanColumn;
                  const humanMap = mapping[pair.id]?.humanValueMap || {};
                  const llmMap = mapping[pair.id]?.llmValueMap || {};
                  const t = thresholds[pair.id] || { yesMaybeMinProb: 0.5, noMinProb: 0.5 };
                  const hasProb = pair.probCol !== undefined;
                  const hasJustification = header.includes("Justification");
                  const cols: string[] = ["Row", "Human column", "Human value", "Human decision", "LLM column", "LLM value", "LLM decision"];
                  if (hasProb) cols.push("LLM prob");
                  if (hasJustification) cols.push("Justification");
                  cols.push("Abstract");
                  
                  // Helper to compute current bucket for a row
                  const getCurrentBucket = (idx: number): 'tp' | 'tn' | 'fp' | 'fn' => {
                    const r = rows[idx];
                    const humanVal = humanCol ? String(r[humanCol] ?? "").trim() : "";
                    const humanMapped = mapping[pair.id]?.humanValueMap?.[humanVal];
                    const humanInclude = humanMapped ? humanMapped === "include" : false;
                    
                    const llmVal = String(r[pair.labelCol] ?? "");
                    const rawProb = hasProb && pair.probCol ? parseNumber(r[pair.probCol]) : undefined;
                    const mapped = llmMap[llmVal];
                    let base: boolean | null = mapped !== undefined ? (mapped === "include") : coerceLlmLabelToBoolean(llmVal);
                    const finalVal = hasProb ? applyThresholds(base, rawProb, t, llmVal) : base;
                    const llmInclude = finalVal === null ? false : finalVal;
                    
                    const moderation = moderationDecisions[pair.id]?.[idx];
                    let truth = humanInclude;
                    let pred = llmInclude;
                    
                    if (moderation === 'human') {
                      // Agree with human: keep original, no change to classification
                    } else if (moderation === 'llm') {
                      // Agree with LLM: correct human truth to match LLM
                      truth = llmInclude;
                    }
                    
                    if (truth && pred) return 'tp';
                    if (!truth && !pred) return 'tn';
                    if (!truth && pred) return 'fp';
                    return 'fn';
                  };
                  
                  return (
                    <Table containerClassName="max-h-[60vh]">
                      <TableHeader className="sticky top-0 z-20">
                        <TableRow className="bg-background">
                          {cols.map((c) => (<TableHead key={c} className="bg-background">{c}</TableHead>))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indices.map((idx) => {
                          const r = rows[idx] as Row;
                          const humanVal = humanCol ? String(r[humanCol] ?? "") : "";
                          const humanDecision = humanMap[humanVal] || "-";
                          const humanIncludeOriginal = humanDecision === "include";
                          const llmVal = String(r[pair.labelCol] ?? "");
                          const prob = hasProb && pair.probCol ? parseNumber(r[pair.probCol]) : undefined;
                          const mapped = llmMap[llmVal];
                          let base: boolean | null = mapped !== undefined ? (mapped === "include") : coerceLlmLabelToBoolean(llmVal);
                          const finalVal = hasProb ? applyThresholds(base, prob, t, llmVal) : base;
                          const llmIncludeOriginal = finalVal === null ? false : finalVal;
                          const llmDecision = llmIncludeOriginal ? "include" : "exclude";
                          const justificationVal = hasJustification ? String(r["Justification"] ?? "") : "";
                          const abstractVal = String(r["Abstract"] ?? "");
                          const currentModeration = moderationDecisions[pair.id]?.[idx];
                          const currentBucket = getCurrentBucket(idx);
                          const originalBucket = detailMeta.bucket;
                          
                          // Build detailed status text
                          let statusText = originalBucket.toUpperCase();
                          if (currentModeration === 'human') {
                            // Agreed with human: confirms human was correct, classification unchanged
                            const humanDecision = humanIncludeOriginal ? 'include' : 'exclude';
                            statusText += ` → Confirmed Human (${humanDecision})`;
                          } else if (currentModeration === 'llm') {
                            // Agreed with LLM: corrects human annotation, classification changes
                            const llmDecision = llmIncludeOriginal ? 'include' : 'exclude';
                            statusText += ` → Corrected to LLM (${llmDecision})`;
                            if (currentBucket !== originalBucket) {
                              statusText += ` → ${currentBucket.toUpperCase()}`;
                            }
                          }
                          const statusChanged = currentBucket !== originalBucket;
                          
                          return (
                            <React.Fragment key={idx}>
                              <TableRow className={statusChanged ? 'bg-blue-50 dark:bg-blue-950' : ''}>
                                <TableCell className="text-xs">{idx + 1}</TableCell>
                                <TableCell className="text-xs">{humanCol || '-'}</TableCell>
                                <TableCell className="whitespace-pre-wrap break-words text-xs">{humanVal || '<empty>'}</TableCell>
                                <TableCell className="text-xs">{humanDecision}</TableCell>
                                <TableCell className="text-xs">{pair.labelCol}</TableCell>
                                <TableCell className="whitespace-pre-wrap break-words text-xs">{llmVal || '<empty>'}</TableCell>
                                <TableCell className="text-xs">{llmDecision}</TableCell>
                                {hasProb && <TableCell className="text-xs">{prob === undefined ? '-' : prob.toFixed(3)}</TableCell>}
                                {hasJustification && <TableCell className="whitespace-pre-wrap break-words text-xs min-w-[300px]">{justificationVal || '-'}</TableCell>}
                                <TableCell className="whitespace-pre-wrap break-words text-xs min-w-[420px]">{abstractVal}</TableCell>
                              </TableRow>
                              <TableRow className={statusChanged ? 'bg-blue-50 dark:bg-blue-950 border-b-2' : 'border-b-2'}>
                                <TableCell colSpan={cols.length} className="py-2">
                                  <div className="flex gap-2 items-center">
                                    <span className="text-xs text-muted-foreground mr-2">
                                      Status: <span className={statusChanged ? 'font-semibold text-blue-600' : 'font-medium'}>{statusText}</span>
                                    </span>
                                    <Button 
                                      size="sm" 
                                      variant={currentModeration === 'human' ? 'default' : 'outline'}
                                      onClick={() => {
                                        setModerationDecisions(prev => {
                                          const next = { ...prev };
                                          // Deep copy the nested object to avoid mutation
                                          next[pair.id] = { ...(prev[pair.id] || {}) };
                                          if (next[pair.id][idx] === 'human') {
                                            delete next[pair.id][idx];
                                          } else {
                                            next[pair.id][idx] = 'human';
                                          }
                                          return next;
                                        });
                                      }}
                                      className="text-xs h-7 px-3"
                                    >
                                      Agree with Human
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant={currentModeration === 'llm' ? 'default' : 'outline'}
                                      onClick={() => {
                                        setModerationDecisions(prev => {
                                          const next = { ...prev };
                                          // Deep copy the nested object to avoid mutation
                                          next[pair.id] = { ...(prev[pair.id] || {}) };
                                          if (next[pair.id][idx] === 'llm') {
                                            delete next[pair.id][idx];
                                          } else {
                                            next[pair.id][idx] = 'llm';
                                          }
                                          return next;
                                        });
                                      }}
                                      className="text-xs h-7 px-3"
                                    >
                                      Agree with LLM
                                    </Button>
                                    {currentModeration && (
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => {
                                          setModerationDecisions(prev => {
                                            const next = { ...prev };
                                            // Deep copy the nested object to avoid mutation
                                            next[pair.id] = { ...(prev[pair.id] || {}) };
                                            if (next[pair.id]?.[idx]) {
                                              delete next[pair.id][idx];
                                            }
                                            return next;
                                          });
                                        }}
                                        className="text-xs h-7 px-2"
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  );
                })()}
              </div>
            </div>
            {detailMeta && parsed && (() => {
              const pair = llmPairs.find(p => p.display === detailMeta.criterion);
              if (!pair) return null;
              const indices = detailMeta.indices || [];
              
              return (
                <div className="border rounded-md p-4 bg-muted/30">
                  <div className="text-sm font-medium mb-3">Bulk Actions</div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={() => {
                        setModerationDecisions(prev => {
                          const next = { ...prev };
                          // Deep copy the nested object to avoid mutation
                          next[pair.id] = { ...(prev[pair.id] || {}) };
                          for (const idx of indices) {
                            next[pair.id][idx] = 'human';
                          }
                          return next;
                        });
                      }}
                    >
                      Confirm Human on All (No Change)
                    </Button>
                    <Button
                      onClick={() => {
                        setModerationDecisions(prev => {
                          const next = { ...prev };
                          // Deep copy the nested object to avoid mutation
                          next[pair.id] = { ...(prev[pair.id] || {}) };
                          for (const idx of indices) {
                            next[pair.id][idx] = 'llm';
                          }
                          return next;
                        });
                      }}
                    >
                      Correct to LLM on All (→ TP/TN)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModerationDecisions(prev => {
                          const next = { ...prev };
                          // Deep copy the nested object to avoid mutation
                          next[pair.id] = { ...(prev[pair.id] || {}) };
                          for (const idx of indices) {
                            delete next[pair.id][idx];
                          }
                          return next;
                        });
                      }}
                    >
                      Clear All Moderations
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle>LLM Evaluation</CardTitle>
          <CardDescription>
            Upload a CSV with human truth in separate columns for each evaluated label and LLM outputs with optional log probs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-2">
              <Label htmlFor="csv">CSV file</Label>
              <Input id="csv" type="file" accept=".csv" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rname">Report name</Label>
              <Input id="rname" placeholder="LLM Eval Report" value={reportName} onChange={(e) => setReportName(e.target.value)} className="min-w-[220px]" />
            </div>
            <Button variant="secondary" onClick={handleExport} disabled={!parsed}>Export JSON</Button>
            <Button variant="secondary" onClick={handleExportPDF} disabled={!parsed}>Export PDF</Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setIsMappingOpen(true)} disabled={!rows.length}>Remap</Button>
          </div>
          {header.length > 0 && (
            <div className="space-y-1">
              {modelName && (
                <div className="text-sm">
                  <span className="font-medium">Model:</span> <span className="text-muted-foreground">{modelName}</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Configured LLM columns: {llmPairs.length}
                {llmPairs.length > 0 && (() => {
                  const withProb = llmPairs.filter(p => p.probCol).length;
                  const withoutProb = llmPairs.filter(p => !p.probCol).length;
                  if (withoutProb > 0) {
                    return <span> ({withProb} with probabilities, {withoutProb} without)</span>;
                  }
                  return null;
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Accordion type="single" collapsible defaultValue="">
        <AccordionItem value="thresholds">
          <AccordionTrigger>
            <div className="text-left w-full">Probability thresholds</div>
          </AccordionTrigger>
          <AccordionContent>
            <Card>
              <CardHeader>
                <CardTitle>Thresholds</CardTitle>
                <CardDescription>
                  Adjust per-criteria probability thresholds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {critList.map(({ key, label }) => {
                  const pair = llmPairs.find(p => p.id === key);
                  const hasProb = pair?.probCol !== undefined;
                  return (
                    <div key={key} className="space-y-4">
                      <div className="font-medium">{label}</div>
                      {hasProb ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label>LLM yes/maybe min probability (below {'>'} treat as no): {thresholds[key].yesMaybeMinProb.toFixed(2)}</Label>
                            <Slider value={[thresholds[key].yesMaybeMinProb]} min={0} max={1} step={0.01} onValueChange={(v) => updateThreshold(key, "yesMaybeMinProb", v)} />
                          </div>
                          <div>
                            <Label>LLM no min probability (below {'>'} treat as yes): {thresholds[key].noMinProb.toFixed(2)}</Label>
                            <Slider value={[thresholds[key].noMinProb]} min={0} max={1} step={0.01} onValueChange={(v) => updateThreshold(key, "noMinProb", v)} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          No probabilities available for this criteria
                        </div>
                      )}
                      <Separator />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {rows.length > 0 && (
        <Sheet open={isMappingOpen} onOpenChange={setIsMappingOpen}>
          <SheetContent side="right" className="w-[90vw] sm:max-w-5xl">
            <SheetHeader>
              <SheetTitle>Map human columns to LLM labels</SheetTitle>
              <SheetDescription>
                For each included label, pick one human column and map all its values, and map all LLM values.
              </SheetDescription>
            </SheetHeader>
            <div className="p-6 space-y-6 overflow-auto">
              <Accordion type="single" collapsible>
                <AccordionItem value="import" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="text-left">
                      <div className="font-medium text-sm">Import Mapping (Optional)</div>
                      <div className="text-xs text-muted-foreground font-normal">Load a previously saved configuration to save time</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Import from file</Label>
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            handleImportMappingFile(f);
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Separator className="flex-1" />
                      <span className="text-xs text-muted-foreground">OR</span>
                      <Separator className="flex-1" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Load from saved mappings ({savedMappings.length})</Label>
                      <div className="flex gap-2">
                        <Select value={selectedSavedMapping} onValueChange={setSelectedSavedMapping}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a saved mapping" />
                          </SelectTrigger>
                          <SelectContent>
                            {savedMappings.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()).map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={handleApplySavedMapping} disabled={!selectedSavedMapping}>
                          Apply
                        </Button>
                        {selectedSavedMapping && (
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteSavedMapping(selectedSavedMapping)}>
                            <span className="sr-only">Delete</span>
                            ×
                          </Button>
                        )}
                      </div>
                      {selectedSavedMapping && (() => {
                        const selected = savedMappings.find(m => m.id === selectedSavedMapping);
                        if (!selected) return null;
                        return (
                          <div className="text-xs text-muted-foreground space-y-1 mt-2 p-2 bg-muted rounded">
                            <div><strong>File:</strong> {selected.filename}</div>
                            <div><strong>Columns:</strong> {selected.includedColumnCount} ({selected.withProbabilitiesCount} with probabilities)</div>
                            <div><strong>Last used:</strong> {new Date(selected.lastUsed).toLocaleString()}</div>
                          </div>
                        );
                      })()}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Add LLM Column Manually</CardTitle>
                  <CardDescription>
                    Select any column to use as an LLM label column (useful for models without probability outputs)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Select column</Label>
                      <Select value={manualColumnSelection} onValueChange={setManualColumnSelection}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a column" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumnsForManualSelection.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddManualColumn} disabled={!manualColumnSelection}>
                      Add Column
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Separator />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {llmPairs.filter(p => mapping[p.id]?.include !== false).map((p) => (
                  <div key={p.id} className="space-y-3 border rounded-md p-4">
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate" title={p.display}>{p.display}</div>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={mapping[p.id]?.include ?? false}
                          onCheckedChange={(v) => setMapping((prev) => ({
                            ...prev,
                            [p.id]: { ...prev[p.id], include: Boolean(v) }
                          }))}
                        />
                        <span>Include</span>
                      </label>
                    </div>
                    <div className="text-xs text-muted-foreground break-all">
                      {p.labelCol}
                      {p.probCol && ` / ${p.probCol}`}
                      {!p.probCol && <span className="text-amber-600"> (no probabilities)</span>}
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Human column</Label>
                        <Select onValueChange={(v) => setMapping((prev) => ({
                          ...prev,
                          [p.id]: { ...prev[p.id], humanColumn: v, humanValueMap: {} }
                        }))} value={mapping[p.id]?.humanColumn || ""}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a human column" />
                          </SelectTrigger>
                          <SelectContent>
                            {humanColumnOptions.map((col) => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Row filter (optional)</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                          <div>
                            <Label className="text-xs">Column</Label>
                            <Select value={filtersByCriterion[p.id]?.column || ""} onValueChange={(val) => setFiltersByCriterion((prev) => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || { enabled: true }), enabled: true, column: val }
                            }))}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                {header.map((h) => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Operator</Label>
                            <Select value={filtersByCriterion[p.id]?.operator || ""} onValueChange={(val) => setFiltersByCriterion((prev) => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || { enabled: true }), enabled: true, operator: val as RowFilter["operator"] }
                            }))}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Op" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="eq">=</SelectItem>
                                <SelectItem value="neq">≠</SelectItem>
                                <SelectItem value="lt">&lt;</SelectItem>
                                <SelectItem value="lte">≤</SelectItem>
                                <SelectItem value="gt">&gt;</SelectItem>
                                <SelectItem value="gte">≥</SelectItem>
                                <SelectItem value="contains">contains</SelectItem>
                                <SelectItem value="ncontains">not contains</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Value</Label>
                            <Input value={filtersByCriterion[p.id]?.value || ""} onChange={(e) => setFiltersByCriterion((prev) => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || { enabled: true }), enabled: true, value: e.target.value }
                            }))} placeholder="Filter value" />
                          </div>
                        </div>
                        {filtersByCriterion[p.id]?.column && filtersByCriterion[p.id]?.operator && (
                          <div className="text-xs text-muted-foreground">Applied: {filtersByCriterion[p.id]?.column} {filtersByCriterion[p.id]?.operator} {filtersByCriterion[p.id]?.value ?? ''}</div>
                        )}
                      </div>
                      {mapping[p.id]?.humanColumn && (
                        <div className="space-y-2">
                          <Label className="text-xs">Map each human value to include/exclude</Label>
                          <div className="max-h-56 overflow-auto border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Human value</TableHead>
                                  <TableHead>Map to</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {getUniqueValues(rows, mapping[p.id]?.humanColumn).map((val) => (
                                  <TableRow key={val || "__empty_h__"}>
                                    <TableCell className="break-all text-xs">{val || '<empty>'}</TableCell>
                                    <TableCell>
                                      <Select value={mapping[p.id]?.humanValueMap?.[val] || ""} onValueChange={(sel) => setMapping((prev) => ({
                                        ...prev,
                                        [p.id]: { ...prev[p.id], humanValueMap: { ...prev[p.id].humanValueMap, [val]: sel as any } }
                                      }))}>
                                        <SelectTrigger className="w-40">
                                          <SelectValue placeholder="Choose" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="include">include</SelectItem>
                                          <SelectItem value="exclude">exclude</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="text-xs">Map each LLM value to include/exclude</Label>
                        <div className="max-h-56 overflow-auto border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>LLM value</TableHead>
                                <TableHead>Map to</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getUniqueValues(rows, p.labelCol).map((val) => (
                                <TableRow key={val || "__empty_llm__"}>
                                  <TableCell className="break-all text-xs">{val || '<empty>'}</TableCell>
                                  <TableCell>
                                    <Select value={mapping[p.id]?.llmValueMap?.[val] || ""} onValueChange={(sel) => setMapping((prev) => ({
                                      ...prev,
                                      [p.id]: { ...prev[p.id], llmValueMap: { ...prev[p.id].llmValueMap, [val]: sel as any } }
                                    }))}>
                                      <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Choose" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="include">include</SelectItem>
                                        <SelectItem value="exclude">exclude</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <SheetFooter>
              <div className="flex w-full justify-between items-center">
                <div className={`text-xs ${isMappingValid ? 'text-green-600' : 'text-red-600'}`}>
                  {isMappingValid ? 'Mapping valid' : 'Select a human column for each included label'}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportMapping}>Export Mapping</Button>
                  <Button disabled={!isMappingValid} onClick={handleConfirmMapping}>Confirm</Button>
                </div>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {parsed && mappingConfirmed && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Human Inclusion/Exclusion per Criteria</CardTitle>
              <CardDescription>Distribution of human labels interpreted as inclusion vs exclusion.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead>Human Inclusion</TableHead>
                    <TableHead>Human Exclusion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {critList.map(({ key, label }) => {
                    const inclCount = parsed.truthByCriterion[key].reduce((a, b) => a + (b ? 1 : 0), 0);
                    const total = parsed.truthByCriterion[key].length;
                    const exclCount = total - inclCount;
                    const pct = (v: number) => total ? `${((v / total) * 100).toFixed(1)}%` : "-";
                    return (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell>{inclCount} ({pct(inclCount)})</TableCell>
                        <TableCell>{exclCount} ({pct(exclCount)})</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Per-criteria Metrics</CardTitle>
              <CardDescription>
                TP, TN, FP, FN and derived metrics.
                {(() => {
                  const totalModerations = Object.values(moderationDecisions).reduce((sum, decisions) => sum + Object.keys(decisions).length, 0);
                  if (totalModerations > 0) {
                    return <span className="ml-2 text-sm font-medium text-blue-600">({totalModerations} moderated decision{totalModerations !== 1 ? 's' : ''})</span>;
                  }
                  return <span className="ml-2 text-sm text-muted-foreground italic">Click on TP/TN/FP/FN numbers to view and moderate rows</span>;
                })()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criteria</TableHead>
                    <TableHead>TP</TableHead>
                    <TableHead>TN</TableHead>
                    <TableHead>FP (Inclusion Error)</TableHead>
                    <TableHead>FN (Exclusion Error)</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Precision</TableHead>
                    <TableHead>Recall</TableHead>
                    <TableHead>F1</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {critList.map(({ key, label }) => {
                    const m = parsed.confusionByCriterion[key];
                    const pct = (v: number) => m.total ? `${((v / m.total) * 100).toFixed(1)}%` : "-";
                    return (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        <TableCell>
                          <button className="underline underline-offset-2" onClick={() => { setDetailMeta({ criterion: label, bucket: 'tp', indices: parsed.rowIndicesByCriterion[key].tp }); setDetailOpen(true); }}>{m.tp}</button> ({pct(m.tp)})
                        </TableCell>
                        <TableCell>
                          <button className="underline underline-offset-2" onClick={() => { setDetailMeta({ criterion: label, bucket: 'tn', indices: parsed.rowIndicesByCriterion[key].tn }); setDetailOpen(true); }}>{m.tn}</button> ({pct(m.tn)})
                        </TableCell>
                        <TableCell>
                          <button className="underline underline-offset-2" onClick={() => { setDetailMeta({ criterion: label, bucket: 'fp', indices: parsed.rowIndicesByCriterion[key].fp }); setDetailOpen(true); }}>{m.fp}</button> ({pct(m.fp)})
                        </TableCell>
                        <TableCell>
                          <button className="underline underline-offset-2" onClick={() => { setDetailMeta({ criterion: label, bucket: 'fn', indices: parsed.rowIndicesByCriterion[key].fn }); setDetailOpen(true); }}>{m.fn}</button> ({pct(m.fn)})
                        </TableCell>
                        <TableCell>{renderMetricCell(m.accuracy)}</TableCell>
                        <TableCell>{renderMetricCell(m.precision)}</TableCell>
                        <TableCell>{renderMetricCell(m.recall)}</TableCell>
                        <TableCell>{renderMetricCell(m.f1)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {(() => {
            const totalModerations = Object.values(moderationDecisions).reduce((sum, decisions) => sum + Object.keys(decisions).length, 0);
            if (totalModerations > 0) {
              return (
                <Card>
                  <CardHeader>
                    <CardTitle>Export Moderated Data</CardTitle>
                    <CardDescription>
                      Download a CSV file with all original data plus moderation decisions and corrected classifications.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground mb-2">
                          <strong>{totalModerations}</strong> moderation decision{totalModerations !== 1 ? 's' : ''} applied
                        </div>
                        <div className="text-xs text-muted-foreground">
                          The CSV will include all {rows.length} rows with original classifications, moderation decisions, and new classifications for each criterion.
                        </div>
                      </div>
                      <Button onClick={handleExportModeratedCSV}>
                        Download Moderated CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}

          <Card>
            <CardHeader>
              <CardTitle>Overall Accuracy</CardTitle>
              <CardDescription>Across all four criteria.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{(parsed.overallAccuracy * 100).toFixed(2)}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Correlations</CardTitle>
              <CardDescription>Pearson correlation of FP/FN between criteria (symmetric pairs).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {critList.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedCriteria[key]}
                      onCheckedChange={(v) => setSelectedCriteria((prev) => ({ ...prev, [key]: Boolean(v) }))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              {(() => {
                const selected = critList.filter(c => selectedCriteria[c.key]).map(c => c.key as CriterionKey);
                if (selected.length < 2) {
                  return <div className="text-sm text-muted-foreground">Select at least two criteria to compute correlations.</div>;
                }
                const errorVectors: Record<string, { fp: number[]; fn: number[] }> = Object.fromEntries(
                  selected.map((c) => [c, { fp: [], fn: [] }])
                );
                const n = parsed.truthByCriterion[selected[0]].length;
                for (let i = 0; i < n; i++) {
                  for (const c of selected) {
                    const t = parsed.truthByCriterion[c][i];
                    const p = parsed.predByCriterion[c][i];
                    errorVectors[c].fp.push(!t && p ? 1 : 0);
                    errorVectors[c].fn.push(t && !p ? 1 : 0);
                  }
                }
                const pairs: Array<{ key: string; val: number | null }> = [];
                for (let i = 0; i < selected.length; i++) {
                  for (let j = i + 1; j < selected.length; j++) {
                    const a = selected[i];
                    const b = selected[j];
                    pairs.push({ key: `${a}-fp_vs_${b}-fp`, val: pearson(errorVectors[a].fp, errorVectors[b].fp) });
                    pairs.push({ key: `${a}-fn_vs_${b}-fn`, val: pearson(errorVectors[a].fn, errorVectors[b].fn) });
                    pairs.push({ key: `${a}-fp_vs_${b}-fn`, val: pearson(errorVectors[a].fp, errorVectors[b].fn) });
                    pairs.push({ key: `${a}-fn_vs_${b}-fp`, val: pearson(errorVectors[a].fn, errorVectors[b].fp) });
                  }
                }
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pair</TableHead>
                        <TableHead>r</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pairs.map(({ key, val }) => (
                        <TableRow key={key} style={{ backgroundColor: corrColor(val) }}>
                          <TableCell>{key}</TableCell>
                          <TableCell>{val === null ? "-" : val.toFixed(3)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}


