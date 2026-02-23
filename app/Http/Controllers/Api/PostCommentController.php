<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Models\CommentLike;
use App\Models\Notification;
use App\Models\Post;
use App\Models\PostComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostCommentController extends Controller
{
    public function store(StoreCommentRequest $request, Post $post): JsonResponse
    {
        $comment = PostComment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'body' => $request->body,
        ]);

        if ($post->user_id && $post->user_id !== $request->user()->id) {
            Notification::create([
                'user_id' => $post->user_id,
                'type' => 'post_commented',
                'message' => "{$request->user()->name} commented on your post",
                'link' => "/posts",
                'data' => ['post_id' => $post->id, 'comment_id' => $comment->id],
            ]);
        }

        $comment->load('user.member');
        $comment->is_liked = false;
        $comment->likes_count = 0;

        return response()->json(['comment' => $comment], 201);
    }

    public function destroy(Post $post, PostComment $comment, Request $request): JsonResponse
    {
        if ($comment->user_id !== $request->user()->id && !$request->user()->hasAnyRole(['Admin', 'Super Admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Comment deleted']);
    }

    public function toggleLike(Request $request, Post $post, PostComment $comment): JsonResponse
    {
        $existing = CommentLike::where('post_comment_id', $comment->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json([
                'liked' => false,
                'likes_count' => $comment->likes()->count(),
            ]);
        }

        CommentLike::create([
            'post_comment_id' => $comment->id,
            'user_id' => $request->user()->id,
        ]);

        if ($comment->user_id && $comment->user_id !== $request->user()->id) {
            Notification::create([
                'user_id' => $comment->user_id,
                'type' => 'comment_liked',
                'message' => "{$request->user()->name} liked your comment",
                'link' => '/posts',
                'data' => ['post_id' => $post->id, 'comment_id' => $comment->id],
            ]);
        }

        return response()->json([
            'liked' => true,
            'likes_count' => $comment->likes()->count(),
        ]);
    }
}
