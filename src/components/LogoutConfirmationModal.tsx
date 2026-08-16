import React from 'react';
import ConfirmationModal from './ConfirmationModal';
import useTranslation from '../hooks/useTranslation';

interface LogoutConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Logout confirm — ConfirmDialog via i18n ConfirmationModal wrapper. */
const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const {t} = useTranslation();

  return (
    <ConfirmationModal
      visible={visible}
      title={String(t('common.logoutTitle') || 'Log out')}
      message={`${String(t('common.logoutMessage') || 'Are you sure you want to log out?')}\n\n${String(
        t('common.logoutSubMessage') || '',
      )}`.trim()}
      confirmText={String(t('common.logout') || 'Log out')}
      cancelText={String(t('common.cancel') || 'Cancel')}
      type="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
};

export default LogoutConfirmationModal;
