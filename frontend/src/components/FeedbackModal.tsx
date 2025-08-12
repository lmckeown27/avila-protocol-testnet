import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import analyticsService from '../services/analytics';

interface FeedbackData {
  type: 'bug' | 'feature' | 'general' | 'ui' | 'performance';
  title: string;
  description: string;
  email?: string;
  priority: 'low' | 'medium' | 'high';
}

export default function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [feedback, setFeedback] = useState<FeedbackData>({
    type: 'general',
    title: '',
    description: '',
    email: '',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addNotification } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Track feedback submission with analytics
      analyticsService.trackFeedback(feedback.type, feedback.priority);
      
      // For now, we'll just show a success message
      // In production, you'd send this to your backend or feedback service
      console.log('Feedback submitted:', feedback);
      
      addNotification({
        type: 'success',
        title: 'Feedback Submitted!',
        message: 'Thank you for your input. We\'ll review it and get back to you soon.'
      });

      // Reset form and close modal
      setFeedback({
        type: 'general',
        title: '',
        description: '',
        email: '',
        priority: 'medium'
      });
      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Submission Failed',
        message: 'Failed to submit feedback. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Send Feedback</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label">
              Feedback Type
            </label>
            <select
              value={feedback.type}
              onChange={(e) => setFeedback({ ...feedback, type: e.target.value as any })}
              className="form-select"
            >
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="general">General Feedback</option>
              <option value="ui">UI/UX Suggestion</option>
              <option value="performance">Performance Issue</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Title *
            </label>
            <input
              type="text"
              required
              value={feedback.title}
              onChange={(e) => setFeedback({ ...feedback, title: e.target.value })}
              placeholder="Brief description of your feedback"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Description *
            </label>
            <textarea
              required
              rows={4}
              value={feedback.description}
              onChange={(e) => setFeedback({ ...feedback, description: e.target.value })}
              placeholder="Please provide detailed information..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Priority
            </label>
            <select
              value={feedback.priority}
              onChange={(e) => setFeedback({ ...feedback, priority: e.target.value as any })}
              className="form-select"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Email (Optional)
            </label>
            <input
              type="email"
              value={feedback.email}
              onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
              placeholder="your@email.com"
              className="form-input"
            />
            <p className="text-xs text-gray-500 mt-1">
              We'll only use this to follow up on your feedback
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1 px-4 py-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 