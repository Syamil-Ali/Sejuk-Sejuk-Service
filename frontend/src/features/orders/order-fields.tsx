import type { DemoUser } from "@/lib/domain";
import { FormField } from "@/components/ui";

export const services = [
  "Cleaning",
  "Repair",
  "Installation",
  "Gas Refill",
  "Inspection",
  "Other",
] as const;

export function OrderFields({
  users,
  errors,
  autoFocus = false,
}: {
  users: DemoUser[];
  errors: Record<string, string>;
  autoFocus?: boolean;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TextField
        id="customerName"
        label="Customer name"
        error={errors.customerName}
        placeholder="e.g. Ahmad Rahman"
        maxLength={120}
        autoFocus={autoFocus}
      />
      <TextField
        id="customerPhone"
        label="Phone"
        error={errors.customerPhone}
        placeholder="012-345 6789"
        inputMode="tel"
        maxLength={30}
      />
      <FormField
        id="building"
        label="Building / unit"
        hint="Optional"
      >
        <input
          id="building"
          name="building"
          maxLength={80}
          className="field"
          placeholder="e.g. 12"
        />
      </FormField>
      <FormField
        id="address1"
        label="Address line 1"
        error={errors.address}
      >
        <input
          id="address1"
          name="address1"
          maxLength={200}
          className="field"
          placeholder="Street name and number"
        />
      </FormField>
      <FormField
        id="address2"
        label="Address line 2"
        hint="Optional"
        className="sm:col-span-2"
      >
        <input
          id="address2"
          name="address2"
          maxLength={200}
          className="field"
          placeholder="Unit, block or building name"
        />
      </FormField>
      <FormField id="postcode" label="Postcode" hint="Optional">
        <input
          id="postcode"
          name="postcode"
          maxLength={10}
          inputMode="numeric"
          className="field"
        />
      </FormField>
      <FormField id="city" label="City" hint="Optional">
        <input id="city" name="city" maxLength={120} className="field" />
      </FormField>
      <FormField
        id="state"
        label="State"
        hint="Optional"
        className="sm:col-span-2"
      >
        <input id="state" name="state" maxLength={120} className="field" />
      </FormField>
      <FormField
        id="problemDescription"
        label="Problem description"
        error={errors.problemDescription}
        className="sm:col-span-2"
      >
        <textarea
          id="problemDescription"
          name="problemDescription"
          rows={3}
          maxLength={2_000}
          className="field"
          placeholder="What issue did the customer report?"
        />
      </FormField>
      <FormField id="serviceType" label="Service type">
        <select id="serviceType" name="serviceType" className="field">
          {services.map((service) => (
            <option key={service}>{service}</option>
          ))}
        </select>
      </FormField>
      <TextField
        id="quotedPrice"
        label="Quoted price (RM)"
        error={errors.quotedPrice}
        type="number"
        min="0"
        step="0.01"
        defaultValue="0"
      />
      <FormField id="technicianId" label="Assigned technician" hint="Optional">
        <select id="technicianId" name="technicianId" className="field">
          <option value="">Leave unassigned</option>
          {users
            .filter((user) => user.role === "technician")
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {user.branch}
              </option>
            ))}
        </select>
      </FormField>
      <TextField
        id="scheduledAt"
        label="Scheduled time"
        error={errors.scheduledAt}
        type="datetime-local"
      />
      <FormField
        id="adminNotes"
        label="Admin notes"
        hint="Optional"
        className="sm:col-span-2"
      >
        <textarea
          id="adminNotes"
          name="adminNotes"
          rows={2}
          maxLength={1_000}
          className="field"
        />
      </FormField>
    </div>
  );
}

function TextField({
  id,
  label,
  error,
  ...props
}: {
  id: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormField id={id} label={label} error={error}>
      <input
        id={id}
        name={id}
        className="field"
        aria-describedby={error ? `${id}-description` : undefined}
        aria-invalid={!!error}
        {...props}
      />
    </FormField>
  );
}
