// Unit catalogue used by every "Unit" dropdown in the app.
// SI list: 7 base units + 22 derived units with special names (BIPM / NIST SP 811)
// + coherent derived units written in base units (m², m³, m⁻¹, m/s, ...).

export type UnitOption = { value: string; label: string };
export type UnitGroup = { label: string; options: UnitOption[] };

export const SI_BASE_UNITS: UnitOption[] = [
  { value: "m", label: "m (metre – length)" },
  { value: "kg", label: "kg (kilogram – mass)" },
  { value: "s", label: "s (second – time)" },
  { value: "A", label: "A (ampere – electric current)" },
  { value: "K", label: "K (kelvin – temperature)" },
  { value: "mol", label: "mol (mole – amount of substance)" },
  { value: "cd", label: "cd (candela – luminous intensity)" },
];

export const SI_DERIVED_UNITS: UnitOption[] = [
  { value: "rad", label: "rad (radian – angle)" },
  { value: "sr", label: "sr (steradian – solid angle)" },
  { value: "Hz", label: "Hz (hertz – frequency)" },
  { value: "N", label: "N (newton – force)" },
  { value: "Pa", label: "Pa (pascal – pressure)" },
  { value: "J", label: "J (joule – energy)" },
  { value: "W", label: "W (watt – power)" },
  { value: "C", label: "C (coulomb – electric charge)" },
  { value: "V", label: "V (volt – electric potential)" },
  { value: "F", label: "F (farad – capacitance)" },
  { value: "Ω", label: "Ω (ohm – resistance)" },
  { value: "S", label: "S (siemens – conductance)" },
  { value: "Wb", label: "Wb (weber – magnetic flux)" },
  { value: "T", label: "T (tesla – magnetic flux density)" },
  { value: "H", label: "H (henry – inductance)" },
  { value: "°C", label: "°C (degree Celsius – temperature)" },
  { value: "lm", label: "lm (lumen – luminous flux)" },
  { value: "lx", label: "lx (lux – illuminance)" },
  { value: "Bq", label: "Bq (becquerel – radioactivity)" },
  { value: "Gy", label: "Gy (gray – absorbed dose)" },
  { value: "Sv", label: "Sv (sievert – dose equivalent)" },
  { value: "kat", label: "kat (katal – catalytic activity)" },
];

// Coherent derived units expressed in base units (no special name) - NIST SP 811 / BIPM SI Brochure Table 2.
export const SI_COMPOUND_UNITS: UnitOption[] = [
  { value: "m²", label: "m² (square metre – area)" },
  { value: "m³", label: "m³ (cubic metre – volume)" },
  { value: "m⁻¹", label: "m⁻¹ (reciprocal metre – wavenumber)" },
  { value: "m/s", label: "m/s (metre per second – speed, velocity)" },
  { value: "m/s²", label: "m/s² (metre per second squared – acceleration)" },
  { value: "m³/s", label: "m³/s (cubic metre per second – flow rate)" },
  { value: "m³/h", label: "m³/h (cubic metre per hour – flow rate)" },
  { value: "L/s", label: "L/s (litre per second – flow rate)" },
  { value: "kg/m³", label: "kg/m³ (kilogram per cubic metre – density)" },
  { value: "m³/kg", label: "m³/kg (cubic metre per kilogram – specific volume)" },
  { value: "A/m²", label: "A/m² (ampere per square metre – current density)" },
  { value: "A/m", label: "A/m (ampere per metre – magnetic field strength)" },
  { value: "mol/m³", label: "mol/m³ (mole per cubic metre – concentration)" },
  { value: "mol/L", label: "mol/L (mole per litre – molarity)" },
  { value: "cd/m²", label: "cd/m² (candela per square metre – luminance)" },
  { value: "kg/m²", label: "kg/m² (kilogram per square metre – surface density)" },
  { value: "s⁻¹", label: "s⁻¹ (reciprocal second – rate)" },
  { value: "kg/s", label: "kg/s (kilogram per second – mass flow)" },
  { value: "N/m", label: "N/m (newton per metre – surface tension)" },
  { value: "Pa·s", label: "Pa·s (pascal second – dynamic viscosity)" },
  { value: "m²/s", label: "m²/s (square metre per second – kinematic viscosity)" },
  { value: "J/kg", label: "J/kg (joule per kilogram – specific energy)" },
  { value: "J/K", label: "J/K (joule per kelvin – heat capacity)" },
  { value: "J/(kg·K)", label: "J/(kg·K) (specific heat capacity)" },
  { value: "W/m²", label: "W/m² (watt per square metre – irradiance)" },
  { value: "W/(m·K)", label: "W/(m·K) (thermal conductivity)" },
  { value: "V/m", label: "V/m (volt per metre – electric field strength)" },
  { value: "C/m²", label: "C/m² (coulomb per square metre)" },
  { value: "F/m", label: "F/m (farad per metre – permittivity)" },
  { value: "H/m", label: "H/m (henry per metre – permeability)" },
  { value: "Ω·m", label: "Ω·m (ohm metre – resistivity)" },
  { value: "S/m", label: "S/m (siemens per metre – conductivity)" },
  { value: "J/mol", label: "J/mol (joule per mole – molar energy)" },
  { value: "kg/mol", label: "kg/mol (kilogram per mole – molar mass)" },
  { value: "kat/m³", label: "kat/m³ (katal per cubic metre – catalytic concentration)" },
];

// Non-SI / compound units that a water-treatment lab uses every day.
export const LAB_UNITS: UnitOption[] = [
  { value: "mg/L", label: "mg/L (milligrams per litre)" },
  { value: "µg/L", label: "µg/L (micrograms per litre)" },
  { value: "g/L", label: "g/L (grams per litre)" },
  { value: "ppm", label: "ppm (parts per million)" },
  { value: "mg/kg", label: "mg/kg (milligrams per kilogram)" },
  { value: "pH", label: "pH (scale)" },
  { value: "NTU", label: "NTU (turbidity)" },
  { value: "µS/cm", label: "µS/cm (conductivity)" },
  { value: "mV", label: "mV (millivolts – ORP / redox potential)" },
  { value: "Pt-Co", label: "Pt-Co (colour)" },
  { value: "%", label: "% (percentage)" },
  { value: "L", label: "L (litre)" },
  { value: "mL", label: "mL (millilitre)" },
  { value: "g", label: "g (gram)" },
  { value: "mg", label: "mg (milligram)" },
  { value: "ml/g", label: "ml/g (sludge volume index)" },
  { value: "per 100ml", label: "per 100ml (coliform count)" },
  { value: "CFU/100mL", label: "CFU/100mL (colony forming units)" },
  { value: "MPN/100mL", label: "MPN/100mL (most probable number)" },
  { value: "drops", label: "drops" },
  { value: "pcs", label: "pcs (pieces)" },
  { value: "Tablet", label: "Tablet" },
];

export const UNIT_GROUPS: UnitGroup[] = [
  { label: "Common lab units", options: LAB_UNITS },
  { label: "SI base units", options: SI_BASE_UNITS },
  { label: "SI derived units", options: SI_DERIVED_UNITS },
  { label: "SI units in base units (m², m³, m⁻¹ ...)", options: SI_COMPOUND_UNITS },
];

export const ALL_UNIT_VALUES: string[] = UNIT_GROUPS.flatMap((g) => g.options.map((o) => o.value));