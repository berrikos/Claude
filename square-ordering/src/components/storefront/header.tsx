"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StorefrontHeaderProps {
  merchantName: string;
  logoUrl: string | null;
  locations: { id: string; name: string }[];
}

export function StorefrontHeader({
  merchantName,
  logoUrl,
  locations,
}: StorefrontHeaderProps) {
  const [showLocations, setShowLocations] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo / Name */}
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${merchantName} logo`}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
              {merchantName.charAt(0)}
            </div>
          )}
          <h1 className="text-lg font-semibold text-gray-900">
            {merchantName}
          </h1>
        </div>

        {/* Location Selector */}
        {locations.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowLocations(!showLocations)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              aria-expanded={showLocations}
              aria-haspopup="listbox"
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">{locations[0]?.name}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {showLocations && (
              <div
                className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
                role="listbox"
              >
                {locations.map((location) => (
                  <button
                    key={location.id}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    role="option"
                    onClick={() => setShowLocations(false)}
                  >
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {location.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">
              <User className="mr-1.5 h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
