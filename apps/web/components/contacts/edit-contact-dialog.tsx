"use client";

import * as React from "react";
import { toast } from "sonner";
import { IconLoader2 } from "@tabler/icons-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateContact } from "@/app/actions/contacts";
import type { ContactRow } from "@/components/contacts/contact-data-table";

interface EditContactDialogProps {
  contact: ContactRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FormData = {
  name: string;
  email: string;
  phoneE164: string;
  gender: string;
  work: string;
  enterprise: string;
  address: string;
};

const getInitialFormData = (contact: ContactRow): FormData => ({
  name: contact.name || "",
  email: contact.email || "",
  phoneE164: contact.phoneE164 || "",
  gender: (contact.gender as string) || "UNKNOWN",
  work: contact.work || "",
  enterprise: contact.enterprise || "",
  address: "",
});

const useFormData = (contact: ContactRow, open: boolean) => {
  const [formData, setFormData] = React.useState<FormData>(
    getInitialFormData(contact)
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      setFormData(getInitialFormData(contact));
      setErrors({});
    }
  }, [open, contact]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return { formData, errors, handleChange, validateForm };
};

const buildContactPayload = (formData: FormData) => ({
  name: formData.name,
  email: formData.email || null,
  phoneE164: formData.phoneE164 || null,
  gender: formData.gender || "UNKNOWN",
  work: formData.work || null,
  enterprise: formData.enterprise || null,
  address: formData.address || null,
});

const useContactSubmit = (
  contactId: string,
  onOpenChange: (open: boolean) => void,
  onSuccess?: () => void
) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleUpdateSuccess = () => {
    toast.success("Contact updated successfully");
    onOpenChange(false);
    onSuccess?.();
  };

  const handleUpdateError = (error: string | undefined) => {
    toast.error(error || "Failed to update contact");
  };

  const submitContactUpdate = async (
    payload: ReturnType<typeof buildContactPayload>
  ) => {
    const result = await updateContact(contactId, payload);

    if (result.success) {
      handleUpdateSuccess();
    } else {
      handleUpdateError(result.error);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent,
    formData: FormData,
    validateForm: () => boolean
  ) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContactUpdate(buildContactPayload(formData));
    } catch (error) {
      toast.error("An error occurred while updating the contact");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, handleSubmit };
};

interface ContactFormFieldsProps {
  formData: FormData;
  errors: Record<string, string>;
  isSubmitting: boolean;
  handleChange: (field: string, value: string) => void;
}

function ContactFormFields({
  formData,
  errors,
  handleChange,
}: ContactFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />
        {errors.name && (
          <p className="text-destructive text-sm">{errors.name}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
          {errors.email && (
            <p className="text-destructive text-sm">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phoneE164">Phone</Label>
          <Input
            id="phoneE164"
            placeholder="+237123456789"
            value={formData.phoneE164}
            onChange={(e) => handleChange("phoneE164", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => handleChange("gender", value)}
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
              <SelectItem value="UNKNOWN">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="work">Work</Label>
          <Input
            id="work"
            placeholder="Software Engineer"
            value={formData.work}
            onChange={(e) => handleChange("work", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="enterprise">Enterprise</Label>
        <Input
          id="enterprise"
          placeholder="Company Name"
          value={formData.enterprise}
          onChange={(e) => handleChange("enterprise", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          placeholder="123 Main St, City"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
        />
      </div>
    </>
  );
}

export function EditContactDialog({
  contact,
  open,
  onOpenChange,
  onSuccess,
}: EditContactDialogProps) {
  const { formData, errors, handleChange, validateForm } = useFormData(
    contact,
    open
  );
  const { isSubmitting, handleSubmit } = useContactSubmit(
    contact.id,
    onOpenChange,
    onSuccess
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>
            Update contact information. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => handleSubmit(e, formData, validateForm)}
          className="space-y-4"
        >
          <ContactFormFields
            formData={formData}
            errors={errors}
            isSubmitting={isSubmitting}
            handleChange={handleChange}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
