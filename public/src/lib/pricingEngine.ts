import { Carrier } from '../types';

export type PackageSizeCategory = 'small' | 'medium' | 'large' | 'freight';
export type DestinationType = 'local' | 'out_of_state' | 'international';

export interface PickupPricingInput {
  lengthInches: number;
  widthInches: number;
  heightInches: number;
  weightLbs: number;
  mileageMiles: number;
  deliveryState: string;
  deliveryCountry: string;
  preferredCarrier: Carrier;
}

export interface PickupPricingResult {
  sizeCategory: PackageSizeCategory;
  volumeCuIn: number;
  baseSizeRate: number;
  mileageRatePerMile: number;
  mileageCost: number;
  directCarrierTransfer: boolean;
  destinationType: DestinationType;
  tenderFee: number;
  carrierHubName: string;
  totalEstimatedCost: number;
  depositAmount: number; // Mandatory 50% deposit
  remainingBalance: number; // 50% remaining due on collection/arrival
}

const CARRIER_HUBS: Record<Carrier, string> = {
  dhl: 'DHL Express Atlanta Worldwide Gateway (ATL Intermodal)',
  fedex: 'FedEx Express Air & Ground Hub (Atlanta Airport Station)',
  ups: 'UPS Smart Hub Atlanta Air Gateway',
  usps: 'USPS International & Bulk Processing Facility (Crown Rd NDC)',
  jb_freight: 'JB Logistics Central Freight Terminal (Piedmont Hub)',
};

export const classifyDestination = (state: string, country: string): DestinationType => {
  const normCountry = (country || 'USA').trim().toUpperCase();
  const isUSA = ['US', 'USA', 'UNITED STATES', 'UNITED STATES OF AMERICA'].includes(normCountry);
  
  if (!isUSA) {
    return 'international';
  }

  const normState = (state || 'GA').trim().toUpperCase();
  if (normState === 'GA' || normState === 'GEORGIA') {
    return 'local';
  }

  return 'out_of_state';
};

export const determineSizeCategory = (
  length: number,
  width: number,
  height: number,
  weightLbs: number
): { category: PackageSizeCategory; baseRate: number } => {
  const volume = Math.max(1, length * width * height);

  if (volume <= 500 && weightLbs <= 10) {
    return { category: 'small', baseRate: 15.0 };
  }
  if (volume <= 1800 && weightLbs <= 30) {
    return { category: 'medium', baseRate: 25.0 };
  }
  if (volume <= 5000 && weightLbs <= 70) {
    return { category: 'large', baseRate: 40.0 };
  }
  return { category: 'freight', baseRate: 75.0 };
};

export const calculatePickupPricing = (input: PickupPricingInput): PickupPricingResult => {
  const length = Math.max(1, Number(input.lengthInches) || 12);
  const width = Math.max(1, Number(input.widthInches) || 8);
  const height = Math.max(1, Number(input.heightInches) || 6);
  const weight = Math.max(1, Number(input.weightLbs) || 5);
  const mileage = Math.max(1, Number(input.mileageMiles) || 12);

  const volume = length * width * height;
  const { category, baseRate } = determineSizeCategory(length, width, height, weight);

  const mileageRatePerMile = 1.75;
  const mileageCost = Number((mileage * mileageRatePerMile).toFixed(2));

  const destinationType = classifyDestination(input.deliveryState, input.deliveryCountry);
  const directCarrierTransfer = destinationType !== 'local';

  // If going out of state or international, carrier direct tender surcharge is $12.50
  const tenderFee = directCarrierTransfer ? 12.5 : 0.0;

  const carrierHubName = directCarrierTransfer
    ? CARRIER_HUBS[input.preferredCarrier] || CARRIER_HUBS.ups
    : 'Local Georgia Courier Direct (JB Fleet)';

  const subtotal = baseRate + mileageCost + tenderFee;
  const totalEstimatedCost = Number(subtotal.toFixed(2));

  // Exactly 50% deposit upfront
  const depositAmount = Number((totalEstimatedCost * 0.5).toFixed(2));
  const remainingBalance = Number((totalEstimatedCost - depositAmount).toFixed(2));

  return {
    sizeCategory: category,
    volumeCuIn: volume,
    baseSizeRate: baseRate,
    mileageRatePerMile,
    mileageCost,
    directCarrierTransfer,
    destinationType,
    tenderFee,
    carrierHubName,
    totalEstimatedCost,
    depositAmount,
    remainingBalance,
  };
};

