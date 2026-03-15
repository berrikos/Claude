import { getSquareClient } from "./square";
import { cacheGet, cacheSet, cacheDelete } from "./redis";
import { db } from "./db";
import type { MenuCategory, MenuItem, MenuItemVariation, ModifierList, Modifier } from "@/types";

const CACHE_TTL = 900; // 15 minutes

/**
 * Get the full menu for a merchant location, with caching and display overrides.
 */
export async function getMenu(
  merchantId: string,
  locationId: string
): Promise<MenuCategory[]> {
  const cacheKey = `menu:${merchantId}:${locationId}`;

  // Try cache first
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from Square
  const rawMenu = await fetchCatalogFromSquare(merchantId);

  // Apply display overrides from our DB
  const menu = await applyOverrides(rawMenu, merchantId, locationId);

  // Cache result
  await cacheSet(cacheKey, JSON.stringify(menu), CACHE_TTL);

  return menu;
}

/**
 * Invalidate menu cache for a merchant (called on webhook or manual sync).
 */
export async function invalidateMenuCache(merchantId: string) {
  await cacheDelete(`menu:${merchantId}:*`);
}

/**
 * Fetch the full catalog from Square API.
 */
async function fetchCatalogFromSquare(merchantId: string) {
  const client = await getSquareClient(merchantId);

  const categories: Map<string, { id: string; name: string; ordinal: number }> = new Map();
  const items: Map<string, RawItem> = new Map();
  const modifierLists: Map<string, RawModifierList> = new Map();
  const images: Map<string, string> = new Map();

  let page = await client.catalog.list({
    types: "ITEM,CATEGORY,MODIFIER_LIST,IMAGE",
  });

  const processObjects = (objects: typeof page.data) => {
    for (const obj of objects) {
      switch (obj.type) {
        case "CATEGORY": {
          categories.set(obj.id!, {
            id: obj.id!,
            name: obj.categoryData?.name || "Uncategorized",
            ordinal: (obj.categoryData as Record<string, unknown>)?.ordinal as number ?? 999,
          });
          break;
        }
        case "ITEM": {
          const itemData = obj.itemData;
          if (!itemData) break;

          items.set(obj.id!, {
            id: obj.id!,
            name: itemData.name || "",
            description: itemData.description || null,
            categoryId: itemData.reportingCategory?.id || itemData.categories?.[0]?.id || null,
            imageIds: itemData.imageIds || [],
            variations: (itemData.variations || []).map((v) => {
              const varData = (v as { itemVariationData?: { name?: string | null; priceMoney?: { amount?: bigint | number | null } } }).itemVariationData;
              return {
                id: v.id!,
                name: varData?.name || "",
                priceCents: Number(varData?.priceMoney?.amount || 0),
              };
            }),
            modifierListIds: (itemData.modifierListInfo || []).map(
              (m) => m.modifierListId!
            ),
          });
          break;
        }
        case "MODIFIER_LIST": {
          const mlData = obj.modifierListData;
          if (!mlData) break;

          modifierLists.set(obj.id!, {
            id: obj.id!,
            name: mlData.name || "",
            selectionType: mlData.selectionType === "SINGLE" ? "SINGLE" : "MULTIPLE",
            minSelected: Number(mlData.minSelectedModifiers ?? 0),
            maxSelected: mlData.maxSelectedModifiers != null ? Number(mlData.maxSelectedModifiers) : null,
            modifiers: (mlData.modifiers || []).map((m) => {
              const modData = (m as { modifierData?: { name?: string | null; priceMoney?: { amount?: bigint | number | null } } }).modifierData;
              return {
                id: m.id!,
                name: modData?.name || "",
                priceCents: Number(modData?.priceMoney?.amount || 0),
              };
            }),
          });
          break;
        }
        case "IMAGE": {
          if (obj.imageData?.url) {
            images.set(obj.id!, obj.imageData.url);
          }
          break;
        }
      }
    }
  };

  processObjects(page.data);
  while (page.hasNextPage()) {
    page = await page.getNextPage();
    processObjects(page.data);
  }

  // Build the menu structure
  const menuCategories: MenuCategory[] = [];
  const categoryMap = new Map<string, MenuCategory>();

  for (const [id, cat] of categories) {
    const menuCat: MenuCategory = { id, name: cat.name, sortOrder: cat.ordinal, items: [] };
    categoryMap.set(id, menuCat);
    menuCategories.push(menuCat);
  }

  const uncategorized: MenuCategory = { id: "uncategorized", name: "Other", sortOrder: 9999, items: [] };

  for (const [, rawItem] of items) {
    const imageUrl = rawItem.imageIds.length > 0 ? images.get(rawItem.imageIds[0]) || null : null;

    const itemModifierLists: ModifierList[] = rawItem.modifierListIds
      .map((mlId) => modifierLists.get(mlId))
      .filter((ml): ml is RawModifierList => ml !== undefined)
      .map((ml) => ({
        id: ml.id,
        name: ml.name,
        selectionType: ml.selectionType,
        minSelected: ml.minSelected,
        maxSelected: ml.maxSelected,
        modifiers: ml.modifiers,
      }));

    const menuItem: MenuItem = {
      id: rawItem.id,
      name: rawItem.name,
      description: rawItem.description,
      imageUrl,
      categoryId: rawItem.categoryId || "uncategorized",
      variations: rawItem.variations,
      modifierLists: itemModifierLists,
      dietaryTags: [],
      spicyLevel: 0,
      isFeatured: false,
      isAvailable: true,
      sortOrder: 0,
    };

    const category = categoryMap.get(rawItem.categoryId || "");
    if (category) {
      category.items.push(menuItem);
    } else {
      uncategorized.items.push(menuItem);
    }
  }

  if (uncategorized.items.length > 0) menuCategories.push(uncategorized);
  menuCategories.sort((a, b) => a.sortOrder - b.sortOrder);

  return menuCategories;
}

/**
 * Apply merchant's display overrides.
 */
async function applyOverrides(
  menu: MenuCategory[],
  merchantId: string,
  locationId: string
): Promise<MenuCategory[]> {
  const [categoryOverrides, itemOverrides] = await Promise.all([
    db.menuCategoryOverride.findMany({
      where: { merchantId, OR: [{ locationId }, { locationId: null }] },
    }),
    db.menuItemOverride.findMany({
      where: { merchantId, OR: [{ locationId }, { locationId: null }] },
    }),
  ]);

  const catOverrideMap = new Map<string, (typeof categoryOverrides)[0]>();
  for (const o of categoryOverrides) {
    const existing = catOverrideMap.get(o.squareCategoryId);
    if (!existing || (o.locationId && !existing.locationId)) {
      catOverrideMap.set(o.squareCategoryId, o);
    }
  }

  const itemOverrideMap = new Map<string, (typeof itemOverrides)[0]>();
  for (const o of itemOverrides) {
    const existing = itemOverrideMap.get(o.squareItemId);
    if (!existing || (o.locationId && !existing.locationId)) {
      itemOverrideMap.set(o.squareItemId, o);
    }
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return menu
    .map((category) => {
      const catOverride = catOverrideMap.get(category.id);

      if (catOverride) {
        if (!catOverride.isVisible) return null;
        if (catOverride.availableDays.length > 0 && !catOverride.availableDays.includes(currentDay)) return null;
        if (catOverride.availableStart && catOverride.availableEnd) {
          if (currentTime < catOverride.availableStart || currentTime > catOverride.availableEnd) return null;
        }
        category = { ...category, name: catOverride.displayName || category.name, sortOrder: catOverride.sortOrder };
      }

      const filteredItems = category.items
        .map((item) => {
          const o = itemOverrideMap.get(item.id);
          if (!o) return item;
          if (!o.isVisible || o.isUnavailable) {
            if (o.isUnavailable && o.unavailableUntil && new Date(o.unavailableUntil) < now) return item;
            return null;
          }
          return {
            ...item,
            name: o.displayName || item.name,
            description: o.displayDescription || item.description,
            imageUrl: o.displayImageUrl || item.imageUrl,
            dietaryTags: o.dietaryTags.length > 0 ? o.dietaryTags : item.dietaryTags,
            spicyLevel: o.spicyLevel || item.spicyLevel,
            isFeatured: o.isFeatured,
            sortOrder: o.sortOrder,
          };
        })
        .filter((item): item is MenuItem => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return { ...category, items: filteredItems };
    })
    .filter((cat): cat is MenuCategory => cat !== null && cat.items.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

interface RawItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  imageIds: string[];
  variations: MenuItemVariation[];
  modifierListIds: string[];
}

interface RawModifierList {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number | null;
  modifiers: Modifier[];
}
