import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userApi } from '../../services/api';
import { Avatar } from './Avatar';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

export function AvatarUploader({ size = 'xl', className }: { size?: 'lg' | 'xl'; className?: string }) {
  const { user, setUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Please choose a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Image must be under 10MB');
      return;
    }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await userApi.updateAvatar(base64);
      setUser(res.data.data);
      toast.success('Profile photo updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  return (
    <div className={`relative ${className || ''}`}>
      <Avatar src={user.avatar} name={user.username} size={size} ring />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Change profile photo"
        className="absolute -bottom-1 -right-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-dark-800 text-white shadow-lg transition-colors hover:bg-primary-600 disabled:opacity-50"
      >
        <Camera className="h-4 w-4" />
      </button>
      {uploading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-full bg-black/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
