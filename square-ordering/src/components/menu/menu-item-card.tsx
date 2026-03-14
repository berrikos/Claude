"use client";

import type { MenuItem } from "@/types";
import { formatPrice } from "@/lib/utils";
import { Badge, dietaryTagVariant, dietaryTagLabel } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface MenuItemCardProps {
  item: MenuItem;
  layout: "grid" | "list" | "compact";
  onSelect: () => void;
}

export function MenuItemCard({ item, layout, onSelect }: MenuItemCardProps) {
  const lowestPrice = item.variations.length > 0
    ? Math.min(...item.variations.map((v) => v.priceCents))
    : 0;

  const hasMultipleVariations = item.variations.length > 1;

  if (layout === "compact") {
    return (
      <button
        onClick={onSelect}
        className="group flex flex-col items-start rounded-xl border border-gray-100 bg-white p-3 text-left transition-all hover:border-gray-200 hover:shadow-sm"
      >
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="mb-2 h-20 w-full rounded-lg object-cover"
            loading="lazy"
          />
        )}
        <p className="text-sm font-medium text-gray-900 line-clamp-2">
          {item.name}
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          {hasMultipleVariations && "From "}
          {formatPrice(lowestPrice)}
        </p>
      </button>
    );
  }

  if (layout === "list") {
    return (
      <button
        onClick={onSelect}
        className="group flex w-full gap-4 rounded-xl border border-gray-100 bg-white p-4 text-left transition-all hover:border-gray-200 hover:shadow-sm"
      >
        <div className="flex-1">
          <div className="flex items-start gap-2">
            <h4 className="font-medium text-gray-900">{item.name}</h4>
            <DietaryTags tags={item.dietaryTags} spicyLevel={item.spicyLevel} />
          </div>
          {item.description && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {item.description}
            </p>
          )}
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {hasMultipleVariations && "From "}
            {formatPrice(lowestPrice)}
          </p>
        </div>
        {item.imageUrl && (
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform group-hover:scale-110">
              <Plus className="h-4 w-4 text-primary" />
            </div>
          </div>
        )}
        {!item.imageUrl && (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-gray-50">
            <Plus className="h-5 w-5 text-gray-400 transition-colors group-hover:text-primary" />
          </div>
        )}
      </button>
    );
  }

  // Grid layout (default)
  return (
    <button
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white text-left transition-all hover:border-gray-200 hover:shadow-md"
    >
      {item.imageUrl ? (
        <div className="relative h-40 w-full overflow-hidden sm:h-48">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-transform group-hover:scale-110">
            <Plus className="h-4 w-4 text-primary" />
          </div>
        </div>
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-gray-50">
          <span className="text-3xl text-gray-300">
            {item.name.charAt(0)}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-2">
          <h4 className="flex-1 font-medium text-gray-900 line-clamp-2">
            {item.name}
          </h4>
        </div>
        <DietaryTags tags={item.dietaryTags} spicyLevel={item.spicyLevel} />
        {item.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {item.description}
          </p>
        )}
        <p className="mt-auto pt-2 text-sm font-semibold text-gray-900">
          {hasMultipleVariations && "From "}
          {formatPrice(lowestPrice)}
        </p>
      </div>
    </button>
  );
}

function DietaryTags({ tags, spicyLevel }: { tags: string[]; spicyLevel: number }) {
  if (tags.length === 0 && spicyLevel === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant={dietaryTagVariant[tag] || "default"}
          title={dietaryTagLabel[tag] || tag}
        >
          {tag}
        </Badge>
      ))}
      {spicyLevel > 0 && (
        <Badge variant="spicy" title={`Spicy level ${spicyLevel}`}>
          {"🌶".repeat(spicyLevel)}
        </Badge>
      )}
    </div>
  );
}
