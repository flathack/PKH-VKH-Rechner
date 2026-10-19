"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { parseAmount } from "./amounts.mjs";

export const AmountValidationContext = createContext<(id: string, error: string) => void>(() => {});

type Props = {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  hint?: string;
  optional?: boolean;
  fractionDigits?: number;
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
};

export default function AmountInput({ id, label, value, onChange, hint, optional = false, fractionDigits = 2, min = 0, max, unit = "€", placeholder }: Props) {
  const reportError = useContext(AmountValidationContext);
  const [draft, setDraft] = useState({ value, text: value == null || (!optional && value === 0) ? "" : String(value) });
  // Änderungen außerhalb dieses Felds (z. B. Rücksetzen) übernehmen; gültige
  // Tastatureingaben behalten dagegen ihren unveränderten Text samt Dezimalkomma.
  if (draft.value !== value) setDraft({ value, text: value == null ? "" : String(value) });
  const parsed = parseAmount(draft.text, { optional, fractionDigits, min, max });
  useEffect(() => { reportError(id, parsed.error ? `${label}: ${parsed.error}` : ""); }, [id, label, parsed.error, reportError]);
  useEffect(() => () => reportError(id, ""), [id, reportError]);

  return <label className="field" htmlFor={id}>
    <span className="field-label">{label}</span>
    <span className={unit === "€" ? "money-control" : undefined}>
      <input id={id} type="text" inputMode={fractionDigits === 0 ? "numeric" : "decimal"} autoComplete="off"
        value={draft.text} placeholder={placeholder ?? (optional ? "Nicht angegeben" : "0,00")}
        aria-invalid={Boolean(parsed.error)} aria-describedby={[hint ? `${id}-hint` : "", parsed.error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined}
        onChange={(event) => {
          const text = event.target.value;
          const next = parseAmount(text, { optional, fractionDigits, min, max });
          setDraft({ value: next.error ? value : next.value, text });
          reportError(id, next.error ? `${label}: ${next.error}` : "");
          if (!next.error) onChange(next.value);
        }} />
      {unit === "€" ? <span aria-hidden="true">€</span> : null}
    </span>
    {hint ? <small id={`${id}-hint`}>{hint}</small> : null}
    {parsed.error ? <small className="field-error" id={`${id}-error`} role="status">{parsed.error}</small> : null}
  </label>;
}
