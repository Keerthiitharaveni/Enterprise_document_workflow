import ApproverDetail from "@/app/components/ApproverDetail";

export const dynamic = "force-dynamic";

export default function ManagerRequestDetail({ params }) {
  return <ApproverDetail id={params.id} roleKey="manager" basePath="/manager" />;
}
