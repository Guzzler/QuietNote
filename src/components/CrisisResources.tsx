import { X, Phone, MessageSquare, Globe, Heart } from "lucide-react";
import { getCrisisResources, type CrisisResource } from "../utils/crisisDetection";

interface CrisisResourcesProps {
  isOpen: boolean;
  onClose: () => void;
  severity: "low" | "medium" | "high" | "critical";
}

export default function CrisisResources({ isOpen, onClose, severity }: CrisisResourcesProps) {
  if (!isOpen) return null;

  const resources = getCrisisResources("US");

  const severityColors = {
    low: "bg-blue-50 border-blue-200",
    medium: "bg-yellow-50 border-yellow-200",
    high: "bg-orange-50 border-orange-200",
    critical: "bg-red-50 border-red-200",
  };

  const severityTextColors = {
    low: "text-blue-800",
    medium: "text-yellow-800",
    high: "text-orange-800",
    critical: "text-red-800",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-modal-backdrop"
      />

      {/* Modal */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-modal-content"
        >
          {/* Header */}
          <div className={`p-6 border-b ${severityColors[severity]}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full">
                  <Heart className={`h-6 w-6 ${severityTextColors[severity]}`} />
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${severityTextColors[severity]}`}>
                    {severity === "critical" || severity === "high"
                      ? "Immediate Support Available"
                      : "Crisis Support Resources"}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    You don't have to face this alone. Help is available 24/7.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {(severity === "critical" || severity === "high") && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-900 font-medium mb-2">
                  🆘 If you're in immediate danger, call 911 or go to your nearest emergency room.
                </p>
                <p className="text-red-700 text-sm">
                  Your safety is the top priority. Emergency services can provide immediate help.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {resources.map((resource: CrisisResource, index: number) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow bg-white"
                >
                  <h3 className="font-semibold text-slate-800 mb-2">{resource.name}</h3>
                  <p className="text-sm text-slate-600 mb-3">{resource.description}</p>

                  <div className="space-y-2">
                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone}`}
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Call: {resource.phone}</span>
                      </a>
                    )}

                    {resource.text && (
                      <div className="flex items-center gap-2 text-indigo-600 font-medium text-sm">
                        <MessageSquare className="h-4 w-4" />
                        <span>{resource.text}</span>
                      </div>
                    )}

                    {resource.website && (
                      <a
                        href={resource.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                      >
                        <Globe className="h-4 w-4" />
                        <span>Visit website</span>
                      </a>
                    )}

                    <p className="text-xs text-slate-500 mt-2">
                      Available: {resource.available}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional info */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-medium text-slate-800 mb-2">About QuietNote</h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                QuietNote is a journaling companion, not a replacement for professional mental health care.
                All conversations are private and stay on your device, but we strongly encourage you to
                reach out to trained counselors when you need support.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
