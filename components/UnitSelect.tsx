"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatUnit } from "@/lib/chemFormat";
import { ALL_UNIT_VALUES, UNIT_GROUPS, type UnitGroup } from "@/lib/units";

const CUSTOM = "__custom__";

// One request per page load, shared by every UnitSelect on the page.
let unitsPromise: Promise<UnitGroup[]> | null = null;
function loadUnitGroups(): Promise<UnitGroup[]> {
  if (!unitsPromise) {
    unitsPromise = fetch("/api/units")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => (Array.isArray(j?.data) && j.data.length ? (j.data as UnitGroup[]) : UNIT_GROUPS))
      .catch(() => {
        unitsPromise = null; // allow a retry next time
        return UNIT_GROUPS;
      });
  }
  return unitsPromise;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  placeholder?: string;
};

/**
 * Unit dropdown. The SI list is fetched live (via /api/units -> Wikidata) and falls back to the
 * built-in list when offline. "Other (custom)" lets the user type any unit; values already stored in
 * the DB that are not in the list open in custom mode so nothing is lost when editing old records.
 */
export function UnitSelect({ value, onChange, className, required, placeholder = "-- Select unit --" }: Props) {
  const [groups, setGroups] = useState<UnitGroup[]>(UNIT_GROUPS);
  const known = useMemo(() => {
    const set = new Set<string>(ALL_UNIT_VALUES);
    groups.forEach((g) => g.options.forEach((o) => set.add(o.value)));
    return set;
  }, [groups]);

  const [custom, setCustom] = useState(!!value && !known.has(value));
  const typing = useRef(false);

  useEffect(() => {
    let alive = true;
    loadUnitGroups().then((g) => alive && setGroups(g));
    return () => {
      alive = false;
    };
  }, []);

  // Keep mode in sync when the parent sets a value programmatically (e.g. edit / auto-fill).
  useEffect(() => {
    if (typing.current) return;
    if (value && !known.has(value)) setCustom(true);
    else if (value) setCustom(false);
  }, [value, known]);

  return (
    <div className="space-y-2">
      <select
        value={custom ? CUSTOM : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className={className}
        required={required}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {/* Keep a stored value selectable even if the live list does not contain it */}
        {!custom && value && !known.has(value) && <option value={value}>{value}</option>}
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM}>Other (custom unit)...</option>
      </select>

      {custom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => (typing.current = true)}
          onBlur={() => (typing.current = false)}
          placeholder="Enter custom unit"
          className={className}
          required={required}
        />
      )}
      {custom && value && formatUnit(value) !== value && (
        <p className="text-[11px] text-slate-500">
          Shows as: <span className="font-bold text-blue-700">{formatUnit(value)}</span>{" "}
          <span className="text-slate-400">(m3 → m³, m^-1 → m⁻¹, use \ to keep a number normal)</span>
        </p>
      )}
    </div>
  );
}