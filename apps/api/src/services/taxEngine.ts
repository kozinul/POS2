import { Tax, ITaxDoc, IDppFraction } from '../models/Tax';
import { TaxRule } from '../models/TaxRule';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TaxLineItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  modifiersTotal: number;
  lineTotal: number;
  categoryId?: string;
  categoryName?: string;
  productTaxOverrides?: { taxId: string; included: boolean }[];
}

export interface TaxCalculationRequest {
  items: TaxLineItem[];
  subtotal: number;
  discountTotal: number;
  transactionType?: 'dine_in' | 'takeaway' | 'delivery' | 'online';
  outletId?: string;
  customerTier?: string;
  date?: Date;
  promoCode?: string;
}

export interface TaxBreakdownEntry {
  taxId: string;
  taxCode: string;
  taxName: string;
  rate: number;
  effectiveRate: number;
  dppType: 'full' | 'fraction';
  dppFraction?: IDppFraction;
  dppAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxAmountRounded: number;
  included: boolean;
  rounding: string;
  roundingPrecision: number;
  perItem: {
    productId: string;
    productName: string;
    dpp: number;
    taxAmount: number;
    included: boolean;
  }[];
  taxExcludedRounded: number;
  taxIncludedRounded: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  discountTotal: number;
  dppTotal: number;
  taxDetails: TaxBreakdownEntry[];
  taxTotalsByCode: Record<string, number>;
  taxTotalExcluded: number;
  taxTotalIncluded: number;
  grandTotal: number;
}

export interface TaxValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Rounding ────────────────────────────────────────────────────────────────

function roundValue(value: number, method: 'math' | 'floor' | 'ceil', precision: number): number {
  const factor = Math.pow(10, precision);
  const scaled = value * factor;
  let rounded: number;
  switch (method) {
    case 'floor':
      rounded = Math.floor(scaled);
      break;
    case 'ceil':
      rounded = Math.ceil(scaled);
      break;
    case 'math':
    default:
      rounded = Math.round(scaled);
      break;
  }
  return rounded / factor;
}

function applyIndonesianRounding(amount: number): number {
  return Math.round(amount);
}

// ─── DPP Calculation ─────────────────────────────────────────────────────────

function calculateDpp(
  lineTotal: number,
  discountTotal: number,
  subtotal: number,
  dppType: 'full' | 'fraction',
  fraction?: IDppFraction
): { dppAmount: number; taxableAmount: number } {
  if (subtotal <= 0) return { dppAmount: 0, taxableAmount: 0 };

  const dppFraction = dppType === 'fraction' && fraction
    ? fraction.numerator / fraction.denominator
    : 1;

  const discountPortion = discountTotal > 0
    ? Math.round(discountTotal * lineTotal / subtotal)
    : 0;

  const dppBase = Math.max(0, lineTotal - discountPortion);
  const dppAmount = applyIndonesianRounding(dppBase * dppFraction);
  const taxableAmount = dppAmount;

  return { dppAmount, taxableAmount };
}

// ─── Tax Calculation ─────────────────────────────────────────────────────────

function calcTaxAmount(
  dppAmount: number,
  rate: number,
  rateType: 'percentage' | 'nominal',
  included: boolean,
  rounding: 'math' | 'floor' | 'ceil',
  roundingPrecision: number,
  dppFraction?: number
): number {
  if (rateType === 'nominal') {
    return roundValue(rate, rounding, roundingPrecision);
  }

  let taxAmount: number;
  if (included) {
    // Price includes tax: PRICE = BASE + TAX
    // TAX = BASE × fraction × rate%
    // PRICE = BASE × (1 + fraction × rate%)
    // TAX = PRICE × fraction × rate% / (1 + fraction × rate%)
    // Since dppAmount = PRICE × fraction (when fraction is applied),
    // TAX = dppAmount × rate% / (1 + fraction × rate%)
    const f = dppFraction && dppFraction !== 1 ? dppFraction : 1;
    taxAmount = dppAmount * (rate / 100) / (1 + f * (rate / 100));
  } else {
    taxAmount = dppAmount * rate / 100;
  }

  return roundValue(taxAmount, rounding, roundingPrecision);
}

// ─── Tax Engine ──────────────────────────────────────────────────────────────

export async function calculateTaxes(req: TaxCalculationRequest): Promise<TaxCalculationResult> {
  const {
    items,
    subtotal,
    discountTotal,
    transactionType,
    outletId,
    customerTier,
    date = new Date(),
  } = req;

  const dppTotal = Math.max(0, subtotal - discountTotal);

  const dateFilter = [
    { effectiveFrom: { $exists: false } },
    { effectiveFrom: null },
    { effectiveFrom: { $lte: date } },
  ];
  const dateFilterEnd = [
    { effectiveTo: { $exists: false } },
    { effectiveTo: null },
    { effectiveTo: { $gte: date } },
  ];

  const activeTaxes = await Tax.find({
    active: true,
    $and: [{ $or: dateFilter }, { $or: dateFilterEnd }],
  }).sort({ priority: 1, name: 1 });

  const ruleDateFilter = [
    { 'conditions.applicableFrom': { $exists: false } },
    { 'conditions.applicableFrom': null },
    { 'conditions.applicableFrom': { $lte: date } },
  ];
  const ruleDateFilterEnd = [
    { 'conditions.applicableTo': { $exists: false } },
    { 'conditions.applicableTo': null },
    { 'conditions.applicableTo': { $gte: date } },
  ];

  const applicableRules = await TaxRule.find({
    active: true,
    taxCode: { $in: activeTaxes.map(t => t.code) },
    $and: [{ $or: ruleDateFilter }, { $or: ruleDateFilterEnd }],
  }).sort({ priority: -1 });

  const breakdown: TaxBreakdownEntry[] = [];
  const taxTotalsByCode: Record<string, number> = {};

  for (const tax of activeTaxes) {
    const applicableRule = applicableRules.find(r => r.taxCode === tax.code);
    const effectiveRate = applicableRule?.actions?.rateOverride ?? tax.rate;
    const effectiveDppFraction = applicableRule?.actions?.dppFractionOverride ?? tax.dppFormula?.fraction;
    const effectiveDppType = effectiveDppFraction ? 'fraction' : 'full';
    const effectiveRounding = applicableRule?.actions?.roundingOverride ?? tax.rounding;
    const defaultIncluded = applicableRule?.actions?.includedOverride ?? tax.includedByDefault;
    const effectiveStatus = applicableRule?.actions?.statusOverride ?? (tax.active ? 'active' : 'inactive');

    if (effectiveStatus === 'inactive') continue;

    const totalExempt = tax.exemptUpTo > 0 && subtotal <= tax.exemptUpTo;

    let totalTaxAmount = 0;
    let totalExcludedAmount = 0;
    const perItem: TaxBreakdownEntry['perItem'] = [];

    for (const item of items) {
      const lineTotal = item.lineTotal;

      // Check per-product tax override first
      const productOverride = item.productTaxOverrides?.find(
        po => String(po.taxId) === String(tax._id)
      );
      const taxIncluded = productOverride !== undefined ? productOverride.included : defaultIncluded;

      if (totalExempt) {
        perItem.push({
          productId: item.productId,
          productName: item.productName,
          dpp: 0,
          taxAmount: 0,
          included: false,
        });
        continue;
      }

      let skipByScope = false;
      if (tax.scope === 'product') {
        skipByScope = !tax.productIds.some(id => String(id) === item.productId);
      } else if (tax.scope === 'category') {
        skipByScope = !item.categoryId || !tax.categoryIds.some(id => String(id) === item.categoryId);
      } else if (tax.scope === 'transaction_type') {
        skipByScope = !transactionType || !tax.transactionTypes.includes(transactionType);
      }

      if (skipByScope) {
        perItem.push({
          productId: item.productId,
          productName: item.productName,
          dpp: 0,
          taxAmount: 0,
          included: false,
        });
        continue;
      }

      const dppFracValue = effectiveDppType === 'fraction' && effectiveDppFraction
        ? effectiveDppFraction.numerator / effectiveDppFraction.denominator
        : 1;

      let perItemDpp: number;
      let taxAmount: number;

      if (taxIncluded && dppFracValue !== 1) {
        // LineTotal includes tax. Extract DPP and tax from price:
        // basePrice = lineTotal / (1 + fraction × rate/100)
        // DPP = fraction × basePrice
        // Tax = DPP × rate/100
        const basePrice = lineTotal / (1 + dppFracValue * effectiveRate / 100);
        perItemDpp = roundValue(basePrice * dppFracValue, effectiveRounding, tax.roundingPrecision);
        const rawTax = perItemDpp * effectiveRate / 100;
        taxAmount = roundValue(rawTax, effectiveRounding, tax.roundingPrecision);
      } else {
        const { dppAmount } = calculateDpp(
          lineTotal, discountTotal, subtotal, effectiveDppType, effectiveDppFraction ?? undefined
        );
        perItemDpp = dppAmount;
        taxAmount = calcTaxAmount(
          perItemDpp, effectiveRate, tax.rateType, taxIncluded,
          effectiveRounding, tax.roundingPrecision, dppFracValue
        );
      }

      if (!taxIncluded) {
        totalExcludedAmount += taxAmount;
      }
      totalTaxAmount += taxAmount;

      perItem.push({
        productId: item.productId,
        productName: item.productName,
        dpp: perItemDpp,
        taxAmount,
        included: taxIncluded,
      });
    }

    const totalTaxRounded = applyIndonesianRounding(totalTaxAmount);
    const excludedRounded = applyIndonesianRounding(totalExcludedAmount);

    breakdown.push({
      taxId: String(tax._id),
      taxCode: tax.code,
      taxName: tax.name,
      rate: tax.rate,
      effectiveRate,
      dppType: effectiveDppType,
      dppFraction: effectiveDppFraction ?? undefined,
      dppAmount: perItem.reduce((s, p) => s + p.dpp, 0),
      taxableAmount: perItem.reduce((s, p) => s + p.dpp, 0),
      taxAmount: totalTaxAmount,
      taxAmountRounded: totalTaxRounded,
      included: totalTaxRounded - excludedRounded > 0,
      taxExcludedRounded: excludedRounded,
      taxIncludedRounded: totalTaxRounded - excludedRounded,
      rounding: effectiveRounding,
      roundingPrecision: tax.roundingPrecision,
      perItem,
    });

    taxTotalsByCode[tax.code] = (taxTotalsByCode[tax.code] || 0) + totalTaxRounded;
  }

  const taxTotalExcluded = breakdown.reduce((s, t) => s + (t as any).taxExcludedRounded, 0);
  const taxTotalIncluded = breakdown.reduce((s, t) => s + (t as any).taxIncludedRounded, 0);

  const grandTotal = dppTotal + taxTotalExcluded;

  return {
    subtotal,
    discountTotal,
    dppTotal,
    taxDetails: breakdown,
    taxTotalsByCode,
    taxTotalExcluded,
    taxTotalIncluded,
    grandTotal,
  };
}

// ─── Tax Validation ──────────────────────────────────────────────────────────

export async function validateTaxConfiguration(
  taxId?: string
): Promise<TaxValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const filter: any = { active: true };
  if (taxId) filter._id = taxId;
  const taxes = await Tax.find(filter);

  for (const tax of taxes) {
    if (tax.rate <= 0) {
      errors.push(`Tax "${tax.name}" (${tax.code}) has rate <= 0`);
    }

    if (tax.scope !== 'all') {
      if (tax.scope === 'category' && (!tax.categoryIds || tax.categoryIds.length === 0)) {
        warnings.push(`Tax "${tax.name}" has scope 'category' but no categoryIds defined`);
      }
      if (tax.scope === 'product' && (!tax.productIds || tax.productIds.length === 0)) {
        warnings.push(`Tax "${tax.name}" has scope 'product' but no productIds defined`);
      }
      if (tax.scope === 'transaction_type' && (!tax.transactionTypes || tax.transactionTypes.length === 0)) {
        warnings.push(`Tax "${tax.name}" has scope 'transaction_type' but no transactionTypes defined`);
      }
    }

    if (tax.dppFormula?.type === 'fraction') {
      const frac = tax.dppFormula.fraction;
      if (!frac || frac.numerator <= 0 || frac.denominator <= 0) {
        errors.push(`Tax "${tax.name}" has invalid DPP fraction`);
      }
    }

    if (tax.effectiveFrom && tax.effectiveTo && tax.effectiveFrom >= tax.effectiveTo) {
      errors.push(`Tax "${tax.name}" has effectiveFrom after effectiveTo`);
    }
  }

  const ppnTaxes = taxes.filter(t => t.code === 'PPN');
  if (ppnTaxes.length === 0) {
    warnings.push('No active PPN tax configured');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── Tax Lookup ──────────────────────────────────────────────────────────────

export async function getApplicableTaxesForProduct(
  productId: string,
  categoryId?: string,
  transactionType?: string,
  outletId?: string,
  date: Date = new Date()
): Promise<ITaxDoc[]> {
  const taxes = await Tax.find({
    active: true,
    $and: [
      { $or: [
        { effectiveFrom: { $exists: false } },
        { effectiveFrom: null },
        { effectiveFrom: { $lte: date } },
      ]},
      { $or: [
        { effectiveTo: { $exists: false } },
        { effectiveTo: null },
        { effectiveTo: { $gte: date } },
      ]},
    ],
  }).sort({ priority: 1 });

  return taxes.filter(tax => {
    if (tax.scope === 'all') return true;
    if (tax.scope === 'product') return tax.productIds.some(id => String(id) === productId);
    if (tax.scope === 'category') return !!categoryId && tax.categoryIds.some(id => String(id) === categoryId);
    if (tax.scope === 'transaction_type') return !!transactionType && tax.transactionTypes.includes(transactionType);
    return false;
  });
}

// ─── Calculate Single Product Tax (for display) ─────────────────────────────

export async function calculateProductTaxDisplay(
  price: number,
  productId: string,
  categoryId?: string,
  transactionType?: string,
  outletId?: string,
  date: Date = new Date()
): Promise<{
  taxes: { name: string; code: string; rate: number; dppFraction?: IDppFraction; included: boolean; amount: number; displayLabel: string }[];
  totalTax: number;
}> {
  const taxes = await getApplicableTaxesForProduct(productId, categoryId, transactionType, outletId, date);

  const taxResults = taxes.map(tax => {
    const dppFraction = tax.dppFormula?.type === 'fraction' && tax.dppFormula?.fraction
      ? tax.dppFormula.fraction.numerator / tax.dppFormula.fraction.denominator
      : 1;

    let taxAmount: number;
    if (tax.includedByDefault && dppFraction !== 1) {
      const basePrice = price / (1 + dppFraction * tax.rate / 100);
      const dpp = applyIndonesianRounding(basePrice * dppFraction);
      taxAmount = applyIndonesianRounding(dpp * tax.rate / 100);
    } else {
      const dpp = applyIndonesianRounding(price * dppFraction);
      if (tax.includedByDefault) {
        taxAmount = dpp * tax.rate / (100 + tax.rate);
      } else {
        taxAmount = dpp * tax.rate / 100;
      }
      taxAmount = applyIndonesianRounding(taxAmount);
    }

    const dppLabel = tax.dppFormula?.type === 'fraction' && tax.dppFormula?.fraction
      ? `DPP ${tax.dppFormula.fraction.numerator}/${tax.dppFormula.fraction.denominator}`
      : '';

    return {
      name: tax.name,
      code: tax.code,
      rate: tax.rate,
      dppFraction: tax.dppFormula?.type === 'fraction' ? tax.dppFormula.fraction : undefined,
      included: tax.includedByDefault,
      amount: taxAmount,
      displayLabel: tax.includedByDefault
        ? `${tax.name} ${tax.rate}%${dppLabel ? ` (${dppLabel})` : ''} [Inc]`
        : `${tax.name} ${tax.rate}%${dppLabel ? ` (${dppLabel})` : ''}`,
    };
  });

  return {
    taxes: taxResults,
    totalTax: taxResults.reduce((s, t) => s + t.amount, 0),
  };
}
