import { getSquareClient } from "./square";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import type { RestaurantLocation } from "@/types";

/**
 * Sync locations from Square to our database for a merchant.
 */
export async function syncLocations(merchantId: string) {
  const client = await getSquareClient(merchantId);
  const response = await client.locations.list();
  const squareLocations = response.locations || [];

  const locations = [];

  for (const loc of squareLocations) {
    if (loc.status !== "ACTIVE") continue;

    const addressJson = loc.address ? {
      addressLine1: loc.address.addressLine1 ?? null,
      addressLine2: loc.address.addressLine2 ?? null,
      locality: loc.address.locality ?? null,
      administrativeDistrictLevel1: loc.address.administrativeDistrictLevel1 ?? null,
      postalCode: loc.address.postalCode ?? null,
      country: loc.address.country ?? null,
    } : Prisma.JsonNull;

    const hoursJson = loc.businessHours ? {
      periods: (loc.businessHours.periods || []).map((p) => ({
        dayOfWeek: p.dayOfWeek,
        startLocalTime: p.startLocalTime,
        endLocalTime: p.endLocalTime,
      })),
    } : Prisma.JsonNull;

    const location = await db.location.upsert({
      where: { squareLocationId: loc.id! },
      create: {
        merchantId,
        squareLocationId: loc.id!,
        name: loc.name || "Main Location",
        address: addressJson,
        latitude: loc.coordinates?.latitude ? Number(loc.coordinates.latitude) : null,
        longitude: loc.coordinates?.longitude ? Number(loc.coordinates.longitude) : null,
        phone: loc.phoneNumber || null,
        businessHours: hoursJson,
      },
      update: {
        name: loc.name || "Main Location",
        address: addressJson,
        latitude: loc.coordinates?.latitude ? Number(loc.coordinates.latitude) : null,
        longitude: loc.coordinates?.longitude ? Number(loc.coordinates.longitude) : null,
        phone: loc.phoneNumber || null,
        businessHours: hoursJson,
      },
    });

    locations.push(location);
  }

  return locations;
}

/**
 * Get all active locations for a merchant, formatted for the storefront.
 */
export async function getMerchantLocations(
  merchantId: string
): Promise<RestaurantLocation[]> {
  const locations = await db.location.findMany({
    where: {
      merchantId,
      isActive: true,
      onlineOrdering: true,
    },
    orderBy: { name: "asc" },
  });

  return locations.map((loc) => ({
    id: loc.id,
    squareLocationId: loc.squareLocationId,
    name: loc.name,
    address: loc.address as RestaurantLocation["address"],
    latitude: loc.latitude,
    longitude: loc.longitude,
    phone: loc.phone,
    businessHours: loc.businessHours as RestaurantLocation["businessHours"],
    pickupEnabled: loc.pickupEnabled,
    curbsideEnabled: loc.curbsideEnabled,
    pickupLeadTime: loc.pickupLeadTime,
    tippingEnabled: loc.tippingEnabled,
    tipPresets: (loc.tipPresets as number[]) || [15, 20, 25],
  }));
}
