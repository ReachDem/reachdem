import { ContactsTable } from "@/components/contacts-table";
import { ContactStats } from "@/components/contact-stats";

export default function ContactsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <ContactStats />
          <ContactsTable />
        </div>
      </div>
    </div>
  );
}
