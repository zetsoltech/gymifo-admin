import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createUser,
  listUsers,
  updateUser,
} from '../api.ts';

const usersKey = (params) => ['users', params];

/** Admin user list. */
export function useUsersQuery(params) {
  return useQuery({
    queryKey: usersKey(params),
    queryFn: () => listUsers(params),
    placeholderData: (previous) => previous,
  });
}

const saveToastId = 'save-user';

/** Create a new admin user, then refresh the list. */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createUser(payload),
    onMutate: () => {
      toast.loading('Creating admin user…', { id: saveToastId, duration: Infinity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Admin user created.', { id: saveToastId, duration: 4000 });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to create admin user.', {
        id: saveToastId,
        duration: 6000,
      });
    },
  });
}

const updateToastId = 'update-user';

/** Update an admin user (name, and — for super-admin — password/role). */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateUser(id, payload),
    onMutate: () => {
      toast.loading('Saving changes…', { id: updateToastId, duration: Infinity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Admin user updated.', { id: updateToastId, duration: 4000 });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to update admin user.', {
        id: updateToastId,
        duration: 6000,
      });
    },
  });
}
