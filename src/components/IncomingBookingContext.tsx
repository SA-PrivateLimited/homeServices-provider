/**
 * Shared incoming booking state for Home NEW JOB card + modal host.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useStore} from '../store';
import {getUserId} from '../services/session';
import websocketService from '../services/websocketService';
import {getMyProfile} from '../services/api/providersApi';
import {serviceRequestsApi} from '../services/api/serviceRequestsApi';
import {createJobCard} from '../services/jobCardService';
import BookingAlertModal from './BookingAlertModal';
import AlertModal from './AlertModal';
import Toast from './Toast';
import useTranslation from '../hooks/useTranslation';
import {speakNewJobReceived} from '../services/voicePromptService';

export const ACCEPT_TIMEOUT_SEC = 40;

function bookingIdOf(data: any): string {
  if (!data) return '';
  return String(
    data.serviceRequestId ||
      data.consultationId ||
      data.id ||
      data.bookingId ||
      data._id ||
      '',
  );
}

function toBookingShape(latest: any) {
  const id = bookingIdOf(latest);
  return {
    consultationId: id,
    id,
    bookingId: id,
    serviceRequestId: id,
    customerId: latest.customerId,
    customerName: latest.customerName,
    patientName: latest.customerName,
    customerPhone: latest.customerPhone,
    patientPhone: latest.customerPhone,
    customerAddress: latest.customerAddress,
    patientAddress: latest.customerAddress,
    serviceType: latest.serviceType,
    problem: latest.problem,
    questionnaireAnswers: latest.questionnaireAnswers,
    consultationFee: latest.consultationFee ?? latest.serviceFee,
    serviceFee: latest.serviceFee ?? latest.consultationFee,
    providerId: latest.providerId,
    isTargeted: !!latest.providerId,
    status: latest.status,
    createdAt: latest.createdAt,
  };
}

type IncomingBookingContextValue = {
  incomingBooking: any | null;
  secondsLeft: number;
  loading: boolean;
  acceptBooking: () => Promise<void>;
  rejectBooking: () => Promise<void>;
  dismissBooking: () => void;
  /** When true, modal is hidden (Home shows inline card). */
  setPreferInlineCard: (prefer: boolean) => void;
};

const IncomingBookingContext = createContext<IncomingBookingContextValue | null>(
  null,
);

export function useIncomingBooking(): IncomingBookingContextValue {
  const ctx = useContext(IncomingBookingContext);
  if (!ctx) {
    return {
      incomingBooking: null,
      secondsLeft: ACCEPT_TIMEOUT_SEC,
      loading: false,
      acceptBooking: async () => {},
      rejectBooking: async () => {},
      dismissBooking: () => {},
      setPreferInlineCard: () => {},
    };
  }
  return ctx;
}

export function IncomingBookingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {currentUser} = useStore();
  const userId = getUserId(currentUser);
  const {t} = useTranslation();

  const [incomingBooking, setIncomingBooking] = useState<any>(null);
  const [secondsLeft, setSecondsLeft] = useState(ACCEPT_TIMEOUT_SEC);
  const [loading, setLoading] = useState(false);
  const [preferInlineCard, setPreferInlineCard] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({title: '', message: '', type: 'info'});

  const handledIdsRef = useRef<Set<string>>(new Set());
  const acceptingRef = useRef(false);
  const timeoutFiredRef = useRef(false);

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    setAlertConfig({title, message, type});
    setAlertVisible(true);
  };

  const presentBooking = useCallback((bookingData: any) => {
    if (!bookingData) return;
    const id = bookingIdOf(bookingData);
    if (!id) return;
    if (handledIdsRef.current.has(id)) return;

    setIncomingBooking((prev: any) => {
      if (prev) return prev;
      handledIdsRef.current.add(id);
      timeoutFiredRef.current = false;
      setSecondsLeft(ACCEPT_TIMEOUT_SEC);
      void speakNewJobReceived();
      return bookingData;
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = websocketService.onNewBooking(bookingData => {
      presentBooking(bookingData);
    });
    websocketService.connect(userId);
    return () => {
      unsubscribe();
    };
  }, [userId, presentBooking]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const profile = await getMyProfile();
        if (!profile?.isOnline || cancelled) return;

        const pending = await serviceRequestsApi.getMyPending();
        if (cancelled) return;
        const nextPending = pending.find(
          item => !handledIdsRef.current.has(bookingIdOf(item)),
        );
        if (nextPending) {
          presentBooking(toBookingShape(nextPending));
          return;
        }

        const nearby = await serviceRequestsApi.getNearbyPending();
        if (cancelled) return;
        const nextNearby = (nearby || []).find(
          item => !handledIdsRef.current.has(bookingIdOf(item)),
        );
        if (nextNearby) {
          presentBooking(toBookingShape(nextNearby));
        }
      } catch (e) {
        console.warn('[BOOKING] poll failed', e);
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, presentBooking]);

  const handleAcceptBooking = useCallback(async () => {
    if (!incomingBooking || !userId || acceptingRef.current) return;
    acceptingRef.current = true;
    const bookingData = incomingBooking;
    const id = bookingIdOf(bookingData);
    if (id) handledIdsRef.current.add(id);

    websocketService.stopSound();
    setIncomingBooking(null);

    try {
      setLoading(true);
      const provider = await getMyProfile();
      if (
        !provider ||
        !(provider as any).address ||
        !(provider as any).address.pincode
      ) {
        showAlert(
          String(t('common.error')),
          String(t('dashboard.addressRequired')),
          'error',
        );
        return;
      }

      await websocketService.acceptBooking(
        bookingData,
        provider._id || provider.id || userId,
        provider,
      );
      await createJobCard(bookingData, (provider as any).address);
      setToastMessage(String(t('dashboard.requestAccepted')));
      setShowToast(true);
    } catch (error: any) {
      showAlert(
        String(t('common.error')),
        error.message || String(t('dashboard.acceptRequestError')),
        'error',
      );
    } finally {
      setLoading(false);
      acceptingRef.current = false;
    }
  }, [incomingBooking, userId, t]);

  const handleRejectBooking = useCallback(async () => {
    if (!incomingBooking || acceptingRef.current) return;
    const bookingData = incomingBooking;
    const id = bookingIdOf(bookingData);
    if (id) handledIdsRef.current.add(id);

    websocketService.stopSound();
    setIncomingBooking(null);
    try {
      setLoading(true);
      await websocketService.rejectBooking(bookingData);
      setToastMessage(String(t('dashboard.requestRejected')));
      setShowToast(true);
    } catch (error: any) {
      showAlert(
        String(t('common.error')),
        error.message || String(t('dashboard.rejectRequestError')),
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [incomingBooking, t]);

  const handleDismissBooking = useCallback(() => {
    const id = bookingIdOf(incomingBooking);
    if (id) handledIdsRef.current.add(id);
    websocketService.stopSound();
    setIncomingBooking(null);
  }, [incomingBooking]);

  const incomingRef = useRef<any>(null);
  incomingRef.current = incomingBooking;

  // Countdown + auto dismiss/decline
  useEffect(() => {
    if (!incomingBooking) {
      setSecondsLeft(ACCEPT_TIMEOUT_SEC);
      return;
    }
    setSecondsLeft(ACCEPT_TIMEOUT_SEC);
    timeoutFiredRef.current = false;
    const started = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(
        0,
        ACCEPT_TIMEOUT_SEC - Math.floor((Date.now() - started) / 1000),
      );
      setSecondsLeft(left);
      if (left <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;
        clearInterval(tick);
        const booking = incomingRef.current;
        if (!booking) return;
        const id = bookingIdOf(booking);
        if (id) handledIdsRef.current.add(id);
        websocketService.stopSound();
        setIncomingBooking(null);
        void websocketService.rejectBooking(booking).catch(() => {});
      }
    }, 250);
    return () => clearInterval(tick);
  }, [incomingBooking]);

  const value = useMemo(
    () => ({
      incomingBooking,
      secondsLeft,
      loading,
      acceptBooking: handleAcceptBooking,
      rejectBooking: handleRejectBooking,
      dismissBooking: handleDismissBooking,
      setPreferInlineCard,
    }),
    [
      incomingBooking,
      secondsLeft,
      loading,
      handleAcceptBooking,
      handleRejectBooking,
      handleDismissBooking,
    ],
  );

  const showModal = !!incomingBooking && !preferInlineCard;

  return (
    <IncomingBookingContext.Provider value={value}>
      {children}

      {loading ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 100,
          }}>
          <ActivityIndicator color="#34C759" />
        </View>
      ) : null}

      {showModal ? (
        <BookingAlertModal
          key={bookingIdOf(incomingBooking) || 'booking-modal'}
          visible
          bookingData={incomingBooking}
          secondsLeft={secondsLeft}
          onAccept={handleAcceptBooking}
          onReject={handleRejectBooking}
          onDismiss={handleDismissBooking}
        />
      ) : null}

      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertVisible(false)}
      />

      <Toast
        visible={showToast}
        message={toastMessage}
        onHide={() => setShowToast(false)}
      />
    </IncomingBookingContext.Provider>
  );
}

/** @deprecated use IncomingBookingProvider */
export default function ProviderIncomingBookingHost() {
  return null;
}
