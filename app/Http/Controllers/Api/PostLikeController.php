<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Post;
use App\Models\PostLike;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostLikeController extends Controller
{
    public function toggle(Request $request, Post $post): JsonResponse
    {
        $existing = PostLike::where('post_id', $post->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json([
                'liked' => false,
                'likes_count' => $post->likes()->count(),
            ]);
        }

        PostLike::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
        ]);

        if ($post->user_id && $post->user_id !== $request->user()->id) {
            Notification::create([
                'user_id' => $post->user_id,
                'type' => 'post_liked',
                'message' => "{$request->user()->name} liked your post",
                'link' => "/posts",
                'data' => ['post_id' => $post->id],
            ]);
        }

        return response()->json([
            'liked' => true,
            'likes_count' => $post->likes()->count(),
        ]);
    }
}
