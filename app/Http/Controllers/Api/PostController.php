<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePostRequest;
use App\Models\Notification;
use App\Models\Post;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $posts = Post::with(['user.member', 'comments.user.member', 'comments.likes', 'likes'])
            ->withCount(['comments', 'likes'])
            ->latest()
            ->paginate($request->get('per_page', 15));

        $posts->getCollection()->transform(function ($post) use ($request) {
            $post->is_liked = $post->isLikedBy($request->user());
            $post->comments->each(function ($comment) use ($request) {
                $comment->is_liked = $comment->isLikedBy($request->user());
                $comment->likes_count = $comment->likes->count();
            });
            return $post;
        });

        return response()->json($posts);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $data = [
            'user_id' => $request->user()->id,
            'body' => $request->body,
        ];

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('posts', 'public');
        }

        $post = Post::create($data);

        $this->notifyFollowers($request->user(), $post);

        $post->load(['user.member', 'comments.user.member', 'comments.likes', 'likes'])->loadCount(['comments', 'likes']);
        $post->comments->each(function ($comment) use ($request) {
            $comment->is_liked = $comment->isLikedBy($request->user());
            $comment->likes_count = $comment->likes->count();
        });

        return response()->json(['post' => $post], 201);
    }

    public function show(Post $post): JsonResponse
    {
        $post->load(['user.member', 'comments.user.member', 'comments.likes', 'likes'])->loadCount(['comments', 'likes']);
        $post->is_liked = $post->isLikedBy(request()->user());
        $post->comments->each(function ($comment) {
            $comment->is_liked = $comment->isLikedBy(request()->user());
            $comment->likes_count = $comment->likes->count();
        });

        return response()->json(['post' => $post]);
    }

    public function destroy(Post $post, Request $request): JsonResponse
    {
        if ($post->user_id !== $request->user()->id && !$request->user()->hasAnyRole(['Admin', 'Super Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $post->delete();

        return response()->json(['message' => 'Post deleted']);
    }

    private function notifyFollowers(User $author, Post $post): void
    {
        User::where('id', '!=', $author->id)
            ->where('status', 'active')
            ->chunk(100, function ($users) use ($author, $post) {
                $notifications = $users->map(fn ($user) => [
                    'user_id' => $user->id,
                    'type' => 'new_post',
                    'message' => "{$author->name} published a new post",
                    'link' => "/posts",
                    'data' => json_encode(['post_id' => $post->id]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ])->toArray();

                Notification::insert($notifications);
            });
    }
}
