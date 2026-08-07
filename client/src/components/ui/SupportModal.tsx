import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supportApi } from '../../services/api';
import { Modal } from './Modal';
import { Loader2 } from 'lucide-react';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  defaultSubject?: string;
  defaultMessage?: string;
  context?: string;
}

export function SupportModal({ open, onClose, defaultSubject, defaultMessage, context }: SupportModalProps) {
  const [subject, setSubject] = useState(defaultSubject ?? '');
  const [message, setMessage] = useState(defaultMessage ?? '');

  const mutation = useMutation({
    mutationFn: (data: { message: string; subject?: string; pageUrl?: string }) =>
      supportApi.contact(data),
    onSuccess: () => {
      toast.success('Message sent to the admin');
      setSubject('');
      setMessage('');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send message'),
  });

  const submit = () => {
    if (!message.trim()) return;
    const location = context || window.location.href;
    mutation.mutate({
      message: `${message.trim()}\n\nLocation: ${location}`,
      subject: subject.trim() || undefined,
      pageUrl: window.location.href,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Contact support" size="md">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-dark-400">
            Subject <span className="normal-case text-dark-600">(optional)</span>
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. I can't verify my account"
            maxLength={200}
            className="w-full rounded-lg border border-dark-600 bg-dark-800 px-3.5 py-2.5 text-sm text-dark-100 placeholder:text-dark-500 focus:border-primary-500/60 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-dark-400">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Describe your issue..."
            className="w-full resize-none rounded-lg border border-dark-600 bg-dark-800 px-3.5 py-2.5 text-sm text-dark-100 placeholder:text-dark-500 focus:border-primary-500/60 focus:outline-none"
          />
          <p className="mt-1 text-right text-[11px] text-dark-500">{message.trim().length}/2000</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-ghost" disabled={mutation.isPending}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!message.trim() || mutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-primary-500 disabled:opacity-40"
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send message
          </button>
        </div>
      </div>
    </Modal>
  );
}
