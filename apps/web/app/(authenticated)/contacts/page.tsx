import { ContactsTable } from "@/components/contacts-table";
import { ContactsHydrator } from "@/components/contacts-hydrator";
import { getContacts } from "@/app/actions/contacts";
import { ContactsOnboardingTour } from "@/components/contacts-onboarding-tour";

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="flex flex-1 flex-col">
      <ContactsOnboardingTour hasContacts={contacts.length > 0} />
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <ContactsHydrator contacts={contacts as any} />
          <ContactsTable initialContacts={contacts as any} />
        </div>
      </div>
    </div>
  );
}
