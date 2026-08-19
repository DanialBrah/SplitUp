import Link from "next/link";

type GroupNavProps = {
  groupId: string;
  active: "expenses" | "balances" | "insights" | "members";
};

const tabs = [
  { key: "expenses", label: "Expenses", href: (id: string) => `/groups/${id}` },
  { key: "balances", label: "Balances", href: (id: string) => `/groups/${id}/balances` },
  { key: "insights", label: "Insights", href: (id: string) => `/groups/${id}/insights` },
  { key: "members", label: "Members", href: (id: string) => `/groups/${id}/members` },
] as const;

export function GroupNav({ groupId, active }: GroupNavProps) {
  return (
    <nav className="mt-4 flex gap-4 border-b border-gray-200 text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href(groupId)}
          className={
            active === tab.key
              ? "border-b-2 border-gray-900 pb-2 font-medium text-gray-900"
              : "border-b-2 border-transparent pb-2 text-gray-500 hover:text-gray-700"
          }
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
