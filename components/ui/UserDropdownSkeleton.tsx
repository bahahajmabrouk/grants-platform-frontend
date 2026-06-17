'use client';

/**
 * UserDropdownSkeleton - Composant de chargement du dropdown utilisateur
 * 
 * Affiche un skeleton loading avec une animation de pulsation
 * pour une meilleure expérience utilisateur pendant le chargement
 */
export default function UserDropdownSkeleton() {
  return (
    <div className="relative">
      {/* Bouton skeleton */}
      <button
        disabled
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-600 cursor-not-allowed"
      >
        <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
        <div className="w-16 h-4 bg-gray-700 rounded animate-pulse hidden sm:block" />
      </button>

      {/* Dropdown skeleton */}
      <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 overflow-hidden z-50">
        {/* Section 1 - User Info Skeleton */}
        <div className="px-4 py-4 bg-gray-750">
          <div className="flex items-start gap-3">
            {/* Avatar skeleton */}
            <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse flex-shrink-0" />

            {/* User info skeleton */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-40 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-24 bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700" />

        {/* Section 2 - Stats Skeleton */}
        <div className="px-4 py-3">
          <div className="h-3 w-28 bg-gray-700 rounded animate-pulse mb-2" />

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-700 rounded-lg p-2 h-16 animate-pulse" />
            <div className="bg-gray-700 rounded-lg p-2 h-16 animate-pulse" />
            <div className="bg-gray-700 rounded-lg p-2 h-16 animate-pulse" />
          </div>
        </div>

        <div className="border-t border-gray-700" />

        {/* Section 3 - Quick Links Skeleton */}
        <div className="py-2">
          <div className="px-4 py-2 h-3 w-28 bg-gray-700 rounded animate-pulse mb-2" />

          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-4 py-2 h-8 bg-gray-700 rounded animate-pulse mb-2"
            />
          ))}
        </div>

        <div className="border-t border-gray-700" />

        {/* Section 4 - Account Skeleton */}
        <div className="py-2">
          <div className="px-4 py-2 h-3 w-28 bg-gray-700 rounded animate-pulse mb-2" />

          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="px-4 py-2 h-8 bg-gray-700 rounded animate-pulse mb-2"
            />
          ))}
        </div>

        <div className="border-t border-gray-700" />

        {/* Logout Button Skeleton */}
        <button
          disabled
          className="w-full px-4 py-3 h-10 bg-gray-700 rounded animate-pulse cursor-not-allowed"
        />
      </div>
    </div>
  );
}
