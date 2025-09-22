import toast from 'react-hot-toast';

export const useToaster = () => {
  const showSuccessToast = (message: string) => {
    toast.success(message);
  };

  const showErrorToast = (message: string) => {
    toast.error(message);
  };

  return { showSuccessToast, showErrorToast };
};
