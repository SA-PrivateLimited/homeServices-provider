import React from 'react';
import {
  ConfirmDialog,
  type ConfirmationModalProps,
} from 'sapvt-ltd-app-packages';
import useTranslation from '../hooks/useTranslation';

/** i18n wrapper over package ConfirmDialog. */
const ConfirmationModal: React.FC<ConfirmationModalProps> = props => {
  const {t} = useTranslation();
  return (
    <ConfirmDialog
      {...props}
      confirmText={
        props.confirmText || String(t('common.confirm') || 'Confirm')
      }
      cancelText={props.cancelText || String(t('common.cancel') || 'Cancel')}
    />
  );
};

export default ConfirmationModal;
