"use client";

import { useEffect, useRef } from "react";
import { ShepherdJourneyProvider, useShepherd } from "react-shepherd";
import "shepherd.js/dist/css/shepherd.css";

const TOUR_SEEN_KEY = "reachdem-contacts-tour-seen";

function ContactsTourInner({ hasContacts }: { hasContacts: boolean }) {
  const Shepherd = useShepherd();
  const started = useRef(false);

  useEffect(() => {
    if (hasContacts) return;
    if (typeof window !== "undefined" && localStorage.getItem(TOUR_SEEN_KEY))
      return;
    if (started.current) return;
    started.current = true;

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        scrollTo: { behavior: "smooth", block: "center" },
      },
    });

    tour.addStep({
      id: "contacts-welcome",
      title: "Welcome to Contacts",
      text: "This is where you manage all your contacts. Let's show you how to get started by importing your first contacts.",
      buttons: [
        {
          text: "Skip",
          action() {
            tour.cancel();
          },
          secondary: true,
        },
        {
          text: "Get started →",
          action() {
            tour.next();
          },
        },
      ],
    });

    tour.addStep({
      id: "contacts-import",
      attachTo: { element: "#contacts-import-btn", on: "bottom" },
      title: "Import your contacts",
      text: "Click <strong>Import</strong> to upload a CSV file. You'll be able to map columns like name, phone number, and email during the process.",
      buttons: [
        {
          text: "Back",
          action() {
            tour.back();
          },
          secondary: true,
        },
        {
          text: "Next →",
          action() {
            tour.next();
          },
        },
      ],
    });

    tour.addStep({
      id: "contacts-add",
      attachTo: { element: "#contacts-add-btn", on: "bottom" },
      title: "Add a contact manually",
      text: "You can also add contacts one by one. Click <strong>Add Contact</strong> and fill in their details directly.",
      buttons: [
        {
          text: "Back",
          action() {
            tour.back();
          },
          secondary: true,
        },
        {
          text: "Next →",
          action() {
            tour.next();
          },
        },
      ],
    });

    tour.addStep({
      id: "contacts-groups",
      attachTo: { element: "#contacts-groups-nav", on: "right" },
      title: "Organize with Groups & Segments",
      text: "Once your contacts are imported, use <strong>Groups</strong> and <strong>Segments</strong> to organize them for targeted campaigns.",
      buttons: [
        {
          text: "Back",
          action() {
            tour.back();
          },
          secondary: true,
        },
        {
          text: "Got it!",
          action() {
            tour.complete();
          },
        },
      ],
    });

    tour.on("cancel", () => {
      localStorage.setItem(TOUR_SEEN_KEY, "true");
    });

    tour.on("complete", () => {
      localStorage.setItem(TOUR_SEEN_KEY, "true");
    });

    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      tour.start();
    }, 800);

    return () => {
      clearTimeout(timer);
    };
  }, [hasContacts, Shepherd]);

  return null;
}

interface ContactsOnboardingTourProps {
  hasContacts: boolean;
}

export function ContactsOnboardingTour({
  hasContacts,
}: ContactsOnboardingTourProps) {
  return (
    <ShepherdJourneyProvider>
      <ContactsTourInner hasContacts={hasContacts} />
    </ShepherdJourneyProvider>
  );
}
