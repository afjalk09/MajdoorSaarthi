import { toast } from 'sonner';

export const showSuccess = (message) => {
  toast.success(message, { duration: 3500 });
};

export const showError = (message) => {
  toast.error(message, { duration: 5000 });
};

export const showInfo = (message) => {
  toast(message, { duration: 3500 });
};
