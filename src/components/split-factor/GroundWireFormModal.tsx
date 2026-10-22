import { useState } from 'react';

import { Modal } from '../Modal';
import { ErrorBanner } from '../auth/ErrorBanner';
import { FormField } from '../auth/FormField';
import { groundWiresApi } from '../../api/split-factor.api';
import { ApiError } from '../../types/api';
import type { GroundWire } from '../../types/split-factor';

interface GroundWireFormModalProps {
  /** Present → edit mode; absent → create mode. */
  wire?: GroundWire;
  onClose: () => void;
  onSaved: () => void;
}

const asText = (value: number | undefined, fallback = '') =>
  value === undefined ? fallback : String(value);

export function GroundWireFormModal({ wire, onClose, onSaved }: GroundWireFormModalProps) {
  const isEdit = !!wire;
  const [name, setName] = useState(wire?.name ?? '');
  const [acResistance, setAcResistance] = useState(asText(wire?.acResistance));
  const [dcResistance, setDcResistance] = useState(asText(wire?.dcResistance));
  const [gmr, setGmr] = useState(asText(wire?.gmr));
  const [reactance, setReactance] = useState(asText(wire?.reactance, '0'));
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const values = {
      name: name.trim(),
      acResistance: Number(acResistance),
      dcResistance: Number(dcResistance),
      gmr: Number(gmr),
      reactance: Number(reactance === '' ? '0' : reactance),
    };

    const problems: string[] = [];
    if (!values.name) problems.push('نام سیم گارد الزامیست.');
    if (!(values.acResistance > 0)) problems.push('مقاومت AC باید بزرگ‌تر از صفر باشد.');
    if (!(values.dcResistance > 0)) problems.push('مقاومت DC باید بزرگ‌تر از صفر باشد.');
    if (!(values.gmr > 0)) problems.push('GMR باید بزرگ‌تر از صفر باشد.');
    if (!(values.reactance >= 0)) problems.push('راکتانس نمی‌تواند منفی باشد.');
    if (problems.length > 0) {
      setErrors(problems);
      return;
    }

    setErrors([]);
    setIsSubmitting(true);
    try {
      if (wire) {
        await groundWiresApi.update(wire.id, values);
      } else {
        await groundWiresApi.create(values);
      }
      onSaved();
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['ذخیرهٔ سیم گارد ناموفق بود.']);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title={isEdit ? 'ویرایش سیم گارد' : 'سیم گارد جدید'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <ErrorBanner messages={errors} />

        <FormField
          id="wireName"
          label="نام"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="wireAc"
            label="مقاومت AC (Ω/km)"
            type="number"
            step="any"
            dir="ltr"
            value={acResistance}
            onChange={(e) => setAcResistance(e.target.value)}
          />
          <FormField
            id="wireDc"
            label="مقاومت DC (Ω/km)"
            type="number"
            step="any"
            dir="ltr"
            value={dcResistance}
            onChange={(e) => setDcResistance(e.target.value)}
          />
          <FormField
            id="wireGmr"
            label="GMR (m)"
            type="number"
            step="any"
            dir="ltr"
            value={gmr}
            onChange={(e) => setGmr(e.target.value)}
          />
          <FormField
            id="wireReactance"
            label="راکتانس داخلی (Ω/km)"
            type="number"
            step="any"
            dir="ltr"
            value={reactance}
            onChange={(e) => setReactance(e.target.value)}
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-text-faint disabled:cursor-not-allowed disabled:opacity-60"
          >
            انصراف
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-copper px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-copper-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
