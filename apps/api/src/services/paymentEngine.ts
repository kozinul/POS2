import { IRoundingPolicy } from '../models/PaymentMethod';
import { Setting } from '../models/Setting';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  serviceCharge: number;
  serviceChargeRate: number;
  taxTotalExcluded: number;
  taxTotalIncluded: number;
  grandTotal: number;
}

export interface PaymentBreakdownEntry {
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  amount: number;
  roundedAmount: number;
  type: 'cash' | 'non-cash';
}

export interface PaymentAllocation {
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  type: 'cash' | 'non-cash';
  amount: number;
  cardLastFour?: string;
}

export interface PaymentCalculationRequest {
  invoice: InvoiceTotals;
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  cashAmount?: number;
  cardLastFour?: string;
}

export interface PaymentCalculationResult {
  originalTotal: number;
  roundingMethod: string;
  roundingAdjustment: number;
  roundedPayable: number;
  cashReceived: number;
  change: number;
  shortfall: number;
  isExactPayment: boolean;
  isOverpayment: boolean;
  isUnderpayment: boolean;
  paymentBreakdown: PaymentBreakdownEntry[];
}

export interface SplitPaymentResult {
  originalTotal: number;
  roundedPayable: number;
  roundingAdjustment: number;
  roundingMethod: string;
  paymentBreakdown: PaymentBreakdownEntry[];
  cashReceived: number;
  change: number;
  shortfall: number;
  isExactPayment: boolean;
  isOverpayment: boolean;
  isUnderpayment: boolean;
  totalAllocated: number;
  totalRounded: number;
  remaining: number;
}

// ─── Rounding Engine ─────────────────────────────────────────────────────────

export function roundAmount(amount: number, method: string): number {
  switch (method) {
    case 'nearest_100':
      return Math.round(amount / 100) * 100;
    case 'nearest_500':
      return Math.round(amount / 500) * 500;
    case 'nearest_1000':
      return Math.round(amount / 1000) * 1000;
    case 'round_up_100':
      return Math.ceil(amount / 100) * 100;
    case 'round_down_100':
      return Math.floor(amount / 100) * 100;
    case 'no_rounding':
    default:
      return amount;
  }
}

export function calculateRoundingAdjustment(
  original: number,
  rounded: number,
  policy: IRoundingPolicy
): number {
  const adjustment = rounded - original;

  if (policy.maxRoundingAdjustment > 0) {
    if (Math.abs(adjustment) > policy.maxRoundingAdjustment) {
      return 0;
    }
  }

  return adjustment;
}

// ─── Payment Calculator ──────────────────────────────────────────────────────

export function calculatePayment(req: PaymentCalculationRequest): PaymentCalculationResult {
  const { invoice, paymentMethodId, paymentMethodCode, paymentMethodName, cashAmount, cardLastFour } = req;

  const originalTotal = invoice.grandTotal;

  const isNonCash = paymentMethodCode !== 'CASH';
  const isCashPayment = paymentMethodCode === 'CASH';

  // Non-cash (QRIS/Card): use exact total, no rounding
  // Cash: apply rounding policy
  let roundingMethod = 'no_rounding';
  let roundingAdjustment = 0;
  let roundedPayable = originalTotal;

  // For cash payments with rounding
  if (isCashPayment) {
    const pmRounding = getRoundingPolicy();
    if (pmRounding && pmRounding.enabled) {
      roundingMethod = pmRounding.method;
      const rawRounded = roundAmount(originalTotal, pmRounding.method);
      roundingAdjustment = calculateRoundingAdjustment(originalTotal, rawRounded, pmRounding);
      roundedPayable = originalTotal + roundingAdjustment;
    }
  }

  // Cash received & change calculation
  let cashReceived = 0;
  let change = 0;
  let shortfall = 0;
  let isExactPayment = false;
  let isOverpayment = false;
  let isUnderpayment = false;

  if (isCashPayment && cashAmount !== undefined) {
    cashReceived = cashAmount;
    const diff = cashReceived - roundedPayable;

    if (diff === 0) {
      isExactPayment = true;
      change = 0;
    } else if (diff > 0) {
      isOverpayment = true;
      change = diff;
    } else {
      isUnderpayment = true;
      shortfall = Math.abs(diff);
    }
  } else if (isCashPayment) {
    // Cash payment without specified amount = exact payment
    isExactPayment = true;
    cashReceived = roundedPayable;
  } else {
    // Non-cash: always exact
    isExactPayment = true;
    cashReceived = originalTotal;
  }

  const paymentBreakdown: PaymentBreakdownEntry[] = [
    {
      paymentMethodId,
      paymentMethodCode,
      paymentMethodName,
      amount: originalTotal,
      roundedAmount: roundedPayable,
      type: isNonCash ? 'non-cash' : 'cash',
    },
  ];

  return {
    originalTotal,
    roundingMethod,
    roundingAdjustment,
    roundedPayable,
    cashReceived,
    change,
    shortfall,
    isExactPayment,
    isOverpayment,
    isUnderpayment,
    paymentBreakdown,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let roundingConfigCache: IRoundingPolicy | null = null;

export function getRoundingPolicy(): IRoundingPolicy | null {
  return roundingConfigCache;
}

export async function loadRoundingConfig(): Promise<IRoundingPolicy | null> {
  try {
    const setting = await Setting.findOne({ key: 'roundingConfig' });
    if (!setting) {
      roundingConfigCache = null;
      return null;
    }
    roundingConfigCache = setting.value as IRoundingPolicy;
    return roundingConfigCache;
  } catch {
    return null;
  }
}

export function clearRoundingCache() {
  roundingConfigCache = null;
}

// ─── Split Payment Calculator ────────────────────────────────────────────────

export function calculateSplitPayment(
  invoice: InvoiceTotals,
  allocations: PaymentAllocation[]
): SplitPaymentResult {
  const originalTotal = invoice.grandTotal;

  const breakdown: PaymentBreakdownEntry[] = [];
  let totalRoundingAdjustment = 0;
  let totalRounded = 0;
  let totalCashAllocated = 0;

  for (const alloc of allocations) {
    const isCash = alloc.type === 'cash';
    let pmRounding: IRoundingPolicy | null = null;

    if (isCash) {
      pmRounding = getRoundingPolicy();
    }

    const hasRounding = isCash && pmRounding && pmRounding.enabled;

    let roundedAmount: number;
    let effectiveAmount: number;

    if (hasRounding) {
      const rawRounded = roundAmount(alloc.amount, pmRounding!.method);
      const adjustment = calculateRoundingAdjustment(alloc.amount, rawRounded, pmRounding!);
      totalRoundingAdjustment += adjustment;
      roundedAmount = alloc.amount + adjustment;
      effectiveAmount = roundedAmount;
    } else {
      roundedAmount = alloc.amount;
      effectiveAmount = alloc.amount;
    }

    breakdown.push({
      paymentMethodId: alloc.paymentMethodId,
      paymentMethodCode: alloc.paymentMethodCode,
      paymentMethodName: alloc.paymentMethodName,
      amount: alloc.amount,
      roundedAmount,
      type: alloc.type,
    });

    totalRounded += effectiveAmount;
    if (isCash) {
      totalCashAllocated += effectiveAmount;
    }
  }

  // Determine rounding info
  const roundingAdjustment = totalRoundingAdjustment;
  const roundedPayable = originalTotal + roundingAdjustment;
  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);

  // Change / shortfall calculation
  const diff = totalRounded - roundedPayable;
  let change = 0;
  let shortfall = 0;
  let isExactPayment = false;
  let isOverpayment = false;
  let isUnderpayment = false;

  if (diff === 0) {
    isExactPayment = true;
  } else if (diff > 0) {
    isOverpayment = true;
    change = diff;
  } else {
    isUnderpayment = true;
    shortfall = Math.abs(diff);
  }

  const roundingMethod = roundingAdjustment !== 0 ? 'split_payment_rounding' : 'no_rounding';

  return {
    originalTotal,
    roundedPayable,
    roundingAdjustment,
    roundingMethod,
    paymentBreakdown: breakdown,
    cashReceived: totalCashAllocated,
    change,
    shortfall,
    isExactPayment,
    isOverpayment,
    isUnderpayment,
    totalAllocated,
    totalRounded,
    remaining: roundedPayable - totalAllocated,
  };
}

// ─── Pre-calculate rounding for frontend display ────────────────────────────

export function previewRounding(amount: number, method: string, maxAdjustment: number): {
  rawRounded: number;
  adjustment: number;
  finalPayable: number;
} {
  const rawRounded = roundAmount(amount, method);
  const adjustment = calculateRoundingAdjustment(amount, rawRounded, {
    enabled: true,
    method: method as any,
    maxRoundingAdjustment: maxAdjustment,
  });
  return {
    rawRounded,
    adjustment,
    finalPayable: amount + adjustment,
  };
}
