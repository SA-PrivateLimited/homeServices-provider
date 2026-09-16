/**
 * Reviews List Component
 * Displays reviews for a provider
 * Reviews are read-only for providers
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {getProviderReviews, Review} from '../services/reviewService';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';
import useTranslation from '../hooks/useTranslation';

interface ReviewsListProps {
  providerId: string;
  showHeader?: boolean;
}

export default function ReviewsList({
  providerId,
  showHeader = true,
}: ReviewsListProps) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [providerId]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const providerReviews = await getProviderReviews(providerId);
      setReviews(providerReviews);
    } catch (error: any) {
      console.error('Error loading reviews:', error);
      if (error.message?.includes('index')) {
        console.warn(
          'Missing Firestore index. Please create index for reviews: providerId + createdAt',
        );
      }
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Icon
            key={star}
            name={star <= rating ? 'star' : 'star-border'}
            size={16}
            color={star <= rating ? '#FFD700' : '#CCCCCC'}
          />
        ))}
      </View>
    );
  };

  const formatDate = (date: string | Date) => {
    const now = new Date();
    const parsed = date instanceof Date ? date : new Date(date);
    const diffTime = Math.abs(now.getTime() - parsed.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return String(t('profile.reviewDateToday') || 'Today');
    }
    if (diffDays === 1) {
      return String(t('profile.reviewDateYesterday') || 'Yesterday');
    }
    if (diffDays < 7) {
      return String(
        t('profile.reviewDateDaysAgo', {count: diffDays}) || `${diffDays} days ago`,
      );
    }
    return parsed.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
          {String(t('profile.reviewsLoading'))}
        </Text>
      </View>
    );
  }

  if (reviews.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="rate-review" size={48} color={theme.textSecondary} />
        <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
          {String(t('profile.reviewsEmpty'))}
        </Text>
      </View>
    );
  }

  const averageRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  ).toFixed(1);

  return (
    <View style={styles.container}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={[styles.headerTitle, {color: theme.text}]}>
            {String(
              t('profile.reviewCount', {count: reviews.length}) ||
                `Reviews (${reviews.length})`,
            )}
          </Text>
          <View style={styles.averageRating}>
            <Icon name="star" size={20} color="#FFD700" />
            <Text style={[styles.averageRatingText, {color: theme.text}]}>
              {averageRating}
            </Text>
          </View>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        {reviews.map(review => (
          <View
            key={review.id}
            style={[
              styles.reviewCard,
              {backgroundColor: theme.card, borderColor: theme.border},
            ]}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewHeaderLeft}>
                <View
                  style={[
                    styles.customerAvatar,
                    {backgroundColor: theme.primary},
                  ]}>
                  <Text style={styles.customerInitial}>
                    {review.customerName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.customerName, {color: theme.text}]}>
                    {review.customerName}
                  </Text>
                  <Text style={[styles.serviceType, {color: theme.textSecondary}]}>
                    {review.serviceType}
                  </Text>
                </View>
              </View>
              <View style={styles.reviewHeaderRight}>
                {renderStars(review.rating)}
                <Text style={[styles.reviewDate, {color: theme.textSecondary}]}>
                  {formatDate(review.createdAt)}
                </Text>
              </View>
            </View>

            {review.comment ? (
              <Text style={[styles.reviewComment, {color: theme.text}]}>
                {review.comment}
              </Text>
            ) : null}

            {review.photos && review.photos.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.photosContainer}>
                {review.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{uri: photo}}
                    style={styles.reviewPhoto}
                  />
                ))}
              </ScrollView>
            ) : null}

            <View
              style={[styles.readOnlyNotice, {borderTopColor: theme.border}]}>
              <Icon name="lock" size={12} color={theme.textSecondary} />
              <Text style={[styles.readOnlyText, {color: theme.textSecondary}]}>
                {String(t('profile.reviewReadOnly'))}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  averageRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  averageRatingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  reviewCard: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  serviceType: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewHeaderRight: {
    alignItems: 'flex-end',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  photosContainer: {
    marginBottom: 12,
  },
  reviewPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readOnlyText: {
    fontSize: 11,
  },
});
