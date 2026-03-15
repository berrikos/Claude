"use client";

import { useState, useEffect, useCallback } from "react";
import type { MenuItem, MenuItemVariation, SelectedModifier } from "@/types";
import { formatPrice } from "@/lib/utils";
import { Badge, dietaryTagVariant, dietaryTagLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart";
import { X, Minus, Plus } from "lucide-react";

interface ItemDetailModalProps {
  item: MenuItem;
  merchantId: string;
  locationId: string;
  onClose: () => void;
}

export function ItemDetailModal({
  item,
  merchantId,
  locationId,
  onClose,
}: ItemDetailModalProps) {
  const addToCart = useCartStore((s) => s.addItem);
  const setLocation = useCartStore((s) => s.setLocation);

  const [selectedVariation, setSelectedVariation] = useState<MenuItemVariation>(
    item.variations[0]
  );
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  // Calculate total price
  const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.priceCents, 0);
  const itemTotal = (selectedVariation.priceCents + modifierTotal) * quantity;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const toggleModifier = useCallback(
    (
      modifierListId: string,
      modifierListName: string,
      modifierId: string,
      modifierName: string,
      priceCents: number,
      selectionType: "SINGLE" | "MULTIPLE"
    ) => {
      setSelectedModifiers((prev) => {
        const existing = prev.find((m) => m.modifierId === modifierId);

        if (existing) {
          // Deselect
          return prev.filter((m) => m.modifierId !== modifierId);
        }

        if (selectionType === "SINGLE") {
          // Replace any existing selection from this list
          const filtered = prev.filter(
            (m) => m.modifierListId !== modifierListId
          );
          return [
            ...filtered,
            {
              modifierListId,
              modifierListName,
              modifierId,
              name: modifierName,
              priceCents,
            },
          ];
        }

        // Multiple selection
        return [
          ...prev,
          {
            modifierListId,
            modifierListName,
            modifierId,
            name: modifierName,
            priceCents,
          },
        ];
      });
    },
    []
  );

  const validate = (): boolean => {
    const newErrors: string[] = [];
    for (const ml of item.modifierLists) {
      const selected = selectedModifiers.filter(
        (m) => m.modifierListId === ml.id
      );
      if (ml.minSelected > 0 && selected.length < ml.minSelected) {
        newErrors.push(`Please select at least ${ml.minSelected} option(s) for "${ml.name}"`);
      }
      if (ml.maxSelected && selected.length > ml.maxSelected) {
        newErrors.push(`Please select at most ${ml.maxSelected} option(s) for "${ml.name}"`);
      }
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleAddToCart = () => {
    if (!validate()) return;

    setLocation(merchantId, locationId);
    addToCart({
      menuItemId: item.id,
      variationId: selectedVariation.id,
      name: item.name,
      variationName: selectedVariation.name,
      quantity,
      basePriceCents: selectedVariation.priceCents,
      selectedModifiers,
      specialInstructions,
      imageUrl: item.imageUrl,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} details`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Image */}
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-48 w-full object-cover sm:h-64"
          />
        )}

        <div className="p-6">
          {/* Name & Price */}
          <h2 className="text-xl font-bold text-gray-900">{item.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">
              {formatPrice(selectedVariation.priceCents)}
            </span>
            {item.dietaryTags.length > 0 && (
              <div className="flex gap-1">
                {item.dietaryTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={dietaryTagVariant[tag] || "default"}
                    title={dietaryTagLabel[tag]}
                  >
                    {tag}
                  </Badge>
                ))}
                {item.spicyLevel > 0 && (
                  <Badge variant="spicy">{"🌶".repeat(item.spicyLevel)}</Badge>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="mt-3 text-sm text-gray-600">{item.description}</p>
          )}

          {/* Variations (if multiple) */}
          {item.variations.length > 1 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">
                Size / Option <span className="text-red-500">*</span>
              </h3>
              <div className="space-y-2">
                {item.variations.map((variation) => (
                  <label
                    key={variation.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                      selectedVariation.id === variation.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="variation"
                        checked={selectedVariation.id === variation.id}
                        onChange={() => setSelectedVariation(variation)}
                        className="h-4 w-4 text-primary accent-primary"
                      />
                      <span className="text-sm font-medium">{variation.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {formatPrice(variation.priceCents)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Modifier Lists */}
          {item.modifierLists.map((ml) => {
            const isRequired = ml.minSelected > 0;
            return (
              <div key={ml.id} className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  {ml.name}
                  {isRequired && <span className="text-red-500"> *</span>}
                  {!isRequired && (
                    <span className="ml-1 font-normal text-gray-400">
                      (Optional)
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {ml.modifiers.map((mod) => {
                    const isSelected = selectedModifiers.some(
                      (m) => m.modifierId === mod.id
                    );
                    return (
                      <label
                        key={mod.id}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type={ml.selectionType === "SINGLE" ? "radio" : "checkbox"}
                            name={ml.id}
                            checked={isSelected}
                            onChange={() =>
                              toggleModifier(
                                ml.id,
                                ml.name,
                                mod.id,
                                mod.name,
                                mod.priceCents,
                                ml.selectionType
                              )
                            }
                            className="h-4 w-4 text-primary accent-primary"
                          />
                          <span className="text-sm font-medium">{mod.name}</span>
                        </div>
                        {mod.priceCents > 0 && (
                          <span className="text-sm text-gray-500">
                            +{formatPrice(mod.priceCents)}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special Instructions */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-gray-900">
              Special Instructions{" "}
              <span className="font-normal text-gray-400">(Optional)</span>
            </h3>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Any allergies or special requests..."
              className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-3" role="alert">
              {errors.map((error, i) => (
                <p key={i} className="text-sm text-red-600">
                  {error}
                </p>
              ))}
            </div>
          )}

          {/* Quantity + Add to Cart */}
          <div className="mt-6 flex items-center gap-4">
            {/* Quantity */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:text-gray-900"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-semibold" aria-label={`Quantity: ${quantity}`}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-10 w-10 items-center justify-center text-gray-500 transition-colors hover:text-gray-900"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              size="lg"
              className="flex-1"
            >
              Add to Cart — {formatPrice(itemTotal)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
