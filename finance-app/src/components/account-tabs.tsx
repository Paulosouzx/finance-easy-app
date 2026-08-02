import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAccountColor } from "@/lib/account-colors";

type AccountTabsProps = {
  accounts: { id: string; name: string; color?: string | null }[];
  value: string;
  onChange: (value: string) => void;
};

const TRIGGER_CLASS =
  "rounded-none border-b-[3px] border-transparent px-3 pb-2.5 pt-1 text-sm font-medium text-muted-foreground shadow-none " +
  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

export function AccountTabs({ accounts, value, onChange }: AccountTabsProps) {
  if (!accounts.length) return null;
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
        {accounts.map((account) => (
          <TabsTrigger key={account.id} value={account.id} className={`${TRIGGER_CLASS} gap-1.5`}>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: getAccountColor(account) }}
            />
            {account.name}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
