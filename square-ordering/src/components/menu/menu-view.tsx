"use client";

import { useState, useRef, useEffect } from "react";
import type { MenuCategory } from "@/types";
import { MenuItemCard } from "./menu-item-card";
import { ItemDetailModal } from "./item-detail-modal";
import type { MenuItem } from "@/types";

interface MenuViewProps {
  menu: MenuCategory[];
  merchantId: string;
  locationId: string;
  menuLayout: "grid" | "list" | "compact";
}

export function MenuView({ menu, merchantId, locationId, menuLayout }: MenuViewProps) {
  const [activeCategory, setActiveCategory] = useState(menu[0]?.id || "");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabsRef = useRef<HTMLDivElement>(null);

  // Featured items across all categories
  const featuredItems = menu.flatMap((cat) =>
    cat.items.filter((item) => item.isFeatured)
  );

  // Scroll to category when tab is clicked
  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = categoryRefs.current.get(categoryId);
    if (element) {
      const headerHeight = 128; // header + tabs height
      const top = element.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  // Update active category on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-category-id");
            if (id) setActiveCategory(id);
          }
        }
      },
      { rootMargin: "-130px 0px -70% 0px" }
    );

    for (const [, el] of categoryRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [menu]);

  if (menu.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-lg font-medium text-gray-500">
          Menu is being set up. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Category Tabs */}
      <nav
        className="sticky top-16 z-30 border-b border-gray-100 bg-white"
        aria-label="Menu categories"
      >
        <div
          ref={tabsRef}
          className="hide-scrollbar mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2"
          role="tablist"
        >
          {menu.map((category) => (
            <button
              key={category.id}
              role="tab"
              aria-selected={activeCategory === category.id}
              onClick={() => scrollToCategory(category.id)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === category.id
                  ? "bg-primary text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Featured Items */}
        {featuredItems.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-4 text-xl font-bold text-gray-900">Featured</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredItems.map((item) => (
                <MenuItemCard
                  key={`featured-${item.id}`}
                  item={item}
                  layout={menuLayout}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Category Sections */}
        {menu.map((category) => (
          <section
            key={category.id}
            data-category-id={category.id}
            ref={(el) => {
              if (el) categoryRefs.current.set(category.id, el);
            }}
            className="mb-10"
          >
            <h3 className="mb-4 text-xl font-bold text-gray-900">
              {category.name}
            </h3>
            <div
              className={
                menuLayout === "grid"
                  ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : menuLayout === "list"
                  ? "flex flex-col gap-3"
                  : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              }
            >
              {category.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  layout={menuLayout}
                  onSelect={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          merchantId={merchantId}
          locationId={locationId}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}
