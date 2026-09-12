import ApproverDetail from "@/app/components/ApproverDetail";

export const dynamic = "force-dynamic";

export default function AdminRequestDetail({ params }) {
  return <ApproverDetail id={params.id} roleKey="admin" basePath="/admin" />;
}
