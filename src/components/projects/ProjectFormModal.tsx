import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Modal } from '../Modal';
import { ErrorBanner } from '../auth/ErrorBanner';
import { FormField } from '../auth/FormField';
import { TextAreaField } from '../auth/TextAreaField';
import { projectsApi } from '../../api/projects.api';
import { ApiError } from '../../types/api';
import { DESIGN_STANDARDS, type Project } from '../../types/project';
import { projectSchema, type ProjectFormValues } from '../../schemas/project.schema';

interface ProjectFormModalProps {
  /** Present → edit mode; absent → create mode. */
  project?: Project;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectFormModal({ project, onClose, onSaved }: ProjectFormModalProps) {
  const isEdit = !!project;
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: isEdit
      ? {
          name: project.name,
          description: project.description ?? '',
          substationName: project.substationName,
          voltageLevel: project.voltageLevel,
          standard: project.standard,
        }
      : {
          name: '',
          description: '',
          substationName: '',
          voltageLevel: '',
          standard: DESIGN_STANDARDS[0],
        },
  });

  const onSubmit = async (values: ProjectFormValues) => {
    setApiErrors([]);
    try {
      if (isEdit) {
        await projectsApi.update(project.id, { id: project.id, ...values });
      } else {
        await projectsApi.create(values);
      }
      onSaved();
    } catch (err) {
      setApiErrors(err instanceof ApiError ? err.messages : ['ذخیرهٔ پروژه ناموفق بود.']);
    }
  };

  return (
    <Modal title={isEdit ? 'ویرایش پروژه' : 'پروژهٔ جدید'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <ErrorBanner messages={apiErrors} />

        <FormField
          id="name"
          label="نام پروژه"
          autoFocus
          error={errors.name?.message}
          {...register('name')}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="substationName"
            label="نام پست"
            error={errors.substationName?.message}
            {...register('substationName')}
          />
          <FormField
            id="voltageLevel"
            label="سطح ولتاژ"
            placeholder="مثلاً 230kV"
            error={errors.voltageLevel?.message}
            {...register('voltageLevel')}
          />
        </div>

        <FormField
          id="standard"
          label="استاندارد طراحی"
          list="standard-options"
          placeholder="مثلاً IEEE 80-2000"
          error={errors.standard?.message}
          {...register('standard')}
        />
        <datalist id="standard-options">
          {DESIGN_STANDARDS.map((standard) => (
            <option key={standard} value={standard} />
          ))}
        </datalist>

        <TextAreaField
          id="description"
          label="توضیحات (اختیاری)"
          error={errors.description?.message}
          {...register('description')}
        />

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