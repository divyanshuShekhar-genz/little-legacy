import { useLayoutEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { PERMISSION_SECTIONS, type PermissionSection } from '@/constants/permissions';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CheckboxField, FormGrid, TextField } from '@/components/ui/Field';
import { PERMISSION_LABELS } from '@/constants/navigation';
import { errorMessage } from '@/api/client';
import { useSaveAdmin, type TeamMember } from '@/api/admins';
import { useAuth } from '@/hooks/useAuth';

const schema = (creating: boolean) =>
  z.object({
    name: z.string().trim().min(1, 'Enter an admin name.'),
    email: z.string().trim().email('Enter a valid email.'),
    password: creating ? z.string().min(8, 'Use at least 8 characters.') : z.string().optional(),
    permissions: z.array(z.enum(PERMISSION_SECTIONS)),
    directPublish: z.boolean(),
    active: z.boolean(),
  });
type FormValues = z.infer<ReturnType<typeof schema>>;

export function AdminFormModal({ open, admin, onClose }: { open: boolean; admin: TeamMember | null; onClose: () => void }) {
  const creating = !admin;
  const { admin: me, isSuperAdmin } = useAuth();
  // A Super Admin can't deactivate their own account (they would lock themselves out).
  const own = Boolean(admin && me && admin.id === me.id);
  const save = useSaveAdmin();
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({ resolver: zodResolver(schema(creating)) });

  useLayoutEffect(() => {
    if (open) {
      reset({
        name: admin?.name ?? '',
        email: admin?.email ?? '',
        password: '',
        permissions: admin?.permissions ?? [],
        directPublish: admin?.directPublish ?? false,
        active: admin?.active ?? true,
      });
    }
  }, [open, admin, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const { password, active, ...rest } = values;
      await save.mutateAsync({
        id: admin?.id,
        input: creating ? { ...rest, password } : { ...rest, ...(isSuperAdmin && !own ? { active } : {}) },
      });
      toast.success(creating ? 'Sub Admin created' : 'Permissions saved');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? 'Add Sub Admin' : `Edit ${admin.name}`}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={onSubmit} disabled={formState.isSubmitting}>
            Approve
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit}>
        <FormGrid>
          <TextField label="Full name" error={formState.errors.name?.message} {...register('name')} />
          <TextField label="Email" type="email" error={formState.errors.email?.message} {...register('email')} />
          {creating && (
            <TextField
              label="Temporary password"
              type="password"
              autoComplete="new-password"
              error={formState.errors.password?.message}
              {...register('password')}
            />
          )}
        </FormGrid>

        {!creating && isSuperAdmin && (
          <div className="mt-5">
            <CheckboxField label="Active" disabled={own} {...register('active')} />
            <p className="mt-2 text-[12px] text-muted">
              {own
                ? 'You can’t deactivate your own account.'
                : 'An inactive account can’t sign in, and any open session stops working. Its history stays in the audit log.'}
            </p>
          </div>
        )}

        <div className="mt-5">
          <CheckboxField label="Allow direct publishing without Super Admin review" {...register('directPublish')} />
          <p className="mt-2 text-[12px] text-muted">
            When off, changes are saved to Draft approvals. Only Super Admin can publish them.
          </p>
        </div>

        <h3>Section permissions</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PERMISSION_SECTIONS.map((key: PermissionSection) => (
            <CheckboxField key={key} label={PERMISSION_LABELS[key] ?? key} value={key} {...register('permissions')} />
          ))}
        </div>
        <p className="mt-3 text-[12px] text-muted">Only checked sections will appear for this account.</p>
      </form>
    </Modal>
  );
}
