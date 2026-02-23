import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { postService } from '../services/postService';
import PostCard from '../components/PostCard';
import { SkeletonCard } from '../components/SkeletonLoader';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    postService.getAll()
      .then(({ data }) => setPosts(data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim() && !image) return;
    setPosting(true);

    try {
      const formData = new FormData();
      formData.append('body', body);
      if (image) formData.append('image', image);

      const { data } = await postService.create(formData);
      setPosts((prev) => [{ ...data.post, is_liked: false }, ...prev]);
      setBody('');
      removeImage();
      toast.success('Post published!');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((m) => toast.error(m));
      else toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = (id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdate = (id, updates) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Community Feed</h1>
        <p className="text-surface-500 mt-1">Share updates with the community</p>
      </div>

      {/* Create post */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border p-5"
      >
        <div className="flex gap-3">
          <UserAvatar user={user} size="lg" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="flex-1 resize-none px-3 py-2 rounded-xl border border-surface-200 dark:border-dark-border bg-surface-50 dark:bg-dark-bg text-surface-900 dark:text-surface-100 placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        {imagePreview && (
          <div className="relative mt-3 ml-13">
            <img src={imagePreview} alt="Preview" className="rounded-lg max-h-60 object-cover" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 ml-13">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-surface-500 hover:bg-surface-100 dark:hover:bg-dark-hover transition-colors"
          >
            <PhotoIcon className="h-5 w-5 text-emerald-500" />
            Photo
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          <button
            type="submit"
            disabled={posting || (!body.trim() && !image)}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </motion.form>

      {/* Feed */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
          {posts.length === 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-surface-200 dark:border-dark-border py-16 text-center">
              <p className="text-surface-400 text-lg">No posts yet</p>
              <p className="text-surface-400 text-sm mt-1">Be the first to share something!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
