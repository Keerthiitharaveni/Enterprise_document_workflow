import ApproverDetail from "@/app/components/ApproverDetail";

export const dynamic = "force-dynamic";

export default function ProcurementRequestDetail({ params }) {
  return <ApproverDetail id={params.id} roleKey="procurement" basePath="/procurement" />;
}
