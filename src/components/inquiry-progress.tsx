import { CheckCircle2 } from "lucide-react";
import { inquiryProgress, shipmentSteps } from "../lib/domain";
import type { ShipmentDetails } from "../lib/types";
export function InquiryProgress({
  details,
  service,
  step,
  notes,
  furthestStep = step,
}: {
  details: ShipmentDetails;
  service: string;
  step: number;
  notes: string;
  furthestStep?: number;
}) {
  const progress = inquiryProgress(details, service, step, notes, furthestStep);
  return (
    <section className="inquiry-progress" aria-label="Inquiry completion">
      <div className="between">
        <div>
          <strong>
            {progress.percent === 100
              ? "Ready to submit"
              : "Your inquiry progress"}
          </strong>
          <small>
            {progress.percent === 100
              ? "All sections are complete. Review and submit when you’re ready."
              : `${shipmentSteps(service)[step]} · ${progress.completed} of 4 sections complete`}
          </small>
        </div>
        <span className="progress-value">
          {progress.percent === 100 && <CheckCircle2 size={17} />}
          {progress.percent}%
        </span>
      </div>
      <div
        className="inquiry-progress-track"
        role="progressbar"
        aria-label="Inquiry completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-valuetext={`${progress.percent}% of inquiry sections completed`}
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
    </section>
  );
}
