import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star, ThumbsUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface RatingsAndReviewsProps {
  fxnId: string;
}

export function RatingsAndReviews({ fxnId }: RatingsAndReviewsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  // Fetch rating stats
  const { data: ratingData, isLoading: loadingRatings, error: ratingsError } = useQuery({
    queryKey: ['/api/discovery/ratings', fxnId],
    queryFn: async () => {
      const res = await fetch(`/api/discovery/ratings/${fxnId}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!res.ok) throw new Error('Failed to load ratings');
      return res.json();
    }
  });

  // Fetch reviews
  const { data: reviews, isLoading: loadingReviews, error: reviewsError } = useQuery({
    queryKey: ['/api/discovery/reviews', fxnId],
    queryFn: async () => {
      const res = await fetch(`/api/discovery/reviews/${fxnId}`, {
        credentials: 'include',
        headers: { 'X-Requested-With': 'fetch' }
      });
      if (!res.ok) throw new Error('Failed to load reviews');
      return res.json();
    }
  });

  // Submit rating
  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await fetch('/api/discovery/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({ fxnId, rating })
      });
      if (!res.ok) throw new Error('Failed to submit rating');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discovery/ratings', fxnId] });
      toast({ title: 'Rating submitted', description: 'Thank you for rating this tool!' });
    },
    onError: () => {
      toast({
        title: 'Failed to submit rating',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  // Submit review
  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/discovery/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify({
          fxnId,
          title: reviewTitle,
          content: reviewContent
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit review');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discovery/reviews', fxnId] });
      setShowReviewDialog(false);
      setReviewTitle('');
      setReviewContent('');
      toast({
        title: 'Review submitted',
        description: 'Your review will be visible after moderation'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to submit review',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Toggle helpful vote
  const helpfulMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await fetch(`/api/discovery/reviews/${reviewId}/helpful`, {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discovery/reviews', fxnId] });
    }
  });

  const handleRatingClick = (rating: number) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to rate this tool' });
      return;
    }
    setSelectedRating(rating);
    ratingMutation.mutate(rating);
  };

  const handleReviewSubmit = () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to write a review' });
      return;
    }
    if (!ratingData?.userRating) {
      toast({
        title: 'Rating required',
        description: 'Please rate this tool before writing a review',
        variant: 'destructive'
      });
      return;
    }
    if (!reviewTitle.trim() || !reviewContent.trim()) {
      toast({
        title: 'All fields required',
        description: 'Please fill in both title and content',
        variant: 'destructive'
      });
      return;
    }
    reviewMutation.mutate();
  };

  const avgRating = Number(ratingData?.avgRating) || 0;
  const ratingCount = Number(ratingData?.ratingCount) || 0;
  const distribution = ratingData?.distribution || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  const userRating = Number(ratingData?.userRating?.rating) || 0;

  // Loading state
  if (loadingRatings || loadingReviews) {
    return (
      <section className="mt-10 space-y-6">
        <h2 className="text-2xl font-bold">Ratings & Reviews</h2>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Error state
  if (ratingsError || reviewsError) {
    return (
      <section className="mt-10 space-y-6">
        <h2 className="text-2xl font-bold">Ratings & Reviews</h2>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Unable to load ratings and reviews. Please try again later.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mt-10 space-y-6">
      <h2 className="text-2xl font-bold">Ratings & Reviews</h2>

      {/* Rating Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center md:text-left">
              <div className="text-5xl font-bold mb-2">{avgRating.toFixed(1)}</div>
              <div className="flex items-center justify-center md:justify-start mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= Math.round(avgRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600">{ratingCount} ratings</p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = Number(distribution[star.toString()]) || 0;
                const percentage = ratingCount > 0 ? (count / ratingCount) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2">
                    <span className="text-sm w-12">{star} star</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Rating */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 mb-3">
              {userRating > 0 ? 'Your rating:' : 'Rate this tool:'}
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoverRating || userRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Write Review Button */}
      {user && userRating > 0 && (
        <Button onClick={() => setShowReviewDialog(true)} className="w-full md:w-auto">
          Write a Review
        </Button>
      )}

      {/* Reviews List */}
      {reviews && reviews.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Reviews</h3>
          {reviews.map((review: any) => (
            <Card key={review.review.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{review.user.name || 'Anonymous'}</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= review.rating.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <h4 className="font-medium mb-2">{review.review.title}</h4>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(review.review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{review.review.content}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => helpfulMutation.mutate(review.review.id)}
                  disabled={!user}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Helpful ({review.review.helpfulCount})
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="review-title">Title</Label>
              <Input
                id="review-title"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Summarize your experience"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="review-content">Review</Label>
              <Textarea
                id="review-content"
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="Share your thoughts about this tool..."
                maxLength={2000}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleReviewSubmit} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
