"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getUser, clearAuth } from "@/lib/auth";
import type { Grant, GrantFilters, GrantIndustry, SelectedGrants } from "@/types/grants";
import { User } from "@/types/auth";
import StepsNavbar from "@/components/StepsNavbar";

const INDUSTRIES: GrantIndustry[] = ["Tech", "Biotech", "FinTech", "CleanTech", "HealthTech", "AgriTech"];


async function searchGrantsFromAPI(pitchData: any, token: string): Promise<Grant[]> {
  try {
    // Normalize pitch data values to match backend expectations
    const normalizeIndustry = (ind: string): string => {
      if (!ind) return "Tech";
      const mapping: { [key: string]: string } = {
        "traveltech": "FinTech",
        "travel": "FinTech",
        "finance": "FinTech",
        "fintech": "FinTech",
        "biotech": "Biotech",
        "bio": "Biotech",
        "health": "HealthTech",
        "healthtech": "HealthTech",
        "agri": "AgriTech",
        "agriculture": "AgriTech",
        "cleantech": "CleanTech",
        "clean": "CleanTech",
        "energy": "CleanTech",
      };
      const lower = ind.toLowerCase();
      return mapping[lower] || "Tech";
    };

    const normalizeStage = (stg: string): string => {
      if (!stg) return "Seed";
      const mapping: { [key: string]: string } = {
        "early": "Seed",
        "pre-seed": "Seed",
        "preseed": "Seed",
        "seed": "Seed",
        "series-a": "Series A",
        "series a": "Series A",
        "seriesA": "Series A",
        "series-b": "Series B",
        "series b": "Series B",
        "seriesB": "Series B",
      };
      const lower = stg.toLowerCase();
      return mapping[lower] || "Seed";
    };

    const normalizeCountry = (cnt: string): string => {
      if (!cnt) return "US";
      const mapping: { [key: string]: string } = {
        "usa": "US",
        "us": "US",
        "united states": "US",
        "europe": "EU",
        "eu": "EU",
        "european": "EU",
        "global": "Global",
        "world": "Global",
        "international": "Global",
      };
      const lower = cnt.toLowerCase();
      return mapping[lower] || "Global";
    };

    const response = await fetch("http://localhost:8000/api/v1/grants/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pitch_id: pitchData?.pitch_id || "default-pitch",
        industry: normalizeIndustry(pitchData?.industry),
        stage: normalizeStage(pitchData?.stage),
        country: normalizeCountry(pitchData?.country),
        keywords: pitchData?.keywords || [],
        max_results: 20,
      }),
    });

    if (!response.ok) {
      console.error("API Error:", response.statusText);
      return [];
    }

    const data = await response.json();
    console.log("🎯 Raw API Response grants:", data.grants);
    console.log("🎯 Data grants is Array?", Array.isArray(data.grants));
    console.log("🎯 First item:", data.grants?.[0]);
    
    // Handle both single array and nested array cases
    let grantsArray = data.grants;
    if (grantsArray?.length === 1 && Array.isArray(grantsArray[0])) {
      console.warn("⚠️ Detected nested array, flattening...");
      grantsArray = grantsArray[0];
    }
    
    // ✅ Transformer les résultats API en format Grant
    const transformedGrants = grantsArray.map((grant: any, index: number) => {
      console.log(`Processing grant ${index}:`, grant);
      const transformed = {
        id: grant.grant_id,
        name: grant.name,
        icon: getIconForGrant(grant.organization),
        amount: parseFloat(grant.funding_amount?.match(/[\d,]+/)?.[0]?.replace(/,/g, "") || "0"),
        currency: "USD",
        deadline: grant.deadline ? calculateDaysUntilDeadline(grant.deadline) : 30,
        matchPercentage: Math.round((grant.relevance_score || 0) * 100),
        industry: grant.industry_focus?.[0] || "Tech",
        stage: grant.stage_focus?.[0] || "Seed",
        description: grant.description || "",
        organization: grant.organization || "",
        country: grant.country_focus?.[0] || "Global",
        portal_url: grant.portal_url || "",
      };
      console.log(`Transformed grant ${index}:`, transformed);
      return transformed;
    });
    console.log("✅ All transformed grants:", transformedGrants);
    return transformedGrants;
  } catch (error) {
    console.error("Error fetching grants:", error);
    return [];
  }
}

// ✅ HELPER: Déterminer un icon basé sur l'organisation
function getIconForGrant(organization: string): string {
  const icons: { [key: string]: string } = {
    Google: "🔍",
    "Y Combinator": "🚀",
    Stripe: "💨",
    "Bill & Melinda Gates Foundation": "🏥",
    "European Commission": "🇪🇺",
    Mastercard: "💳",
    "Carbon Trust": "🌱",
    UNDP: "👩",
    "World Bank": "🌍",
    "Global Innovation Fund": "💡",
    TechCrunch: "⚔️",
    Singapore: "🧬",
    "Agri Foundation": "🌾",
    "British Council": "🏦",
    "Saudi Health": "🏥",
  };

  for (const [key, icon] of Object.entries(icons)) {
    if (organization.includes(key)) return icon;
  }
  return "🎯";
}

// ✅ HELPER: Calculer les jours jusqu'à deadline
function calculateDaysUntilDeadline(deadline: string): number {
  if (!deadline) return 30;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diff = deadlineDate.getTime() - today.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return Math.max(days, 0);
}

export default function GrantsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  // ✅ NOUVEAU: State pour grants et loading
  const [grants, setGrants] = useState<Grant[]>([]);
  const [grantsLoading, setGrantsLoading] = useState(true);
  const [grantsError, setGrantsError] = useState<string | null>(null);

  // Filters state
  const [filters, setFilters] = useState<GrantFilters>({
    industry: "All",
    amountRange: { min: 0, max: 5000000 },
    deadline: "Any",
    search: "",
  });

  // Selected grants
  const [selectedGrants, setSelectedGrants] = useState<SelectedGrants>({});

  // Effects
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      const userData = getUser();
      setUser(userData);
      setIsLoading(false);
    }
  }, [router]);

  // ✅ NOUVEAU: Charger les grants depuis l'API au démarrage
  useEffect(() => {
    const fetchGrants = async () => {
      setGrantsLoading(true);
      setGrantsError(null);

      try {
        // Récupérer les données du pitch depuis localStorage
        const pitchData = localStorage.getItem("pitch_data");
        const parsedPitchData = pitchData ? JSON.parse(pitchData) : null;
        
        // Récupérer le token
        const token = localStorage.getItem("token") || localStorage.getItem("access_token")
        if (!token) {
          throw new Error("No authentication token found");
        }

        // Appeler l'API
        const apiGrants = await searchGrantsFromAPI(parsedPitchData, token);
        
        console.log("✅ API Grants returned:", apiGrants.length);
        
        setGrants(apiGrants);
        
        if (apiGrants.length === 0) {
          setGrantsError("Aucun grant trouvé pour votre profil");
        } else {
          setGrantsError(null);  // ← CLEAR error si on a des grants
        }
      } catch (error) {
        console.error("Error loading grants:", error);
        setGrantsError(error instanceof Error ? error.message : "Erreur lors du chargement");
      } finally {
        setGrantsLoading(false);
      }
    };

    fetchGrants();
  }, []);

  // Filter grants
  const filteredGrants = useMemo(() => {
    return grants.filter((grant) => {
      // Industry filter
      if (filters.industry !== "All" && grant.industry !== filters.industry) {
        return false;
      }

      // Amount range filter
      if (grant.amount < filters.amountRange.min || grant.amount > filters.amountRange.max) {
        return false;
      }

      // Deadline filter
      if (filters.deadline !== "Any") {
        const days = parseInt(filters.deadline);
        if (grant.deadline > days) {
          return false;
        }
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          grant.name.toLowerCase().includes(search) ||
          grant.organization.toLowerCase().includes(search) ||
          grant.description.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [grants, filters]);

  // Stats
  const stats = useMemo(() => {
    const totalAmount = filteredGrants.reduce((sum, g) => sum + g.amount, 0);
    const earliestDeadline = filteredGrants.length > 0 
      ? Math.min(...filteredGrants.map((g) => g.deadline))
      : 0;
    return {
      count: filteredGrants.length,
      totalAmount,
      earliestDeadline,
    };
  }, [filteredGrants]);

  const selectedCount = Object.values(selectedGrants).filter(Boolean).length;

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  const handleGrantToggle = (grantId: string) => {
    setSelectedGrants((prev) => ({
      ...prev,
      [grantId]: !prev[grantId],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = filteredGrants.length === selectedCount;
    const newSelection: SelectedGrants = {};
    if (!allSelected) {
      filteredGrants.forEach((grant) => {
        newSelection[grant.id] = true;
      });
    }
    setSelectedGrants(newSelection);
  };

  const handleNext = () => {
    const selected = Object.entries(selectedGrants)
      .filter(([, isSelected]) => isSelected)
      .map(([id]) => id);

    localStorage.setItem("selectedGrantIds", JSON.stringify(selected));
    router.push("/grants-adaptation");
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0d1117; color: #e6edf3; font-family: 'Segoe UI', system-ui, sans-serif; }

        .page { min-height: 100vh; background: #0d1117; padding: 0; }

        /* NAV */
        .nav {
          border-bottom: 1px solid #21262d;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(13,17,23,0.95);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .nav-logo { display: flex; align-items: center; gap: 10px; }
        .nav-logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .nav-logo-text { font-size: 15px; font-weight: 700; color: white; }

        .nav-steps { display: flex; gap: 4px; }
        .nav-step {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #30363d;
          color: #7d8590;
          cursor: default;
        }
        .nav-step.active {
          background: rgba(35,134,54,0.15);
          border-color: rgba(35,134,54,0.4);
          color: #3fb950;
        }

        /* USER PROFILE CARD */
        .user-profile-wrapper {
          position: relative;
        }

        .user-profile-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(21,25,32,0.5);
          border: 1px solid #30363d;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .user-profile-card:hover {
          background: rgba(31,35,42,0.8);
          border-color: #3fb950;
        }

        .profile-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .profile-name {
          font-size: 13px;
          font-weight: 600;
          color: white;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-company {
          font-size: 11px;
          color: #7d8590;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-chevron {
          font-size: 12px;
          color: #7d8590;
          transition: transform 0.2s ease;
          flex-shrink: 0;
          margin-left: 4px;
        }

        .profile-chevron.active {
          transform: rotate(180deg);
          color: #3fb950;
        }

        /* DROPDOWN MENU */
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          min-width: 280px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 100;
          opacity: 0;
          visibility: hidden;
          transform: translateY(-8px);
          transition: all 0.2s ease;
        }

        .profile-dropdown.active {
          opacity: 1;
          visibility: visible;
          transform: translateY(0);
        }

        .dropdown-header {
          padding: 16px;
          border-bottom: 1px solid #21262d;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dropdown-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #238636, #2ea043);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .dropdown-user-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .dropdown-user-name {
          font-size: 13px;
          font-weight: 700;
          color: white;
        }

        .dropdown-user-email {
          font-size: 12px;
          color: #7d8590;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown-user-company {
          font-size: 11px;
          color: #58a6ff;
          font-weight: 500;
        }

        .dropdown-body {
          padding: 8px 8px;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          color: #7d8590;
          font-size: 13px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .dropdown-item:hover {
          background: rgba(35,134,54,0.1);
          color: #adbac7;
        }

        .dropdown-item.logout {
          color: #f85149;
          border-top: 1px solid #21262d;
          margin-top: 4px;
          padding-top: 10px;
        }

        .dropdown-item.logout:hover {
          background: rgba(248,81,73,0.1);
          color: #ff7b72;
        }

        .profile-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 16px;
          color: #7d8590;
          font-size: 13px;
        }

        .loading-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid #30363d;
          border-top-color: #3fb950;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* MAIN CONTENT */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 40px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(35,134,54,0.1);
          border: 1px solid rgba(35,134,54,0.3);
          color: #3fb950;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-bottom: 20px;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3fb950;
          animation: pulse 2s infinite;
        }

        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

        .header {
          margin-bottom: 40px;
        }

        .title {
          font-size: 32px;
          font-weight: 800;
          line-height: 1.2;
          color: white;
          margin-bottom: 12px;
        }

        .subtitle {
          font-size: 14px;
          color: #7d8590;
          line-height: 1.6;
        }

        /* LOADING STATE */
        .loading-message {
          text-align: center;
          padding: 60px 20px;
          color: #7d8590;
        }

        .loading-message .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #30363d;
          border-top-color: #3fb950;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 20px;
        }

        .loading-message .text {
          font-size: 14px;
        }

        /* ERROR STATE */
        .error-message {
          background: rgba(248, 81, 73, 0.1);
          border: 1px solid rgba(248, 81, 73, 0.3);
          border-radius: 8px;
          padding: 16px;
          color: #ff7b72;
          text-align: center;
          margin: 20px 0;
        }

        /* STATS */
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 10px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .stat-card:hover {
          border-color: #30363d;
          background: rgba(31,35,42,0.5);
        }

        .stat-label {
          font-size: 11px;
          color: #7d8590;
          font-family: monospace;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .stat-value {
          font-size: 20px;
          font-weight: 800;
          color: #3fb950;
          margin-bottom: 4px;
        }

        .stat-subtext {
          font-size: 12px;
          color: #7d8590;
        }

        /* FILTERS */
        .filters-section {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 32px;
        }

        .filters-title {
          font-size: 13px;
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: 2fr 2fr 2fr 2fr;
          gap: 12px;
          margin-bottom: 16px;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 11px;
          color: #7d8590;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-input,
        .filter-select {
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 10px 12px;
          color: #e6edf3;
          font-size: 12px;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #3fb950;
          background: #0d1117;
          box-shadow: 0 0 0 2px rgba(63, 185, 80, 0.1);
        }

        .filter-input::placeholder {
          color: #7d8590;
        }

        .range-inputs {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .range-input {
          flex: 1;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 8px;
          padding: 10px 12px;
          color: #e6edf3;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .range-input:focus {
          outline: none;
          border-color: #3fb950;
          box-shadow: 0 0 0 2px rgba(63, 185, 80, 0.1);
        }

        .range-separator {
          color: #7d8590;
          font-weight: 600;
        }

        .filter-buttons {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn {
          border: 1px solid #30363d;
          background: transparent;
          color: #7d8590;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn:hover {
          border-color: #3fb950;
          color: #3fb950;
        }

        .btn-primary {
          background: #238636;
          border-color: #2ea043;
          color: white;
        }

        .btn-primary:hover {
          background: #2ea043;
          border-color: #31c42f;
          color: white;
        }

        /* GRANTS LIST */
        .grants-container {
          margin-bottom: 32px;
        }

        .grants-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding: 0 4px;
        }

        .grants-count {
          font-size: 13px;
          color: #7d8590;
          font-weight: 600;
        }

        .select-all-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .select-all-checkbox {
          width: 18px;
          height: 18px;
          border: 1px solid #30363d;
          border-radius: 4px;
          background: #0d1117;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
        }

        .select-all-checkbox:checked {
          background: #3fb950;
          border-color: #3fb950;
        }

        .select-all-label {
          font-size: 12px;
          color: #7d8590;
          font-weight: 600;
          cursor: pointer;
          user-select: none;
        }

        .grants-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .grant-card {
          background: #161b22;
          border: 1px solid #21262d;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .grant-card:hover {
          border-color: #3fb950;
          background: rgba(31,35,42,0.7);
          transform: translateY(-2px);
        }

        .grant-card.selected {
          border-color: #3fb950;
          background: rgba(63, 185, 80, 0.05);
          box-shadow: inset 0 0 0 1px rgba(63, 185, 80, 0.2);
        }

        .grant-checkbox {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 18px;
          height: 18px;
          border: 1px solid #30363d;
          border-radius: 4px;
          background: #0d1117;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
        }

        .grant-checkbox:hover {
          border-color: #3fb950;
        }

        .grant-checkbox:checked {
          background: #3fb950;
          border-color: #3fb950;
        }

        .grant-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 12px;
          padding-right: 28px;
        }

        .grant-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .grant-title {
          font-size: 13px;
          font-weight: 700;
          color: white;
          margin-bottom: 2px;
          line-height: 1.3;
        }

        .grant-org {
          font-size: 11px;
          color: #7d8590;
        }

        .grant-metadata {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px;
          background: rgba(35,134,54,0.03);
          border-radius: 6px;
        }

        .grant-amount {
          font-size: 14px;
          font-weight: 700;
          color: #3fb950;
        }

        .grant-deadline {
          font-size: 11px;
          color: #7d8590;
        }

        .grant-match {
          font-size: 11px;
          background: rgba(88,166,255,0.1);
          color: #58a6ff;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
        }

        .grant-description {
          font-size: 12px;
          color: #8b949e;
          line-height: 1.5;
          margin-bottom: 12px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .grant-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tag {
          font-size: 10px;
          padding: 3px 8px;
          border-radius: 4px;
          background: #21262d;
          color: #7d8590;
          border: 1px solid #30363d;
        }

        .tag.industry {
          background: rgba(88,166,255,0.1);
          color: #58a6ff;
          border-color: rgba(88,166,255,0.2);
        }

        .tag.stage {
          background: rgba(35,134,54,0.1);
          color: #3fb950;
          border-color: rgba(35,134,54,0.2);
        }

        /* BOTTOM ACTION */
        .action-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          background: rgba(13,17,23,0.8);
          border-top: 1px solid #21262d;
          position: sticky;
          bottom: 0;
        }

        .selected-info {
          font-size: 13px;
          color: #7d8590;
        }

        .selected-info strong {
          color: #3fb950;
          font-weight: 700;
        }

        .btn-next {
          background: #238636;
          border: 1px solid #2ea043;
          color: white;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-next:hover:not(:disabled) {
          background: #2ea043;
          border-color: #31c42f;
        }

        .btn-next:disabled {
          background: #30363d;
          border-color: #21262d;
          color: #7d8590;
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .container {
            padding: 24px 20px;
          }

          .title {
            font-size: 24px;
          }

          .filters-grid {
            grid-template-columns: 1fr 1fr;
          }

          .stats {
            grid-template-columns: 1fr;
          }

          .grants-grid {
            grid-template-columns: 1fr;
          }

          .nav {
            padding: 12px 20px;
          }

          .nav-steps {
            display: none;
          }

          .action-footer {
            padding: 16px 20px;
            flex-direction: column;
            gap: 12px;
          }

          .btn-next {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="page">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">🚀</div>
            <span className="nav-logo-text">Grants Platform</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <StepsNavbar />

            {/* USER PROFILE SECTION */}
            {isLoading ? (
              <div className="profile-loading">
                <div className="loading-spinner"></div>
              </div>
            ) : user ? (
              <div className="user-profile-wrapper">
                <div
                  className="user-profile-card"
                  onClick={() => setShowDropdown(!showDropdown)}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="profile-avatar">
                    {(user.first_name?.[0] || "").toUpperCase()}
                    {(user.last_name?.[0] || "").toUpperCase()}
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="profile-company">
                      {user.company_name || "No company"}
                    </div>
                  </div>
                  <div className={`profile-chevron ${showDropdown ? "active" : ""}`}>
                    ▼
                  </div>
                </div>

                {/* DROPDOWN MENU */}
                <div
                  className={`profile-dropdown ${showDropdown ? "active" : ""}`}
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {(user.first_name?.[0] || "").toUpperCase()}
                      {(user.last_name?.[0] || "").toUpperCase()}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-user-name">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="dropdown-user-email">{user.email}</div>
                      <div className="dropdown-user-company">
                        {user.company_name || "No company"}
                      </div>
                    </div>
                  </div>
                  <div className="dropdown-body">
                    <div
                      className="dropdown-item logout"
                      onClick={() => {
                        setShowDropdown(false);
                        handleLogout();
                      }}
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <div className="container">
          <div className="badge">
            <div className="badge-dot"></div>
            Étape 2 sur 4
          </div>

          {/* ✅ LOADING STATE */}
          {grantsLoading ? (
            <div className="loading-message">
              <div className="spinner"></div>
              <div className="text">Recherche des grants adaptés à votre profil...</div>
            </div>
          ) : grantsError ? (
            <>
              <div className="header">
                <h1 className="title">Trouvez les Grants Adaptés à Votre Profil</h1>
              </div>
              <div className="error-message">
                ⚠️ {grantsError}
              </div>
            </>
          ) : (
            <>
              <div className="header">
                <h1 className="title">Trouvez les Grants Adaptés à Votre Profil</h1>
                <p className="subtitle">
                  {stats.count} grants correspondant à votre profil • Total potentiel:{" "}
                  <strong style={{ color: "#3fb950" }}>
                    ${(stats.totalAmount / 1000000).toFixed(1)}M
                  </strong>{" "}
                  • Délai le plus proche:{" "}
                  <strong style={{ color: "#f85149" }}>
                    {stats.earliestDeadline > 0 ? `${stats.earliestDeadline} jours` : "N/A"}
                  </strong>
                </p>
              </div>

              {/* STATS */}
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-label">Grants trouvés</div>
                  <div className="stat-value">{stats.count}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total potentiel</div>
                  <div className="stat-value">${(stats.totalAmount / 1000000).toFixed(1)}M</div>
                  <div className="stat-subtext">Financement possible</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Délai le plus proche</div>
                  <div className="stat-value" style={{ color: "#f85149" }}>
                    {stats.earliestDeadline > 0 ? `${stats.earliestDeadline}j` : "N/A"}
                  </div>
                  <div className="stat-subtext">Jours avant fermeture</div>
                </div>
              </div>

              {/* FILTERS */}
              <div className="filters-section">
                <div className="filters-title">🔍 Filtrer les Grants</div>
                <div className="filters-grid">
                  <div className="filter-group">
                    <label className="filter-label">Industrie</label>
                    <select
                      className="filter-select"
                      value={filters.industry}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          industry: e.target.value as GrantIndustry | "All",
                        })
                      }
                    >
                      <option value="All">Toutes les industries</option>
                      {INDUSTRIES.map((industry) => (
                        <option key={industry} value={industry}>
                          {industry}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Montant (USD)</label>
                    <div className="range-inputs">
                      <input
                        type="number"
                        className="range-input"
                        placeholder="Min"
                        value={filters.amountRange.min}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            amountRange: {
                              ...filters.amountRange,
                              min: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                      />
                      <span className="range-separator">-</span>
                      <input
                        type="number"
                        className="range-input"
                        placeholder="Max"
                        value={filters.amountRange.max}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            amountRange: {
                              ...filters.amountRange,
                              max: parseInt(e.target.value) || 5000000,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Délai</label>
                    <select
                      className="filter-select"
                      value={filters.deadline}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          deadline: e.target.value as "30" | "60" | "90" | "Any",
                        })
                      }
                    >
                      <option value="Any">N'importe quel délai</option>
                      <option value="30">30 jours</option>
                      <option value="60">60 jours</option>
                      <option value="90">90 jours</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label className="filter-label">Recherche</label>
                    <input
                      type="text"
                      className="filter-input"
                      placeholder="Nom, organisation..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          search: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="filter-buttons">
                  <button
                    className="btn"
                    onClick={() =>
                      setFilters({
                        industry: "All",
                        amountRange: { min: 0, max: 5000000 },
                        deadline: "Any",
                        search: "",
                      })
                    }
                  >
                    ↺ Reset
                  </button>
                </div>
              </div>

              {/* GRANTS */}
              <div className="grants-container">
                <div className="grants-header">
                  <div className="grants-count">
                    {filteredGrants.length} grant{filteredGrants.length !== 1 ? "s" : ""} trouvé
                    {filteredGrants.length !== 1 ? "s" : ""}
                  </div>
                  <div className="select-all-wrap">
                    <input
                      type="checkbox"
                      className="select-all-checkbox"
                      checked={filteredGrants.length > 0 && selectedCount === filteredGrants.length}
                      onChange={handleSelectAll}
                    />
                    <label className="select-all-label">Sélectionner tout</label>
                  </div>
                </div>

                {filteredGrants.length > 0 ? (
                  <div className="grants-grid">
                    {filteredGrants.map((grant) => (
                      <div
                        key={grant.id}
                        className={`grant-card ${selectedGrants[grant.id] ? "selected" : ""}`}
                        onClick={() => handleGrantToggle(grant.id)}
                      >
                        <input
                          type="checkbox"
                          className="grant-checkbox"
                          checked={selectedGrants[grant.id] || false}
                          onChange={() => handleGrantToggle(grant.id)}
                          onClick={(e) => e.stopPropagation()}
                        />

                        <div className="grant-header">
                          <div className="grant-icon">{grant.icon}</div>
                          <div>
                            <div className="grant-title">{grant.name}</div>
                            <div className="grant-org">{grant.organization}</div>
                          </div>
                        </div>

                        <div className="grant-metadata">
                          <div className="grant-amount">
                            ${(grant.amount / 1000).toFixed(0)}K
                          </div>
                          <div className="grant-deadline">{grant.deadline}j restants</div>
                          <div className="grant-match">{grant.matchPercentage}% match</div>
                        </div>

                        <div className="grant-description">{grant.description}</div>

                        <div className="grant-tags">
                          <div className="tag industry">{grant.industry}</div>
                          <div className="tag stage">{grant.stage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: "#7d8590" }}>
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
                    <div style={{ fontSize: "14px", marginBottom: "4px" }}>
                      Aucun grant trouvé avec ces filtres
                    </div>
                    <div style={{ fontSize: "12px" }}>Essayez d'ajuster vos critères de recherche</div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ACTION FOOTER */}
        {!grantsLoading && !grantsError && (
          <div className="action-footer">
            <div className="selected-info">
              {selectedCount > 0 ? (
                <>
                  <strong>{selectedCount}</strong> grant{selectedCount !== 1 ? "s" : ""} sélectionné
                  {selectedCount !== 1 ? "s" : ""}
                </>
              ) : (
                <>Sélectionnez au moins 1 grant pour continuer</>
              )}
            </div>
            <button
              className="btn-next"
              disabled={selectedCount === 0}
              onClick={handleNext}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </>
  );
}