interface HeroSectionProps {
  merchantName: string;
  heroImageUrl: string | null;
  heroText: string | null;
  aboutText: string | null;
  announcement: string | null;
}

export function HeroSection({
  merchantName,
  heroImageUrl,
  heroText,
  aboutText,
  announcement,
}: HeroSectionProps) {
  return (
    <>
      {/* Announcement Banner */}
      {announcement && (
        <div className="bg-primary/10 px-4 py-2.5 text-center text-sm font-medium text-primary">
          {announcement}
        </div>
      )}

      {/* Hero */}
      <section className="relative">
        {heroImageUrl ? (
          <div className="relative h-48 sm:h-64 lg:h-80">
            <img
              src={heroImageUrl}
              alt={merchantName}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h2 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
                {heroText || merchantName}
              </h2>
              {aboutText && (
                <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
                  {aboutText}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-surface px-4 py-8 sm:py-12">
            <div className="mx-auto max-w-7xl">
              <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {heroText || `Welcome to ${merchantName}`}
              </h2>
              {aboutText && (
                <p className="mt-2 max-w-2xl text-gray-600">{aboutText}</p>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
