import { CommonListPage } from "../../../../../features/common/interface/pages/common-pages";

export default async function CommonModulePage({
  params,
}: {
  readonly params: Promise<{ readonly moduleKey: string }>;
}) {
  const { moduleKey } = await params;
  return <CommonListPage moduleKey={moduleKey} />;
}
