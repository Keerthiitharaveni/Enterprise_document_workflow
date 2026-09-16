import { stepStatusList } from "@/app/lib/workflow";

const NODE_STYLES = {
  approved: "border-pine bg-pine text-white",
  rejected: "border-brick bg-brick text-white",
  pending: "border-line bg-paper text-slate",
};

const LINE_STYLES = {
  approved: "bg-pine",
  rejected: "bg-brick",
  pending: "bg-line",
};

export default function ApprovalStepper({ request }) {
  const steps = stepStatusList(request);

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate mb-1">
        Routing slip
      </p>
      <p className="text-sm text-ink/70 mb-4">
        {request.current_stage}
        {request.current_approver_name ? ` · ${request.current_approver_name}` : ""}
        {request.current_step_order ? ` · Step ${request.current_step_order} of ${request.total_approval_steps}` : ""}
      </p>
      <div className="flex items-start rail-scroll overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.id || `${step.role}-${i}`} className="flex items-center min-w-[140px] last:min-w-0">
            <div className="flex flex-col items-center text-center w-[110px]">
              <div
                className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${NODE_STYLES[step.status]}`}
              >
                {step.status === "approved" ? "✓" : step.status === "rejected" ? "✕" : i + 1}
              </div>
              <p className="mt-2 text-sm font-medium text-ink">{step.label}</p>
              <p className={`text-xs ${step.isCurrent ? "text-ink font-medium" : "text-slate"}`}>
                {step.approverName || "Unassigned"}
              </p>
              {step.decidedAt && (
                <p className="text-[11px] text-slate/80 mt-0.5">
                  {new Date(step.decidedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-10 mt-[-28px] ${LINE_STYLES[step.status]}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
