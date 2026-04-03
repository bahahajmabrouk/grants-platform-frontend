import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface Step {
  id: number;
  label: string;
  path: string;
  storageKey: string | null; // null for step 1, key to check for other steps
}

export interface StepsNavbarProps {
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

const STEPS: Step[] = [
  {
    id: 1,
    label: "Upload",
    path: "/upload",
    storageKey: null, // Always enabled
  },
  {
    id: 2,
    label: "Grants",
    path: "/grants",
    storageKey: "pitch_id", // Check if pitch uploaded
  },
  {
    id: 3,
    label: "Adaptation",
    path: "/grants-adaptation",
    storageKey: "selectedGrantIds", // Check if grants selected
  },
  {
    id: 4,
    label: "Submission",
    path: "/submissions",
    storageKey: "adapted_data", // Check if adaptation done
  },
];

export default function StepsNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [enabledSteps, setEnabledSteps] = useState<Set<number>>(new Set([1]));
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [tooltipVisible, setTooltipVisible] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Check localStorage to determine enabled steps
  useEffect(() => {
    const checkStepsStatus = () => {
      const newEnabled = new Set<number>([1]); // Step 1 always enabled
      const newCompleted = new Set<number>();

      // Check each step
      STEPS.forEach((step) => {
        if (step.storageKey === null) {
          // Step 1 is always enabled
          return;
        }

        const value = localStorage.getItem(step.storageKey);
        if (value) {
          newEnabled.add(step.id);
          // Mark as completed if we're past this step
          if (step.id < 4) {
            newCompleted.add(step.id);
          }
        }
      });

      setEnabledSteps(newEnabled);
      setCompletedSteps(newCompleted);
    };

    checkStepsStatus();
    const interval = setInterval(checkStepsStatus, 1000); // Poll every second

    return () => clearInterval(interval);
  }, []);

  // Update current step based on pathname
  useEffect(() => {
    const current = STEPS.find((step) => pathname.includes(step.path));
    if (current) {
      setCurrentStep(current.id);
    }
  }, [pathname]);

  const handleStepClick = (step: Step, event: React.MouseEvent<HTMLElement>) => {
    if (!enabledSteps.has(step.id)) {
      // Show tooltip
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      setTooltipPosition({
        top: rect.top - 40,
        left: rect.left + rect.width / 2,
      });
      setTooltipVisible(step.id);
      setTimeout(() => setTooltipVisible(null), 3000);
      return;
    }

    router.push(step.path);
  };

  const getStepStatus = (step: Step): "disabled" | "active" | "completed" => {
    if (!enabledSteps.has(step.id)) {
      return "disabled";
    }
    if (currentStep === step.id) {
      return "active";
    }
    if (completedSteps.has(step.id)) {
      return "completed";
    }
    return "active";
  };

  return (
    <>
      <style>{`
        .steps-navbar-container {
          display: flex;
          gap: 4px;
          position: relative;
        }

        .steps-navbar-step {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid #30363d;
          cursor: default;
          transition: all 0.2s ease;
          position: relative;
        }

        .steps-navbar-step.disabled {
          color: #7d8590;
          border-color: #30363d;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .steps-navbar-step.active {
          color: #3fb950;
          background: rgba(35, 134, 54, 0.15);
          border-color: rgba(35, 134, 54, 0.4);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .steps-navbar-step.active:hover {
          background: rgba(35, 134, 54, 0.25);
          border-color: rgba(35, 134, 54, 0.6);
        }

        .steps-navbar-step.completed {
          color: #7d8590;
          border-color: #30363d;
          cursor: default;
        }

        .steps-navbar-step.current {
          background: rgba(35, 134, 54, 0.15);
          border-color: rgba(35, 134, 54, 0.4);
          color: #3fb950;
          box-shadow: 0 0 0 2px rgba(63, 185, 80, 0.1);
        }

        .step-icon {
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
        }

        .step-text {
          white-space: nowrap;
        }

        .step-tooltip {
          position: fixed;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 11px;
          color: #f85149;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          animation: slide-up 0.2s ease;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .steps-navbar-container {
            gap: 2px;
          }

          .steps-navbar-step {
            padding: 5px 10px;
            font-size: 11px;
          }

          .step-text {
            font-size: 10px;
          }
        }
      `}</style>

      <div className="steps-navbar-container">
        {STEPS.map((step) => {
          const status = getStepStatus(step);
          const isCurrentStep = currentStep === step.id;

          return (
            <div
              key={step.id}
              onClick={(e) => handleStepClick(step, e)}
              className={`steps-navbar-step ${status} ${isCurrentStep ? "current" : ""}`}
              title={
                status === "disabled"
                  ? "Complete previous steps first"
                  : `${step.id}. ${step.label}`
              }
            >
              <div className="step-icon">
                {status === "completed" ? (
                  <span>✓</span>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>
              <div className="step-text">{step.label}</div>
            </div>
          );
        })}

        {/* Tooltip */}
        {tooltipVisible !== null && (
          <div
            className="step-tooltip"
            style={{
              top: `${tooltipPosition.top}px`,
              left: `${tooltipPosition.left}px`,
              transform: "translateX(-50%)",
            }}
          >
            ⚠️ Complete previous steps first
          </div>
        )}
      </div>
    </>
  );
}
