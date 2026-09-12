import ApproverQueue from "@/app/components/ApproverQueue";

export const dynamic = "force-dynamic";

export default function ProcurementQueuePage() {
  return <ApproverQueue roleKey="procurement" basePath="/procurement/requests" />;
}
