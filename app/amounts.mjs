export const MAX_AMOUNT = 1_000_000_000;

/** Keine Gruppierungszeichen oder Exponenten: ein Trennzeichen ist immer dezimal. */
export function parseAmount(text, { optional = false, fractionDigits = 2, min = 0, max = MAX_AMOUNT } = {}) {
  const raw = text.trim();
  if (!raw) return optional ? { value: null, error: "" }
    : min === 0 ? { value: 0, error: "" } : { value: null, error: "Bitte eine Zahl eingeben." };
  const pattern = new RegExp(`^(?:\\d+|\\d*[.,]\\d{1,${Math.max(1, fractionDigits)}})$`);
  if (!pattern.test(raw) || (fractionDigits === 0 && /[.,]/.test(raw))) {
    return { value: null, error: fractionDigits === 0 ? "Bitte eine ganze Zahl eingeben." : `Bitte eine Zahl mit höchstens ${fractionDigits} Nachkommastellen eingeben. Punkt oder Komma sind als Dezimalzeichen möglich; keine Tausendertrennzeichen.` };
  }
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < min || value > max || !Number.isSafeInteger(Math.round(value * 100))) {
    return { value: null, error: `Bitte einen Wert zwischen ${min.toLocaleString("de-DE")} und ${max.toLocaleString("de-DE")} eingeben.` };
  }
  return { value, error: "" };
}

export function assertSafeCents(value) {
  if (!Number.isSafeInteger(value)) throw new RangeError("Der Betrag ist nicht als sichere Centzahl darstellbar.");
  return value;
}

export function amountToCents(value) {
  const number = Number(value ?? 0);
  const scaled = number * 100;
  const cents = Math.round(scaled);
  if (!Number.isFinite(number)
    || !Number.isSafeInteger(cents)
    || Math.abs(scaled - cents) > Math.max(1e-7, Number.EPSILON * Math.abs(scaled) * 4)) {
    throw new RangeError("Bitte einen endlichen Geldbetrag mit höchstens zwei Nachkommastellen eingeben.");
  }
  return cents;
}
